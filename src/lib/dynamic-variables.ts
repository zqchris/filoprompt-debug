import { DynamicVariable, TestEmail, OperationType } from '@/types';

// 与生产环境保持一致的动态变量列表
export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  // 时间相关
  {
    name: 'CURRENT_DATE_TIME',
    placeholder: '{{CURRENT_DATE_TIME}}',
    description: '当前日期时间',
    example: '2025-01-07 15:30:00',
  },
  
  // 用户上下文（模拟用户口吻）
  {
    name: 'ALL_MAILS',
    placeholder: '{{ALL_MAILS}}',
    description: '用户名和邮箱地址列表',
    example: 'John Doe <john@example.com>, john.doe@work.com',
  },
  {
    name: 'CUSTOM_INSTRUCTION',
    placeholder: '{{CUSTOM_INSTRUCTION}}',
    description: '用户自定义指令',
    example: 'Keep it brief and friendly',
  },
  {
    name: 'LOCALE',
    placeholder: '{{LOCALE}}',
    description: '用户偏好语言',
    example: 'zh-CN',
  },
  {
    name: 'CATEGORY',
    placeholder: '{{CATEGORY}}',
    description: 'Gmail 邮件分类',
    example: 'primary',
  },
  {
    name: 'PROFILES',
    placeholder: '{{PROFILES}}',
    description: '用户档案/历史风格',
    example: 'Professional, concise writer',
  },

  // EXTRA 发件人信息
  {
    name: 'EXTRA.fromName',
    placeholder: '{{EXTRA.fromName}}',
    description: '发件人名称',
    example: 'John Doe',
  },
  {
    name: 'EXTRA.fromEmail',
    placeholder: '{{EXTRA.fromEmail}}',
    description: '发件人邮箱',
    example: 'john@example.com',
  },
  {
    name: 'EXTRA.to',
    placeholder: '{{EXTRA.to}}',
    description: '收件人',
    example: 'jane@example.com',
  },
  {
    name: 'EXTRA.cc',
    placeholder: '{{EXTRA.cc}}',
    description: '抄送',
    example: 'team@example.com',
  },
  {
    name: 'EXTRA.subject',
    placeholder: '{{EXTRA.subject}}',
    description: '邮件主题',
    example: 'Re: Project Update',
  },
  {
    name: 'EXTRA.content',
    placeholder: '{{EXTRA.content}}',
    description: '用户原始输入/草稿',
    example: 'Thanks for the update',
  },
  {
    name: 'EXTRA.operationType',
    placeholder: '{{EXTRA.operationType}}',
    description: '操作类型 (NEW/REPLY/REPLY_ALL/FORWARD)',
    example: 'REPLY',
  },
  {
    name: 'EXTRA.hasExternalSignature',
    placeholder: '{{EXTRA.hasExternalSignature}}',
    description: '是否有外部签名',
    example: 'true',
  },

  // 原邮件相关
  {
    name: 'MAIL',
    placeholder: '{{MAIL}}',
    description: '原邮件完整内容',
    example: 'From: sender@example.com\nSubject: Hello\n\nEmail body...',
  },
  {
    name: 'MAIL_ENVELOPE.mailPrimaryLanguage',
    placeholder: '{{MAIL_ENVELOPE.mailPrimaryLanguage}}',
    description: '邮件主要语言',
    example: 'English',
  },
  {
    name: 'MAIL_ENVELOPE.from',
    placeholder: '{{MAIL_ENVELOPE.from}}',
    description: '原邮件发件人',
    example: 'sender@example.com',
  },
  {
    name: 'MAIL_ENVELOPE.to',
    placeholder: '{{MAIL_ENVELOPE.to}}',
    description: '原邮件收件人',
    example: 'recipient@example.com',
  },
  {
    name: 'MAIL_ENVELOPE.subject',
    placeholder: '{{MAIL_ENVELOPE.subject}}',
    description: '原邮件主题',
    example: 'Project Discussion',
  },
  {
    name: 'MAIL_ENVELOPE.date',
    placeholder: '{{MAIL_ENVELOPE.date}}',
    description: '原邮件日期',
    example: '2025-01-06 10:00:00',
  },
];

