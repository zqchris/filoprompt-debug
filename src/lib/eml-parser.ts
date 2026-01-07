import { simpleParser, ParsedMail } from 'mailparser';
import { TestEmail } from '@/types';
import { generateId } from './db';

// 从 HTML 中提取纯文本
function htmlToText(html: string): string {
  // 移除 style 和 script 标签及其内容
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 将常见块级元素转换为换行
  text = text.replace(/<\/?(div|p|br|hr|tr|li|h[1-6])[^>]*>/gi, '\n');
  
  // 移除所有其他 HTML 标签
  text = text.replace(/<[^>]+>/g, '');
  
  // 解码 HTML 实体
  text = text.replace(/&nbsp;/gi, ' ');
  text = text.replace(/&amp;/gi, '&');
  text = text.replace(/&lt;/gi, '<');
  text = text.replace(/&gt;/gi, '>');
  text = text.replace(/&quot;/gi, '"');
  text = text.replace(/&#(\d+);/gi, (_, code) => String.fromCharCode(parseInt(code)));
  
  // 清理多余的空白
  text = text.replace(/\n\s*\n/g, '\n\n');
  text = text.trim();
  
  return text;
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
