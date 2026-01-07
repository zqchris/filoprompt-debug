/**
 * 邮件清理工具
 * 清理冗余内容（CSS、脚本、重复样式），保留关键结构信息
 */

import * as cheerio from 'cheerio';

// 需要保留的邮件头字段
const IMPORTANT_HEADERS = [
  'From',
  'To',
  'Cc',
  'Bcc',
  'Date',
  'Subject',
  'Reply-To',
  'Message-ID',
  'In-Reply-To',
  'References',
  'List-Unsubscribe',
  'List-Unsubscribe-Post',
  'Content-Type',
  'MIME-Version',
];

/**
 * 从原始 EML 中提取并清理邮件内容
 * 保留：重要邮件头、纯文本正文、HTML 正文的文本内容
 * 移除：CSS、脚本、冗余 MIME 结构、重复内容
 */
export function cleanEmailForAI(rawEml: string): string {
  // 统一换行符为 \n
  rawEml = rawEml.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  const lines = rawEml.split('\n');
  const result: string[] = [];
  
  // 1. 提取重要的邮件头
  let inHeaders = true;
  let currentHeader = '';
  let currentValue = '';
  const headers: Record<string, string> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (inHeaders) {
      // 空行表示邮件头结束
      if (line.trim() === '') {
        // 保存最后一个 header
        if (currentHeader) {
          headers[currentHeader] = currentValue.trim();
        }
        inHeaders = false;
        continue;
      }
      
      // 折叠行（以空格或 tab 开头）
      if (line.match(/^[ \t]/) && currentHeader) {
        currentValue += ' ' + line.trim();
        continue;
      }
      
      // 新的 header
      const match = line.match(/^([A-Za-z-]+):\s*(.*)/);
      if (match) {
        // 保存之前的 header
        if (currentHeader) {
          headers[currentHeader] = currentValue.trim();
        }
        currentHeader = match[1];
        currentValue = match[2];
      }
    }
  }
  
  // 2. 输出重要的邮件头
  result.push('=== EMAIL HEADERS ===');
  for (const header of IMPORTANT_HEADERS) {
    // 查找匹配的 header（不区分大小写）
    const key = Object.keys(headers).find(k => k.toLowerCase() === header.toLowerCase());
    if (key && headers[key]) {
      let value = headers[key];
      // 解码 MIME 编码的值
      value = decodeMimeHeader(value);
      result.push(`${header}: ${value}`);
    }
  }
  
  // 3. 提取正文内容
  result.push('');
  result.push('=== EMAIL BODY ===');
  
  const bodyContent = extractBodyContent(rawEml);
  result.push(bodyContent);
  
  return result.join('\n');
}

/**
 * 解码 MIME 编码的邮件头（如 =?UTF-8?B?xxx?=）
 */
function decodeMimeHeader(value: string): string {
  // 处理 Base64 编码
  const base64Pattern = /=\?([^?]+)\?[Bb]\?([^?]+)\?=/g;
  value = value.replace(base64Pattern, (_, charset, encoded) => {
    try {
      return Buffer.from(encoded, 'base64').toString('utf-8');
    } catch {
      return encoded;
    }
  });
  
  // 处理 Quoted-Printable 编码
  const qpPattern = /=\?([^?]+)\?[Qq]\?([^?]+)\?=/g;
  value = value.replace(qpPattern, (_, charset, encoded) => {
    try {
      return encoded
        .replace(/_/g, ' ')
        .replace(/=([0-9A-Fa-f]{2})/g, (_: string, hex: string) => 
          String.fromCharCode(parseInt(hex, 16))
        );
    } catch {
      return encoded;
    }
  });
  
  return value;
}

/**
 * 从 EML 中提取正文内容
 * 使用更直接的方法：找到 text/html 部分并提取文本
 */
