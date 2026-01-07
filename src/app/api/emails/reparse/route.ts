import { NextResponse } from 'next/server';
import { getAllTestEmails } from '@/lib/email-store';
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

// POST /api/emails/reparse - 重新解析所有邮件正文
export async function POST() {
  try {
    const emails = getAllTestEmails();
    const db = getDb();
    
    let updated = 0;
    let failed = 0;

    for (const email of emails) {
      // 只处理 body 为空的邮件
      if (email.body && email.body.trim()) {
        continue;
      }

      try {
        const parsed = await simpleParser(Buffer.from(email.rawEml, 'utf-8'));
        
        let body = parsed.text || '';
        if (!body && parsed.html) {
          body = htmlToText(parsed.html);
        }

        if (body) {
          db.prepare(`
            UPDATE test_emails SET body = ?, body_html = ? WHERE id = ?
          `).run(body, parsed.html || null, email.id);
          updated++;
        }
      } catch (e) {
        console.error(`Failed to reparse email ${email.id}:`, e);
        failed++;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        total: emails.length,
        updated,
        failed,
        skipped: emails.length - updated - failed,
      },
    });
  } catch (error) {
    console.error('Failed to reparse emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reparse emails' },
      { status: 500 }
    );
  }
}
