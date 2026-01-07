import { simpleParser, ParsedMail } from 'mailparser';
import { TestEmail } from '@/types';
import { generateId } from './db';
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
    
    // 解码 HTML 实体
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/&zwnj;/gi, '');
    text = text.replace(/&zwj;/gi, '');
    
    // 清理多余的空白
    text = text.replace(/[ \t]+/g, ' ');
    text = text.replace(/\n[ \t]+/g, '\n');
    text = text.replace(/[ \t]+\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    text = text.trim();
    
    return text;
  } catch (error) {
    console.error('cheerio htmlToText failed:', error);
    // 降级到简单正则处理
    let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<\/?(div|p|br|hr|tr|li|h[1-6])[^>]*>/gi, '\n');
    text = text.replace(/<[^>]+>/g, '');
    text = text.replace(/&nbsp;/gi, ' ');
    text = text.replace(/\n\s*\n/g, '\n\n');
    return text.trim();
  }
}

export async function parseEmlFile(
  buffer: Buffer,
  fileName: string
): Promise<TestEmail> {
  const parsed: ParsedMail = await simpleParser(buffer);

  const getAddress = (addr: ParsedMail['from']): string => {
    if (!addr) return '';
    if (Array.isArray(addr.value)) {
      return addr.value
        .map((a) => (a.name ? `"${a.name}" <${a.address}>` : a.address))
        .join(', ');
    }
    return addr.text || '';
  };

  const getAddressList = (addr: ParsedMail['to']): string => {
    if (!addr) return '';
    if (Array.isArray(addr)) {
      return addr.map((a) => getAddress(a as ParsedMail['from'])).join(', ');
    }
    return getAddress(addr as ParsedMail['from']);
  };

  // 获取邮件正文：优先使用纯文本，如果没有则从 HTML 提取
  let body = parsed.text || '';
  if (!body && parsed.html) {
    body = htmlToText(parsed.html);
  }

  return {
    id: generateId(),
    subject: parsed.subject || '(No Subject)',
    from: getAddress(parsed.from),
    to: getAddressList(parsed.to),
    cc: getAddressList(parsed.cc),
    date: parsed.date?.toISOString() || new Date().toISOString(),
    body,
    bodyHtml: parsed.html || undefined,
    rawEml: buffer.toString('utf-8'),
    fileName,
    createdAt: new Date().toISOString(),
  };
}

export async function parseMultipleEmlFiles(
  files: { buffer: Buffer; fileName: string }[]
): Promise<TestEmail[]> {
  const results: TestEmail[] = [];
  
  for (const file of files) {
    try {
      const email = await parseEmlFile(file.buffer, file.fileName);
      results.push(email);
    } catch (error) {
      console.error(`Failed to parse ${file.fileName}:`, error);
    }
  }
  
  return results;
}