function extractBodyContent(rawEml: string): string {
  // 方法1：直接查找 text/html 部分
  const htmlStart = rawEml.indexOf('Content-Type: text/html');
  if (htmlStart !== -1) {
    // 找到内容开始（双换行后）
    const contentStart = rawEml.indexOf('\n\n', htmlStart);
    if (contentStart !== -1) {
      // 找到结束边界
      let endBoundary = rawEml.indexOf('\n------', contentStart);
      if (endBoundary === -1) {
        endBoundary = rawEml.length;
      }
      
      let htmlContent = rawEml.slice(contentStart + 2, endBoundary);
      
      // 检查编码并解码
      const headerPart = rawEml.slice(htmlStart, contentStart);
      const isQuotedPrintable = /Content-Transfer-Encoding:\s*quoted-printable/i.test(headerPart);
      const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(headerPart);
      
      if (isQuotedPrintable) {
        htmlContent = decodeQuotedPrintable(htmlContent);
      } else if (isBase64) {
        htmlContent = decodeBase64Content(htmlContent);
      }
      
      // 提取文本
      const text = extractTextFromHtml(htmlContent);
      if (text && text.length > 20) {
        return text;
      }
    }
  }
  
  // 方法2：查找 text/plain 部分
  const plainStart = rawEml.indexOf('Content-Type: text/plain');
  if (plainStart !== -1) {
    const contentStart = rawEml.indexOf('\n\n', plainStart);
    if (contentStart !== -1) {
      let endBoundary = rawEml.indexOf('\n------', contentStart);
      if (endBoundary === -1) {
        endBoundary = rawEml.length;
      }
      
      let plainContent = rawEml.slice(contentStart + 2, endBoundary);
      
      const headerPart = rawEml.slice(plainStart, contentStart);
      const isQuotedPrintable = /Content-Transfer-Encoding:\s*quoted-printable/i.test(headerPart);
      const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(headerPart);
      
      if (isQuotedPrintable) {
        plainContent = decodeQuotedPrintable(plainContent);
      } else if (isBase64) {
        plainContent = decodeBase64Content(plainContent);
      }
      
      const trimmed = plainContent.trim();
      if (trimmed.length > 20) {
        return trimmed;
      }
    }
  }
  
  // 方法3：如果是单一内容类型（非 multipart）
  const headerEndIndex = rawEml.indexOf('\n\n');
  if (headerEndIndex !== -1 && !rawEml.includes('multipart')) {
    const body = rawEml.substring(headerEndIndex + 2);
    const isHtml = /Content-Type:\s*text\/html/i.test(rawEml);
    
    if (isHtml) {
      return extractTextFromHtml(body);
    }
    
    return body.trim().slice(0, 5000);
  }
  
  return '(No body found)';
}

/**
 * 查找所有 boundaries
 */
function findAllBoundaries(content: string): string[] {
  const boundaries: string[] = [];
  const regex = /boundary="?([^"\s\n\r]+)"?/gi;
  let match;
  while ((match = regex.exec(content)) !== null) {
    boundaries.push(match[1]);
  }
  return boundaries;
}

/**
 * 从 multipart 邮件中提取内容
 */
function extractFromMultipart(body: string, boundary: string): string {
  const parts = body.split('--' + boundary);
  let plainText = '';
  let htmlText = '';
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    // 跳过空部分、结束标记、和第一部分（通常是 preamble）
    if (part.trim() === '' || part.trim() === '--') continue;
    // 如果是第一个非空部分且不包含 Content-Type，跳过（可能是 preamble）
    if (i === 0 && !/Content-Type:/i.test(part)) continue;
    
    const isPlainText = /Content-Type:\s*text\/plain/i.test(part);
    const isHtml = /Content-Type:\s*text\/html/i.test(part);
    const isQuotedPrintable = /Content-Transfer-Encoding:\s*quoted-printable/i.test(part);
    const isBase64 = /Content-Transfer-Encoding:\s*base64/i.test(part);
    
    // 检查是否有嵌套的 multipart（在检查内容之前）
    const nestedBoundaryMatch = part.match(/Content-Type:\s*multipart\/[^;]+;\s*boundary="?([^"\s\n\r]+)"?/i);
    if (nestedBoundaryMatch) {
      // 找到嵌套内容的开始位置
      const nestedContentStart = part.indexOf('\n\n');
      if (nestedContentStart !== -1) {
        const nestedContent = part.substring(nestedContentStart + 2);
        const nestedResult = extractFromMultipart(nestedContent, nestedBoundaryMatch[1]);
        if (nestedResult && nestedResult !== '(No readable content found)') {
          if (!plainText) plainText = nestedResult;
          continue;
        }
      }
    }
    
    // 找到内容开始位置（headers 后的空行）
    const contentStart = part.indexOf('\n\n');
    if (contentStart === -1) continue;
    
    let content = part.substring(contentStart + 2);
    
    // 去除可能的结束边界标记
    const endBoundaryIndex = content.indexOf('\n--');
    if (endBoundaryIndex !== -1) {
      content = content.substring(0, endBoundaryIndex);
    }
    
    // 解码内容
    if (isBase64) {
      content = decodeBase64Content(content);
    } else if (isQuotedPrintable) {
      content = decodeQuotedPrintable(content);
    }
    
    if (isPlainText) {
      const trimmed = content.trim();
      // 只有当有实质内容时才使用纯文本
      if (trimmed.length > 10 && !plainText) {
        plainText = trimmed;
      }
    } else if (isHtml && !htmlText) {
      const extracted = extractTextFromHtml(content);
      if (extracted && extracted.length > 10) {
        htmlText = extracted;
      }
    }
  }
  
  // 优先返回纯文本，否则返回从 HTML 提取的文本
  return plainText || htmlText || '(No readable content found)';
}

