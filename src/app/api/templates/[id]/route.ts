import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { PromptTemplate } from '@/types';

// GET /api/templates/[id] - 获取单个模板
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const row = db.prepare(`
      SELECT * FROM prompt_templates WHERE id = ?
    `).get(params.id) as any;

    if (!row) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    const template: PromptTemplate = {
      id: row.id,
      name: row.name,
      description: row.description,
      template: row.template,
      variables: row.variables ? JSON.parse(row.variables) : [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    return NextResponse.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get template' },
      { status: 500 }
    );
  }
}

// PUT /api/templates/[id] - 更新模板
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, template, variables } = body;

    const db = getDb();
    const now = new Date().toISOString();

    const result = db.prepare(`
      UPDATE prompt_templates 
      SET name = ?, description = ?, template = ?, variables = ?, updated_at = ?
      WHERE id = ?
    `).run(
      name,
      description || null,
      template,
      variables ? JSON.stringify(variables) : null,
      now,
      params.id
    );

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template updated',
    });
  } catch (error) {
    console.error('Failed to update template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates/[id] - 删除模板
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = getDb();
    const result = db.prepare(`
      DELETE FROM prompt_templates WHERE id = ?
    `).run(params.id);

    if (result.changes === 0) {
      return NextResponse.json(
        { success: false, error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Template deleted',
    });
  } catch (error) {
    console.error('Failed to delete template:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}
