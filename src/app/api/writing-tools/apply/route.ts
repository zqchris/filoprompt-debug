import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { getDb } from '@/lib/db';
import { WritingToolType, AIProvider } from '@/types';

// 默认 prompts（与 route.ts 保持一致）
const DEFAULT_PROMPTS: Record<string, string> = {
  expand: `请将以下内容扩展得更详细，添加更多细节和解释，但保持原意不变：

{{content}}

要求：
- 保持原有的语气和风格
- 增加相关的细节和背景信息
- 不要改变核心意思`,
  shorten: `请将以下内容精简，只保留核心信息：

{{content}}

要求：
- 删除冗余和重复的内容
- 保留关键信息和要点
- 保持专业的语气`,
  spell_check: `请检查并修正以下内容中的拼写和语法错误：

{{content}}

要求：
- 修正所有拼写错误
- 修正语法错误
- 改进标点符号使用
- 保持原意不变
- 如果没有错误，返回原文`,
  formal: `请将以下内容改写为更正式的商务风格：

{{content}}

要求：
- 使用正式的商务用语
- 避免口语化表达
- 保持专业和礼貌的语气
- 保留原有的核心信息`,
  casual: `请将以下内容改写为更轻松友好的风格：

{{content}}

要求：
- 使用自然的口语表达
- 保持友好和亲切的语气
- 可以使用缩写和日常用语
- 保留核心信息`,
  translate_zh: `请将以下内容翻译成中文：

{{content}}

要求：
- 准确传达原意
- 使用自然流畅的中文表达
- 保持原有的语气和风格`,
  translate_en: `Please translate the following content into English:

{{content}}

Requirements:
- Accurate translation of the original meaning
- Use natural and fluent English
- Maintain the original tone and style`,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId, content, provider, model } = body as {
      toolId: WritingToolType;
      content: string;
      provider?: AIProvider;
      model?: string;
    };

    if (!toolId || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing toolId or content' },
        { status: 400 }
      );
    }

    // 获取工具的 prompt（优先使用用户配置的）
    const db = getDb();
    const row = db.prepare(`
      SELECT prompt FROM writing_tools WHERE tool_id = ?
    `).get(toolId) as any;

    const promptTemplate = row?.prompt || DEFAULT_PROMPTS[toolId] || '';
    
    if (!promptTemplate) {
      return NextResponse.json(
        { success: false, error: `Unknown tool: ${toolId}` },
        { status: 400 }
      );
    }

    // 替换 {{content}} 占位符
    const finalPrompt = promptTemplate.replace(/\{\{content\}\}/g, content);

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 调用 AI
    const aiResponse = await callAI({
      provider: aiProvider,
      model: aiModel,
      prompt: finalPrompt,
    });

    return NextResponse.json({
      success: true,
      data: {
        toolId,
        output: aiResponse.output,
        usage: aiResponse.usage,
        latencyMs: aiResponse.latencyMs,
      },
    });
  } catch (error) {
    console.error('Failed to apply writing tool:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to apply writing tool' 
      },
      { status: 500 }
    );
  }
}
