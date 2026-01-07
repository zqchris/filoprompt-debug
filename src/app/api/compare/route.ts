import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { AIProvider, ComparisonScore } from '@/types';

// 构建评分对比 prompt
function buildComparisonPrompt(
  originalEmail: string,
  goldenOutput: string,
  newOutput: string,
  operationType: string
): string {
  return `You are an expert email quality evaluator. Compare two AI-generated outputs for the same email task and score the new output.

## Task Type
${operationType}

## Original Email Context
${originalEmail}

## Reference Output (User's Approved Result)
${goldenOutput}

## New Output (To Be Evaluated)
${newOutput}

## Evaluation Criteria
1. **Accuracy**: Does it correctly address the email content and intent?
2. **Tone & Style**: Is the tone appropriate and consistent?
3. **Completeness**: Does it include all necessary information?
4. **Clarity**: Is it clear, well-structured, and easy to understand?
5. **Professionalism**: Does it maintain professional standards?

## Your Task
Compare the New Output against the Reference Output and provide:
1. A score from 1-100 where:
   - 50 = Equal quality to reference
   - 51-100 = New output is better (higher = much better)
   - 1-49 = New output is worse (lower = much worse)
2. Specific improvements in the new output
3. Specific regressions in the new output
4. Your recommendation

## Response Format
You MUST respond in this exact JSON format:
\`\`\`json
{
  "score": 65,
  "reasoning": "Brief explanation of the overall comparison...",
  "improvements": ["Improvement 1", "Improvement 2"],
  "regressions": ["Regression 1"],
  "recommendation": "keep_new"
}
\`\`\`

Where recommendation is one of:
- "keep_new": New output is significantly better, recommend updating the golden result
- "keep_old": Reference is better, keep the current golden result
- "review": Similar quality, needs human review`;
}

// POST /api/compare - 对比两个输出并评分
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originalEmail,
      goldenOutput,
      newOutput,
      operationType,
      provider,
      model,
    } = body as {
      originalEmail: string;
      goldenOutput: string;
      newOutput: string;
      operationType: string;
      provider?: AIProvider;
      model?: string;
    };

    if (!originalEmail || !goldenOutput || !newOutput) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // 构建对比 prompt
    const comparisonPrompt = buildComparisonPrompt(
      originalEmail,
      goldenOutput,
      newOutput,
      operationType
    );

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 调用 AI 进行评分
    const aiResponse = await callAI({
      provider: aiProvider,
      model: aiModel,
      prompt: comparisonPrompt,
    });

    // 解析 JSON 响应
    let comparison: ComparisonScore;
    try {
      const jsonMatch = aiResponse.output.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiResponse.output;
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
    } catch (parseError) {
      console.error('Failed to parse comparison response:', parseError);
      comparison = {
        score: 50,
        reasoning: 'Failed to parse AI response',
        improvements: [],
        regressions: [],
        recommendation: 'review',
      };
    }

    return NextResponse.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error('Failed to compare outputs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to compare outputs' 
      },
      { status: 500 }
    );
  }
}
