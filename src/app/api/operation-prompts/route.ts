import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { OperationPrompt, OperationType } from '@/types';

// 所有支持的 operation types
const ALL_OPERATIONS: OperationType[] = [
  'new_email',
  'reply_email',
  'forward_email',
  'summarize',
  'extract_action_items',
  'todo',
];

// 获取所有 operation prompts
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT operation_type, prompt, updated_at FROM operation_prompts
    `).all() as any[];

    // 构建完整的 prompts 列表（包括未配置的）
    const prompts: OperationPrompt[] = ALL_OPERATIONS.map(op => {
      const existing = rows.find(r => r.operation_type === op);
      return {
        operationType: op,
        prompt: existing?.prompt || '',
        updatedAt: existing?.updated_at || new Date().toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error('Failed to get operation prompts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get operation prompts' },
      { status: 500 }
    );
  }
}

// 保存 operation prompt
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operationType, prompt } = body as {
      operationType: OperationType;
      prompt: string;
    };

    if (!operationType || !ALL_OPERATIONS.includes(operationType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid operation type' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();

    // Upsert: 如果存在则更新，不存在则插入
    db.prepare(`
      INSERT INTO operation_prompts (operation_type, prompt, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(operation_type) DO UPDATE SET
        prompt = excluded.prompt,
        updated_at = excluded.updated_at
    `).run(operationType, prompt, now);

    return NextResponse.json({
      success: true,
      data: {
        operationType,
        prompt,
        updatedAt: now,
      },
    });
  } catch (error) {
    console.error('Failed to save operation prompt:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save operation prompt' },
      { status: 500 }
    );
  }
}
