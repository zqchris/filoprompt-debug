import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { saveTestResult, getTestEmailById } from '@/lib/email-store';
import { getDb, generateId } from '@/lib/db';
import { replaceDynamicVariables } from '@/lib/dynamic-variables';
import { PromptTestConfig, AIProvider, TestEmail } from '@/types';

// 获取 operation 的 prompt
function getOperationPrompt(operationType: string): string {
  const db = getDb();
  const row = db.prepare(`
    SELECT prompt FROM operation_prompts WHERE operation_type = ?
  `).get(operationType) as any;
  return row?.prompt || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      config,
      threadEmailId,
      provider,
      model,
      saveResult = false,
      customPrompt,  // 直接传入的 prompt（已经替换了变量的）
    } = body as {
      config: PromptTestConfig;
      threadEmailId?: string;
      provider?: AIProvider;
      model?: string;
      saveResult?: boolean;
      customPrompt?: string;
    };

    // 获取选中的测试邮件（如果有）
    let threadEmail: TestEmail | null = null;
    if (threadEmailId) {
      threadEmail = getTestEmailById(threadEmailId);
    }

    // 获取 prompt：优先使用传入的 customPrompt，否则从数据库获取并替换变量
    let generatedPrompt = customPrompt;
    
    if (!generatedPrompt) {
      const savedPrompt = getOperationPrompt(config.operationType);
      if (savedPrompt) {
        generatedPrompt = replaceDynamicVariables(savedPrompt, {
          email: threadEmail,
          senderName: config.senderContext.name,
          senderEmail: config.senderContext.email,
          userInput: config.userInput,
          style: config.styleStrategy,
        });
      } else {
        return NextResponse.json(
          { success: false, error: `请先为 "${config.operationType}" 操作配置 Prompt` },
          { status: 400 }
        );
      }
    }
    
    if (!generatedPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Prompt 不能为空' },
        { status: 400 }
      );
    }

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 调用 AI
    const aiResponse = await callAI({
      provider: aiProvider,
      model: aiModel,
      prompt: generatedPrompt,
    });

    // 可选：保存结果
    if (saveResult && threadEmailId) {
      const testResult = {
        id: generateId(),
        testEmailId: threadEmailId,
        config,
        generatedPrompt,
        aiResponse,
        createdAt: new Date().toISOString(),
      };
      saveTestResult(testResult);
    }

    return NextResponse.json({
      success: true,
      data: {
        generatedPrompt,
        aiResponse,
      },
    });
  } catch (error) {
    console.error('Failed to generate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate' 
      },
      { status: 500 }
    );
  }
}