// 操作类型映射（与生产环境一致）
const OPERATION_TYPE_MAP: Record<OperationType, string> = {
  new_email: 'NEW',
  reply_email: 'REPLY',
  forward_email: 'FORWARD',
  summarize: 'SUMMARIZE',
  extract_action_items: 'EXTRACT_ACTION_ITEMS',
  todo: 'TODO',
};

// 构建 MAIL 格式的邮件内容
function formatMailContent(email: TestEmail): string {
  return `From: ${email.from}
To: ${email.to}${email.cc ? `\nCc: ${email.cc}` : ''}
Date: ${email.date}
Subject: ${email.subject}

${email.body}`;
}

// 检测邮件语言（简化版）
function detectLanguage(text: string): string {
  // 简单的中文检测
  const chineseChars = text.match(/[\u4e00-\u9fa5]/g);
  if (chineseChars && chineseChars.length > text.length * 0.1) {
    return 'Chinese';
  }
  return 'English';
}

// 替换动态变量
export function replaceDynamicVariables(
  template: string,
  context: {
    email?: TestEmail | null;
    senderName?: string;
    senderEmail?: string;
    userInput?: string;
    style?: string;
    customInstruction?: string;
    operationType?: OperationType;
    hasExternalSignature?: boolean;
    profiles?: string;
    // 新增的用户口吻变量
    allMails?: string;
    locale?: string;
    category?: string;
  }
): string {
  let result = template;
  const now = new Date();

  // 时间变量
  result = result.replace(/\{\{CURRENT_DATE_TIME\}\}/g, now.toLocaleString());
  
  // 用户上下文（模拟用户口吻）
  result = result.replace(/\{\{ALL_MAILS\}\}/g, context.allMails || 
    (context.senderName && context.senderEmail 
      ? `${context.senderName} <${context.senderEmail}>` 
      : context.senderEmail || ''));
  result = result.replace(/\{\{CUSTOM_INSTRUCTION\}\}/g, context.customInstruction || '');
  result = result.replace(/\{\{LOCALE\}\}/g, context.locale || 'en-US');
  result = result.replace(/\{\{CATEGORY\}\}/g, context.category || '');
  result = result.replace(/\{\{PROFILES\}\}/g, context.profiles || '');

  // EXTRA 变量
  result = result.replace(/\{\{EXTRA\.fromName\}\}/g, context.senderName || '');
  result = result.replace(/\{\{EXTRA\.fromEmail\}\}/g, context.senderEmail || '');
  result = result.replace(/\{\{EXTRA\.content\}\}/g, context.userInput || '');
  result = result.replace(/\{\{EXTRA\.operationType\}\}/g, 
    context.operationType ? OPERATION_TYPE_MAP[context.operationType] : 'NEW');
  result = result.replace(/\{\{EXTRA\.hasExternalSignature\}\}/g, 
    context.hasExternalSignature ? 'true' : 'false');

  // 邮件相关变量
  if (context.email) {
    result = result.replace(/\{\{EXTRA\.to\}\}/g, context.email.to || '');
    result = result.replace(/\{\{EXTRA\.cc\}\}/g, context.email.cc || '');
    result = result.replace(/\{\{EXTRA\.subject\}\}/g, context.email.subject || '');
    
    result = result.replace(/\{\{MAIL\}\}/g, formatMailContent(context.email));
    result = result.replace(/\{\{MAIL_ENVELOPE\.from\}\}/g, context.email.from || '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.to\}\}/g, context.email.to || '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.subject\}\}/g, context.email.subject || '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.date\}\}/g, context.email.date || '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.mailPrimaryLanguage\}\}/g, 
      detectLanguage(context.email.body));
  } else {
    // 清空邮件相关变量
    result = result.replace(/\{\{EXTRA\.to\}\}/g, '');
    result = result.replace(/\{\{EXTRA\.cc\}\}/g, '');
    result = result.replace(/\{\{EXTRA\.subject\}\}/g, '');
    result = result.replace(/\{\{MAIL\}\}/g, '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.from\}\}/g, '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.to\}\}/g, '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.subject\}\}/g, '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.date\}\}/g, '');
    result = result.replace(/\{\{MAIL_ENVELOPE\.mailPrimaryLanguage\}\}/g, 'English');
  }

  // 兼容旧版小写变量（向后兼容）
  result = result.replace(/\{\{local_time\}\}/g, now.toLocaleString());
  result = result.replace(/\{\{local_date\}\}/g, now.toLocaleDateString());
  result = result.replace(/\{\{user_input\}\}/g, context.userInput || '');
  result = result.replace(/\{\{sender_name\}\}/g, context.senderName || '');
  result = result.replace(/\{\{sender_email\}\}/g, context.senderEmail || '');
  result = result.replace(/\{\{style\}\}/g, context.style || 'Professional');
  
  if (context.email) {
    result = result.replace(/\{\{email_subject\}\}/g, context.email.subject || '');
    result = result.replace(/\{\{email_from\}\}/g, context.email.from || '');
    result = result.replace(/\{\{email_to\}\}/g, context.email.to || '');
    result = result.replace(/\{\{email_cc\}\}/g, context.email.cc || '');
    result = result.replace(/\{\{email_date\}\}/g, context.email.date || '');
    result = result.replace(/\{\{email_body\}\}/g, context.email.body || '');
  }

  return result;
}

