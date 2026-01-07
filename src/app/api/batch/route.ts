import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { buildPrompt } from '@/lib/prompt-builder';
import { 
  getTestEmailById, 
  saveBatchTest,
  getAllBatchTests 
} from '@/lib/email-store';
import { generateId } from '@/lib/db';
import { 
  PromptTestConfig, 
  AIProvider, 
  TestResult, 
  BatchTestResult,
  TestEmail 
} from '@/types';

// GET /api/batch - 获取所有批量测试
export async function GET() {
  try {
    const batches = getAllBatchTests();
    return NextResponse.json({
      success: true,
      data: batches,
    });
  } catch (error) {
    console.error('Failed to get batch tests:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get batch tests' },
      { status: 500 }
    );
  }
}

// POST /api/batch - 运行批量测试
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      emailIds,
      config,
      provider,
      model,
    } = body as {
      name: string;
      emailIds: string[];
      config: PromptTestConfig;
      provider?: AIProvider;
      model?: string;
    };

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    const results: TestResult[] = [];
    let totalLatency = 0;
    let failed = 0;

    // 逐个处理邮件
    for (const emailId of emailIds) {
      const email = getTestEmailById(emailId);
      if (!email) {
        failed++;
        continue;
      }

      try {
        // 使用邮件内容作为上下文
        const testConfig: PromptTestConfig = {
          ...config,
          userInput: config.userInput || email.body.slice(0, 500),
        };

        const generatedPrompt = buildPrompt(testConfig, email);

        const aiResponse = await callAI({
          provider: aiProvider,
          model: aiModel,
          prompt: generatedPrompt,
        });

        totalLatency += aiResponse.latencyMs;

        results.push({
          id: generateId(),
          testEmailId: emailId,
          config: testConfig,
          generatedPrompt,
          aiResponse,
          createdAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error(`Failed to process email ${emailId}:`, error);
        failed++;
      }
    }

    // 创建批量测试结果
    const batchResult: BatchTestResult = {
      id: generateId(),
      config: {
        name,
        emailIds,
        promptConfig: config,
        aiConfig: {
          provider: aiProvider,
          model: aiModel,
        },
      },
      results,
      summary: {
        total: emailIds.length,
        completed: results.length,
        failed,
        avgLatencyMs: results.length > 0 ? totalLatency / results.length : 0,
      },
      createdAt: new Date().toISOString(),
    };

    // 保存批量测试结果
    saveBatchTest(batchResult);

    return NextResponse.json({
      success: true,
      data: batchResult,
    });
  } catch (error) {
    console.error('Failed to run batch test:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to run batch test' 
      },
      { status: 500 }
    );
  }
}
