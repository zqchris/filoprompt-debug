import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { WritingToolType, WritingTool } from '@/types';

// 默认的写作工具配置
const DEFAULT_TOOLS: WritingTool[] = [
  {
    id: 'expand',
    name: '加长',
    icon: '📝',
    description: '扩展内容，增加更多细节',
    prompt: `请将以下内容扩展得更详细，添加更多细节和解释，但保持原意不变：

{{content}}

要求：
- 保持原有的语气和风格
- 增加相关的细节和背景信息
- 不要改变核心意思`,
  },
  {
    id: 'shorten',
    name: '精简',
    icon: '✂️',
    description: '缩短内容，保留核心信息',
    prompt: `请将以下内容精简，只保留核心信息：

{{content}}

要求：
- 删除冗余和重复的内容
- 保留关键信息和要点
- 保持专业的语气`,
  },
  {
    id: 'spell_check',
    name: '拼写检查',
    icon: '🔍',
    description: '检查并修正拼写和语法错误',
    prompt: `请检查并修正以下内容中的拼写和语法错误：

{{content}}

要求：
- 修正所有拼写错误
- 修正语法错误
- 改进标点符号使用
- 保持原意不变
- 如果没有错误，返回原文`,
  },
  {
    id: 'formal',
    name: '正式化',
    icon: '👔',
    description: '转换为更正式的商务风格',
    prompt: `请将以下内容改写为更正式的商务风格：

{{content}}

要求：
- 使用正式的商务用语
- 避免口语化表达
- 保持专业和礼貌的语气
- 保留原有的核心信息`,
  },
  {
    id: 'casual',
    name: '口语化',
    icon: '💬',
    description: '转换为更轻松友好的风格',
    prompt: `请将以下内容改写为更轻松友好的风格：

{{content}}

要求：
- 使用自然的口语表达
- 保持友好和亲切的语气
- 可以使用缩写和日常用语
- 保留核心信息`,
  },
  {
    id: 'translate_zh',
    name: '译成中文',
    icon: '🇨🇳',
    description: '翻译成中文',
    prompt: `请将以下内容翻译成中文：

{{content}}

要求：
- 准确传达原意
- 使用自然流畅的中文表达
- 保持原有的语气和风格`,
  },
  {
    id: 'translate_en',
    name: '译成英文',
    icon: '🇺🇸',
    description: '翻译成英文',
    prompt: `Please translate the following content into English:

{{content}}

Requirements:
- Accurate translation of the original meaning
- Use natural and fluent English
- Maintain the original tone and style`,
  },
];

// 获取所有写作工具配置
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT tool_id, prompt, updated_at FROM writing_tools
    `).all() as any[];

    // 合并默认配置和用户自定义的 prompt
    const tools = DEFAULT_TOOLS.map(tool => {
      const customRow = rows.find(r => r.tool_id === tool.id);
      return {
        ...tool,
        prompt: customRow?.prompt || tool.prompt,
        updatedAt: customRow?.updated_at || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: tools,
    });
  } catch (error) {
    console.error('Failed to get writing tools:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get writing tools' },
      { status: 500 }
    );
  }
}

// 保存写作工具 prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toolId, prompt } = body as {
      toolId: WritingToolType;
      prompt: string;
    };

    if (!toolId) {
      return NextResponse.json(
        { success: false, error: 'Invalid tool id' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Upsert
    db.prepare(`
      INSERT INTO writing_tools (tool_id, prompt, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(tool_id) DO UPDATE SET
        prompt = excluded.prompt,
        updated_at = excluded.updated_at
    `).run(toolId, prompt, now);

    return NextResponse.json({
      success: true,
      data: {
        toolId,
        prompt,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Failed to save writing tool:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save writing tool' },
      { status: 500 }
    );
  }
}
