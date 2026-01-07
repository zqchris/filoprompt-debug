import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { GoldenResult, OperationType } from '@/types';

// GET /api/golden-results - 获取所有满意结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const emailId = searchParams.get('emailId');
    const operationType = searchParams.get('operationType');

    const db = getDb();
    let query = 'SELECT * FROM golden_results';
    const params: any[] = [];

    if (emailId && operationType) {
      query += ' WHERE email_id = ? AND operation_type = ?';
      params.push(emailId, operationType);
    } else if (emailId) {
      query += ' WHERE email_id = ?';
      params.push(emailId);
    } else if (operationType) {
      query += ' WHERE operation_type = ?';
      params.push(operationType);
    }

    query += ' ORDER BY updated_at DESC';

    const rows = db.prepare(query).all(...params) as any[];

    const results: GoldenResult[] = rows.map(row => ({
      id: row.id,
      emailId: row.email_id,
      operationType: row.operation_type as OperationType,
      prompt: row.prompt,
      output: row.output,
      notes: row.notes || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error('Failed to get golden results:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get golden results' },
      { status: 500 }
    );
  }
}

// POST /api/golden-results - 保存满意结果
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emailId, operationType, prompt, output, notes } = body as {
      emailId: string;
      operationType: OperationType;
      prompt: string;
      output: string;
      notes?: string;
    };

    if (!emailId || !operationType || !prompt || !output) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDb();
    const now = new Date().toISOString();
    const id = generateId();

    // Upsert: 如果已存在则更新
    db.prepare(`
      INSERT INTO golden_results (id, email_id, operation_type, prompt, output, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(email_id, operation_type) DO UPDATE SET
        prompt = excluded.prompt,
        output = excluded.output,
        notes = excluded.notes,
        updated_at = excluded.updated_at
    `).run(id, emailId, operationType, prompt, output, notes || null, now, now);

    // 获取保存的结果
    const row = db.prepare(`
      SELECT * FROM golden_results WHERE email_id = ? AND operation_type = ?
    `).get(emailId, operationType) as any;

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        emailId: row.email_id,
        operationType: row.operation_type,
        prompt: row.prompt,
        output: row.output,
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  } catch (error) {
    console.error('Failed to save golden result:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save golden result' },
      { status: 500 }
    );
  }
}
