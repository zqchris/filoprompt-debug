import { NextRequest, NextResponse } from 'next/server';
import { getDb, generateId } from '@/lib/db';
import { PromptTemplate } from '@/types';

// GET /api/templates - 获取所有模板
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT * FROM prompt_templates ORDER BY updated_at DESC
    `).all() as any[];

    const templates: PromptTemplate[] = rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      template: row.template,
      variables: row.variables ? JSON.parse(row.variables) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - 创建新模板
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, template, variables } = body;

    if (!name || !template) {
      return NextResponse.json(
        { success: false, error: 'Name and template are required' },
        { status: 400 }
      );
    }

    const db = getDb();
    const id = generateId();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO prompt_templates (id, name, description, template, variables, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      description || null,
      template,
      variables ? JSON.stringify(variables) : null,
      now,
      now
    );

    const newTemplate: PromptTemplate = {
      id,
      name,
      description,
      template,
      variables: variables || [],
      createdAt: now,
      updatedAt: now,
    };

    return NextResponse.json({
      success: true,
      data: newTemplate,
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create template' },
      { status: 500 }
    );
  }
}
