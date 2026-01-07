import { NextRequest, NextResponse } from 'next/server';
import { getTestEmailById, deleteTestEmail } from '@/lib/email-store';
import { getDb } from '@/lib/db';
import { simpleParser } from 'mailparser';

// 从 HTML 中提取纯文本
function htmlToText(html: string): string {
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<\/?(div|p|br|hr|tr|li|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code)));
  text = text.replace(/\n\s*\n/g, '\n\n');
  return text.trim();
}

// GET /api/emails/[id] - 获取单个邮件
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = getTestEmailById(params.id);
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: email,
    });
  } catch (error) {
    console.error('Failed to get email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get email' },
      { status: 500 }
    );
  }
}

// DELETE /api/emails/[id] - 删除邮件
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = deleteTestEmail(params.id);
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      message: 'Email deleted',
    });
  } catch (error) {
    console.error('Failed to delete email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete email' },
      { status: 500 }
    );
  }
}

// PATCH /api/emails/[id] - 重新解析邮件正文
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const email = getTestEmailById(params.id);
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email not found' },
        { status: 404 }
      );
    }

    // 从 rawEml 重新解析
    const parsed = await simpleParser(Buffer.from(email.rawEml, 'utf-8'));
    
    let body = parsed.text || '';
    if (!body && parsed.html) {
      body = htmlToText(parsed.html);
    }

    // 更新数据库
    const db = getDb();
    db.prepare(`
      UPDATE test_emails SET body = ?, body_html = ? WHERE id = ?
    `).run(body, parsed.html || null, params.id);

    return NextResponse.json({
      success: true,
      data: {
        ...email,
        body,
        bodyHtml: parsed.html || undefined,
      },
    });
  } catch (error) {
    console.error('Failed to reparse email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reparse email' },
      { status: 500 }
    );
  }
}
