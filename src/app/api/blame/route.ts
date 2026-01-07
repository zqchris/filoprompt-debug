import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { buildBlamePrompt } from '@/lib/prompt-builder';
import { updateTestResultCritique } from '@/lib/email-store';
import { AIProvider, BlameAnalysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      testResultId,
      originalPrompt,
      aiOutput,
      humanCritique,
      provider,
      model,
    } = body as {
      testResultId?: string;
      originalPrompt: string;
      aiOutput: string;
      humanCritique: string;
      provider?: AIProvider;
      model?: string;
    };

    // 构建 Blame 分析 prompt
    const blamePrompt = buildBlamePrompt(originalPrompt, aiOutput, humanCritique);

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 调用 AI 进行分析
    const response = await callAI({
      provider: aiProvider,
      model: aiModel,
      prompt: blamePrompt,
    });

    // 解析 JSON 响应
    let blameAnalysis: BlameAnalysis;
    try {
      // 提取 JSON 代码块
      const jsonMatch = response.output.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : response.output;
      blameAnalysis = JSON.parse(jsonStr);
    } catch {
      blameAnalysis = {
        reasoning: response.output,
        problematicSections: [],
      };
    }

    // 可选：更新测试结果
    if (testResultId) {
      updateTestResultCritique(testResultId, humanCritique, blameAnalysis);
    }

    return NextResponse.json({
      success: true,
      data: {
        blameAnalysis,
        rawResponse: response.output,
      },
    });
  } catch (error) {
    console.error('Failed to analyze:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to analyze' 
      },
      { status: 500 }
    );
  }
}
