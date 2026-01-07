import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { getTestEmailById, saveBatchTest, getAllBatchTests } from '@/lib/email-store';
import { getDb, generateId } from '@/lib/db';
import { buildFinalPrompt } from '@/lib/dynamic-variables';
import { 
  PromptTestConfig, 
  AIProvider, 
  BatchTestResult,
  BatchTestItemResult,
  ComparisonScore,
  OperationType,
} from '@/types';

// 获取 operation prompt
function getOperationPrompt(operationType: string): string {
  const db = getDb();
  const row = db.prepare(`
    SELECT prompt FROM operation_prompts WHERE operation_type = ?
  `).get(operationType) as any;
  return row?.prompt || '';
}

// 获取 golden result
function getGoldenResult(emailId: string, operationType: string): { output: string } | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT output FROM golden_results WHERE email_id = ? AND operation_type = ?
  `).get(emailId, operationType) as any;
  return row ? { output: row.output } : null;
}

// 构建评分对比 prompt
function buildComparisonPrompt(
  originalEmail: string,
  goldenOutput: string,
  newOutput: string,
  operationType: string
): string {
  return `You are an expert email quality evaluator. Compare two AI-generated outputs for the same email task.

## Task Type: ${operationType}

## Original Email
${originalEmail}

## Reference Output (User's Approved Result)
${goldenOutput}

## New Output (To Be Evaluated)
${newOutput}

## Scoring
Score from 1-100:
- 50 = Equal quality
- 51-100 = New is better (higher = much better)
- 1-49 = New is worse (lower = much worse)

## Response (JSON only, no explanation outside)
\`\`\`json
{
  "score": <number>,
  "reasoning": "<brief explanation>",
  "improvements": ["<improvement1>", ...],
  "regressions": ["<regression1>", ...],
  "recommendation": "<keep_new|keep_old|review>"
}
\`\`\``;
}

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

// POST /api/batch - 运行批量测试（带评分对比）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      emailIds,
      config,
      provider,
      model,
      enableComparison = true,  // 是否启用与 golden result 的对比
    } = body as {
      name: string;
      emailIds: string[];
      config: PromptTestConfig;
      provider?: AIProvider;
      model?: string;
      enableComparison?: boolean;
    };

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 获取 operation prompt
    const operationPrompt = getOperationPrompt(config.operationType);
    if (!operationPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: `请先为 "${config.operationType}" 操作配置 Prompt` },
        { status: 400 }
      );
    }

    const results: BatchTestItemResult[] = [];
    let totalLatency = 0;
    let failed = 0;
    let comparedCount = 0;
    let improvedCount = 0;
    let regressedCount = 0;

    // 逐个处理邮件
    for (const emailId of emailIds) {
      const email = getTestEmailById(emailId);
      if (!email) {
        results.push({
          emailId,
          emailSubject: 'Unknown',
          success: false,
          error: 'Email not found',
          hasGoldenResult: false,
        });
        failed++;
        continue;
      }

      try {
        // 构建完整的 prompt
        const finalPrompt = buildFinalPrompt(operationPrompt, {
          email,
          senderName: config.senderContext.name,
          senderEmail: config.senderContext.email,
          userInput: config.userInput,
          style: config.styleStrategy,
          customInstruction: config.customInstruction,
          operationType: config.operationType,
          hasExternalSignature: config.senderContext.hasExternalSignature,
        });

        // 调用 AI 生成结果
        const aiResponse = await callAI({
          provider: aiProvider,
          model: aiModel,
          prompt: finalPrompt,
        });

        totalLatency += aiResponse.latencyMs;

        // 查找 golden result
        const goldenResult = getGoldenResult(emailId, config.operationType);
        
        let comparison: ComparisonScore | undefined;
        
        // 如果启用对比且有 golden result
        if (enableComparison && goldenResult) {
          comparedCount++;
          
          try {
            // 构建邮件上下文字符串
            const emailContext = `From: ${email.from}\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`;
            
            // 调用 AI 进行评分对比
            const comparisonPrompt = buildComparisonPrompt(
              emailContext,
              goldenResult.output,
              aiResponse.output,
              config.operationType
            );

            const comparisonResponse = await callAI({
              provider: aiProvider,
              model: aiModel,
              prompt: comparisonPrompt,
            });

            // 解析评分结果
            const jsonMatch = comparisonResponse.output.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : comparisonResponse.output;
            const parsed = JSON.parse(jsonStr);

            comparison = {
              score: Math.min(100, Math.max(1, parsed.score || 50)),
              reasoning: parsed.reasoning || '',
              improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
              regressions: Array.isArray(parsed.regressions) ? parsed.regressions : [],
              recommendation: ['keep_new', 'keep_old', 'review'].includes(parsed.recommendation) 
                ? parsed.recommendation 
                : 'review',
            };

            // 统计改进/退步
            if (comparison.score > 55) improvedCount++;
            else if (comparison.score < 45) regressedCount++;
          } catch (compError) {
            console.error(`Failed to compare for email ${emailId}:`, compError);
            comparison = {
              score: 50,
              reasoning: 'Failed to parse comparison',
              improvements: [],
              regressions: [],
              recommendation: 'review',
            };
          }
        }

        results.push({
          emailId,
          emailSubject: email.subject,
          success: true,
          output: aiResponse.output,
          latencyMs: aiResponse.latencyMs,
          hasGoldenResult: !!goldenResult,
          goldenOutput: goldenResult?.output,
          comparison,
        });
      } catch (error) {
        console.error(`Failed to process email ${emailId}:`, error);
        results.push({
          emailId,
          emailSubject: email.subject,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          hasGoldenResult: false,
        });
        failed++;
      }
    }

    // 计算平均分数
    const scores = results
      .filter(r => r.comparison?.score)
      .map(r => r.comparison!.score);
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : null;

    const batchResult = {
      id: generateId(),
      name,
      operationType: config.operationType,
      prompt: operationPrompt,
      results,
      summary: {
        total: emailIds.length,
        completed: results.filter(r => r.success).length,
        failed,
        avgLatencyMs: results.length > 0 ? totalLatency / results.length : 0,
        // 评分统计
        comparedCount,
        improvedCount,
        regressedCount,
        avgScore,
      },
      createdAt: new Date().toISOString(),
    };

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