/**
 * 解码 Base64 内容
 */
function decodeBase64Content(content: string): string {
  try {
    // 移除换行符
    const cleaned = content.replace(/[\r\n\s]/g, '');
    return Buffer.from(cleaned, 'base64').toString('utf-8');
  } catch {
    return content;
  }
}

/**
 * 解码 Quoted-Printable 内容（正确处理 UTF-8）
 */
function decodeQuotedPrintable(content: string): string {
  try {
    // 先处理软换行
    content = content.replace(/=\r?\n/g, '');
    
    // 将所有 =XX 转换为字节数组，然后用 UTF-8 解码
    const bytes: number[] = [];
    let i = 0;
    
    while (i < content.length) {
      if (content[i] === '=' && i + 2 < content.length) {
        const hex = content.slice(i + 1, i + 3);
        if (/^[0-9A-Fa-f]{2}$/.test(hex)) {
          bytes.push(parseInt(hex, 16));
          i += 3;
          continue;
        }
      }
      // 普通字符
      bytes.push(content.charCodeAt(i));
      i++;
    }
    
    // 使用 Buffer 解码为 UTF-8
    return Buffer.from(bytes).toString('utf-8');
  } catch {
    return content;
  }
}

/**
 * 从 HTML 中提取文本内容（使用 cheerio）
 */
function extractTextFromHtml(html: string): string {
  try {
    const $ = cheerio.load(html);
    
    // 移除不需要的元素
    $('script, style, head, meta, link, noscript').remove();
    
    // 移除注释
    $('*').contents().filter(function() {
      return this.type === 'comment';
    }).remove();
    
    // 移除空的元素
    $('*').each(function() {
      if ($(this).text().trim() === '' && $(this).find('img').length === 0) {
        // 保留有意义的空元素（如 br）
        if (!['br', 'hr', 'img'].includes(this.tagName?.toLowerCase() || '')) {
          $(this).remove();
        }
      }
    });
    
    // 提取链接文本（保留 URL）
    $('a').each(function() {
      const href = $(this).attr('href');
      const text = $(this).text().trim();
      if (href && text && !text.includes('http')) {
        // 对于退订等重要链接，保留 URL
        if (href.toLowerCase().includes('unsubscribe') || 
            text.toLowerCase().includes('unsubscribe') ||
            text.includes('退订')) {
          $(this).text(`${text} [${href}]`);
        }
      }
    });
    
    // 获取文本
    let text = $.text();
    
    // 清理文本
    text = text
      // 多个空格变一个
      .replace(/[ \t]+/g, ' ')
      // 多个换行变两个
      .replace(/\n\s*\n\s*\n+/g, '\n\n')
      // 去除每行首尾空格
      .split('\n')
      .map(line => line.trim())
      .join('\n')
      // 最终 trim
      .trim();
    
    // 如果内容太短，可能提取失败
    if (text.length < 10) {
      return '(HTML content could not be extracted)';
    }
    
    return text;
  } catch (error) {
    return '(Failed to parse HTML)';
  }
}

/**
 * 估算清理后的 token 数量（粗略估计：1 token ≈ 4 字符）
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