// 构建完整的 prompt（自动附加邮件上下文）
export function buildFinalPrompt(
  template: string,
  context: {
    email?: TestEmail | null;
    senderName?: string;
    senderEmail?: string;
    userInput?: string;
    style?: string;
    customInstruction?: string;
    operationType?: OperationType;
    hasExternalSignature?: boolean;
    profiles?: string;
    allMails?: string;
    locale?: string;
    category?: string;
  }
): string {
  // 先替换变量
  let result = replaceDynamicVariables(template, context);

  // 如果有邮件上下文，检查 prompt 中是否已经包含了邮件内容
  if (context.email) {
    const hasMailContent = template.includes('{{MAIL}}') || 
                          template.includes('{{email_body}}') ||
                          result.includes(context.email.body);
    
    if (!hasMailContent) {
      // 使用生产环境格式附加邮件
      result += `

---
<Original email begins>
${formatMailContent(context.email)}
<Original email ends>
---`;
    }
  }

  return result;
}

// 获取变量列表（用于 UI 显示）
export function getVariablesForOperation(operationType: string): DynamicVariable[] {
  // 基础变量（所有操作都可用）
  const baseVars = DYNAMIC_VARIABLES.filter(v => 
    ['CURRENT_DATE_TIME', 'ALL_MAILS', 'CUSTOM_INSTRUCTION', 'LOCALE', 'CATEGORY', 'PROFILES'].includes(v.name) ||
    v.name.startsWith('EXTRA.')
  );
  
  // 需要邮件上下文的操作
  const emailOperations = ['reply_email', 'forward_email', 'summarize', 'extract_action_items', 'todo'];
  
  if (emailOperations.includes(operationType)) {
    const mailVars = DYNAMIC_VARIABLES.filter(v => 
      v.name === 'MAIL' || v.name.startsWith('MAIL_ENVELOPE.')
    );
    return [...baseVars, ...mailVars];
  }
  
  return baseVars;
}

// 获取分组的变量列表（用于更好的 UI 展示）
export function getGroupedVariables(operationType: string): Record<string, DynamicVariable[]> {
  const vars = getVariablesForOperation(operationType);
  
  return {
    '时间': vars.filter(v => v.name === 'CURRENT_DATE_TIME'),
    '用户口吻': vars.filter(v => ['ALL_MAILS', 'CUSTOM_INSTRUCTION', 'LOCALE', 'CATEGORY', 'PROFILES'].includes(v.name)),
    '发件人 (EXTRA)': vars.filter(v => v.name.startsWith('EXTRA.')),
    '原邮件 (MAIL)': vars.filter(v => v.name === 'MAIL' || v.name.startsWith('MAIL_ENVELOPE.')),
  };
}
