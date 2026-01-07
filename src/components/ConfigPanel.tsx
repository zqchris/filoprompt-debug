'use client';

import { useAppStore } from '@/lib/store';
import { cn, truncate } from '@/lib/utils';
import { ChevronDown, User, Mail, X, FileText } from 'lucide-react';
import { OperationType, StyleStrategy } from '@/types';

const OPERATION_TYPES: { value: OperationType; label: string; description: string }[] = [
  { value: 'new_email', label: 'New Email', description: '撰写新邮件' },
  { value: 'reply_email', label: 'Reply Email', description: '回复邮件' },
  { value: 'forward_email', label: 'Forward Email', description: '转发邮件' },
  { value: 'summarize', label: 'Summarize', description: '邮件摘要' },
  { value: 'extract_action_items', label: 'Extract Action Items', description: '提取行动项' },
  { value: 'todo', label: 'Extract Todo', description: '从邮件提取待办事项' },
];

const STYLE_STRATEGIES: StyleStrategy[] = [
  'Professional',
  'Casual',
  'Concise',
  'Detailed',
  'Friendly',
];

export function ConfigPanel() {
  const {
    promptConfig,
    setPromptConfig,
    aiProvider,
    aiModel,
    setAIConfig,
    selectedEmail,
    setSelectedEmail,
    setCurrentView,
  } = useAppStore();

  return (
    <div className="space-y-4">
      {/* 当前选中的测试邮件 */}
      {selectedEmail && (
        <div className="card p-4 border-filo-accent/30 bg-filo-accent/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 bg-filo-accent/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                <FileText className="w-4 h-4 text-filo-accent" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-medium text-filo-accent uppercase tracking-wide mb-1">
                  Test Email Context
                </h4>
                <p className="text-sm font-medium text-filo-text truncate">
                  {selectedEmail.subject}
                </p>
                <p className="text-xs text-filo-text-muted mt-0.5">
                  From: {truncate(selectedEmail.from, 25)}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedEmail(null)}
              className="p-1 hover:bg-filo-bg rounded transition-colors flex-shrink-0"
              title="移除测试邮件"
            >
              <X className="w-4 h-4 text-filo-text-muted" />
            </button>
          </div>
          <button
            onClick={() => setCurrentView('testdata')}
            className="mt-3 text-xs text-filo-accent hover:underline"
          >
            更换测试邮件 →
          </button>
        </div>
      )}

      {/* 没有选中邮件时显示提示 */}
      {!selectedEmail && (
        <div className="card p-4 border-dashed">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-filo-bg rounded-lg flex items-center justify-center">
              <Mail className="w-4 h-4 text-filo-text-muted" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-filo-text-muted">
                No test email selected
              </p>
              <button
                onClick={() => setCurrentView('testdata')}
                className="text-xs text-filo-accent hover:underline mt-0.5"
              >
                选择测试邮件 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI 配置 - 简化显示 */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-filo-text-muted uppercase tracking-wide">
            AI Model
          </h3>
          <div className="flex items-center gap-2">
            <span className={cn(
              'px-2 py-1 text-xs rounded-md',
              aiProvider === 'gemini' 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-green-500/20 text-green-400'
            )}>
              {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'}
            </span>
            <span className="text-sm text-filo-text">
              {aiModel}
            </span>
          </div>
        </div>
        <p className="mt-2 text-xs text-filo-text-muted">
          在右上角 ⚙️ 设置中配置
        </p>
      </div>

      {/* Operation Type */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-medium text-filo-text-muted uppercase tracking-wide">
          Operation Type
        </h3>
        <div className="relative">
          <select
            value={promptConfig.operationType}
            onChange={(e) =>
              setPromptConfig({ operationType: e.target.value as OperationType })
            }
            className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 pr-10 text-sm text-filo-text"
          >
            {OPERATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
        </div>
      </div>

      {/* 动态变量区 - 折叠显示 */}
      <div className="card p-4 space-y-3">
        <h3 className="text-sm font-medium text-filo-text-muted uppercase tracking-wide">
          Context Variables
        </h3>
        <p className="text-xs text-filo-text-muted">
          这些值可通过动态变量在 Prompt 中引用
        </p>
        
        {/* User Input - 作为 User Message 发送 */}
        <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
          <label className="flex items-center gap-2 text-xs text-filo-text-muted mb-2">
            <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px] font-medium">
              User Message
            </span>
            用户输入 / 草稿
          </label>
          <p className="text-[10px] text-filo-text-muted/70 mb-2">
            此内容作为 API 中的 user 角色发送，同时可在 System Prompt 中用 <code className="text-filo-accent">{'{{EXTRA.content}}'}</code> 引用
          </p>
          <textarea
            value={promptConfig.userInput}
            onChange={(e) => setPromptConfig({ userInput: e.target.value })}
            placeholder="例如：帮我回复说我下周有空..."
            className="w-full h-20 bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50 resize-none"
          />
        </div>

        {/* Custom Instruction */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            自定义指令 <code className="text-filo-accent">{'{{CUSTOM_INSTRUCTION}}'}</code>
          </label>
          <textarea
            value={promptConfig.customInstruction || ''}
            onChange={(e) => setPromptConfig({ customInstruction: e.target.value })}
            placeholder="Keep it brief, mention the deadline..."
            className="w-full h-16 bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50 resize-none"
          />
        </div>

        {/* Has External Signature */}
        <div>
          <label className="flex items-center gap-2 text-xs text-filo-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={promptConfig.senderContext.hasExternalSignature}
              onChange={(e) =>
                setPromptConfig({
                  senderContext: {
                    ...promptConfig.senderContext,
                    hasExternalSignature: e.target.checked,
                  },
                })
              }
              className="w-4 h-4 rounded border-filo-border bg-filo-bg text-filo-accent focus:ring-filo-accent"
            />
            有外部签名 <code className="text-filo-accent">{'{{EXTRA.hasExternalSignature}}'}</code>
          </label>
        </div>

        {/* Style */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            风格（可选）
          </label>
          <div className="relative">
            <select
              value={promptConfig.styleStrategy}
              onChange={(e) =>
                setPromptConfig({ styleStrategy: e.target.value as StyleStrategy })
              }
              className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
            >
              {STYLE_STRATEGIES.map((style) => (
                <option key={style} value={style}>
                  {style}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
          </div>
        </div>

        {/* Sender Name */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            发件人名称 <code className="text-filo-accent">{'{{EXTRA.fromName}}'}</code>
          </label>
          <input
            type="text"
            value={promptConfig.senderContext.name}
            onChange={(e) =>
              setPromptConfig({
                senderContext: { ...promptConfig.senderContext, name: e.target.value },
              })
            }
            placeholder="John Doe"
            className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50"
          />
        </div>

        {/* Sender Email */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            发件人邮箱 <code className="text-filo-accent">{'{{EXTRA.fromEmail}}'}</code>
          </label>
          <input
            type="email"
            value={promptConfig.senderContext.email || ''}
            onChange={(e) =>
              setPromptConfig({
                senderContext: { ...promptConfig.senderContext, email: e.target.value },
              })
            }
            placeholder="john@example.com"
            className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50"
          />
        </div>

        {/* All Mails - 用户所有邮箱 */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            用户邮箱列表 <code className="text-filo-accent">{'{{ALL_MAILS}}'}</code>
          </label>
          <input
            type="text"
            value={promptConfig.allMails || ''}
            onChange={(e) => setPromptConfig({ allMails: e.target.value })}
            placeholder="John <john@work.com>, john@personal.com"
            className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50"
          />
        </div>

        {/* Locale - 用户语言 */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            用户语言 <code className="text-filo-accent">{'{{LOCALE}}'}</code>
          </label>
          <select
            value={promptConfig.locale || 'en-US'}
            onChange={(e) => setPromptConfig({ locale: e.target.value })}
            className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
          >
            <option value="en-US">English (US)</option>
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="ja-JP">日本語</option>
            <option value="ko-KR">한국어</option>
            <option value="es-ES">Español</option>
            <option value="fr-FR">Français</option>
            <option value="de-DE">Deutsch</option>
          </select>
        </div>

        {/* Category - Gmail 分类 */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            Gmail 分类 <code className="text-filo-accent">{'{{CATEGORY}}'}</code>
          </label>
          <select
            value={promptConfig.category || ''}
            onChange={(e) => setPromptConfig({ category: e.target.value })}
            className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
          >
            <option value="">（未分类）</option>
            <option value="primary">Primary</option>
            <option value="social">Social</option>
            <option value="promotions">Promotions</option>
            <option value="updates">Updates</option>
            <option value="forums">Forums</option>
          </select>
        </div>

        {/* Profiles - 用户档案 */}
        <div>
          <label className="text-xs text-filo-text-muted mb-1 block">
            用户档案 <code className="text-filo-accent">{'{{PROFILES}}'}</code>
          </label>
          <textarea
            value={promptConfig.profiles || ''}
            onChange={(e) => setPromptConfig({ profiles: e.target.value })}
            placeholder="Professional writer, prefers concise responses..."
            className="w-full h-16 bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
