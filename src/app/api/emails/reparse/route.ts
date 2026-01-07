import { NextRequest, NextResponse } from 'next/server';
import { getAllTestEmails, updateTestEmailBody } from '@/lib/email-store';
import { simpleParser } from 'mailparser';
import * as cheerio from 'cheerio';

// 从 HTML 中提取纯文本（使用 cheerio）
function htmlToText(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // 移除不需要的元素
    $('style, script, head, meta, link, noscript').remove();
    
    // 移除 HTML 注释
    $('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();
    
    // 移除隐藏元素
    $('[style*="display:none"], [style*="display: none"], [style*="visibility:hidden"]').remove();
    
    // 在块级元素前后添加换行
    $('div, p, br, hr, tr, li, h1, h2, h3, h4, h5, h6, td, th, table').each(function() {
      $(this).before('\n').after('\n');
    });
    
    // 获取文本
    let text = $('body').text() || $.text();
    
    // 解码 HTML 实体（cheerio 应该已经处理了大部分）
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&zwnj;/gi, ''); // 零宽非连接符
    text = text.replace(/&zwj;/gi, ''); // 零宽连接符
    
    // 清理多余的空白
    text = text.replace(/[ \t]+/g, ' '); // 合并空格
    text = text.replace(/\n[ \t]+/g, '\n'); // 移除行首空白
    text = text.replace(/[ \t]+\n/g, '\n'); // 移除行尾空白
    text = text.replace(/\n{3,}/g, '\n\n'); // 最多两个连续换行
    text = text.trim();
    
    return text;
  } catch (error) {
    console.error('cheerio htmlToText failed:', error);
    // 降级到简单正则处理
    return simpleHtmlToText(html);
  }
}

// 备用的简单 HTML 到文本转换
function simpleHtmlToText(html: string): string {
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<\/?(div|p|br|hr|tr|li|h[1-6])[^>]*>/gi, '\n');
  text = text.replace(/<[^>]+>/g, '');
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code)));
  text = text.replace(/[ \t]+/g, ' ');
  text = text.replace(/\n\s*\n/g, '\n\n');
  return text.trim();
}

// POST /api/emails/reparse - 重新解析所有邮件的正文
export async function POST(request: NextRequest) {
  try {
    // 检查是否强制重新解析所有邮件
    let forceAll = false;
    try {
      const body = await request.json();
      forceAll = body.forceAll === true;
    } catch {
      // 没有 body 或解析失败，使用默认值
    }

    const emails = getAllTestEmails();
    let updated = 0;
    let failed = 0;
    const details: Array<{ id: string; subject: string; status: string; bodyLength?: number; currentBodyLength?: number }> = [];

    for (const email of emails) {
      try {
        const currentBodyLength = email.body ? email.body.trim().length : 0;
        
        // 如果不是强制模式，且正文已经有实质内容（超过50个字符），跳过
        if (!forceAll && currentBodyLength > 50) {
          details.push({
            id: email.id,
            subject: email.subject,
            status: 'skipped - has body',
            bodyLength: currentBodyLength,
          });
          continue;
        }

        // 优先使用已存储的 bodyHtml，否则重新解析 rawEml
        let htmlSource = email.bodyHtml;
        let newBodyHtml = email.bodyHtml;
        
        if (!htmlSource && email.rawEml) {
          // 重新解析原始 EML
          const parsed = await simpleParser(Buffer.from(email.rawEml, 'utf-8'));
          htmlSource = parsed.html || undefined;
          newBodyHtml = parsed.html || undefined;
        }
        
        let newBody = '';
        
        // 从 HTML 提取文本
        if (htmlSource) {
          newBody = htmlToText(htmlSource);
        }

        if (newBody && newBody.trim().length > 0) {
          updateTestEmailBody(email.id, newBody, newBodyHtml);
          updated++;
          details.push({
            id: email.id,
            subject: email.subject,
            status: 'updated',
            bodyLength: newBody.length,
            currentBodyLength,
          });
        } else {
          details.push({
            id: email.id,
            subject: email.subject,
            status: 'no body found in HTML',
            currentBodyLength,
          });
        }
      } catch (error) {
        console.error(`Failed to reparse email ${email.id}:`, error);
        failed++;
        details.push({
          id: email.id,
          subject: email.subject,
          status: 'error: ' + (error instanceof Error ? error.message : 'unknown'),
        });
      }
    }
    
    console.log('Reparse results:', { total: emails.length, updated, failed, details });

    return NextResponse.json({
      success: true,
      data: {
        total: emails.length,
        updated,
        failed,
        details,
      },
    });
  } catch (error) {
    console.error('Failed to reparse emails:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to reparse' },
      { status: 500 }
    );
  }
}
