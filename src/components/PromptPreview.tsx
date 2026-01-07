'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Copy, Check, Save, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { getGroupedVariables, buildFinalPrompt } from '@/lib/dynamic-variables';

export function PromptPreview() {
  const { 
    promptConfig, 
    aiProvider, 
    aiModel, 
    selectedEmail,
    operationPrompts,
    setOperationPrompt,
  } = useAppStore();
  
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [localPrompt, setLocalPrompt] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // 当前 operation 的 prompt
  const currentOperationPrompt = operationPrompts[promptConfig.operationType] || '';

  // 初始化或切换 operation 时更新本地 prompt
  useEffect(() => {
    setLocalPrompt(currentOperationPrompt);
    setHasChanges(false);
  }, [promptConfig.operationType, currentOperationPrompt]);

  // 分组的动态变量
  const groupedVariables = getGroupedVariables(promptConfig.operationType);

  // 变量上下文（System Prompt 和 User Message 共用）
  const variableContext = {
    email: selectedEmail,
    senderName: promptConfig.senderContext.name,
    senderEmail: promptConfig.senderContext.email,
    userInput: promptConfig.userInput,
    style: promptConfig.styleStrategy,
    customInstruction: promptConfig.customInstruction,
    operationType: promptConfig.operationType,
    hasExternalSignature: promptConfig.senderContext.hasExternalSignature,
    // 模拟用户口吻的变量
    allMails: promptConfig.allMails,
    locale: promptConfig.locale,
    category: promptConfig.category,
    profiles: promptConfig.profiles,
  };

  // 预览 System Prompt（包括自动附加的邮件上下文）
  const previewPrompt = buildFinalPrompt(localPrompt, variableContext);
  
  // 预览 User Message（也支持变量替换）
  const previewUserMessage = promptConfig.userInput 
    ? buildFinalPrompt(promptConfig.userInput, variableContext)
    : '';

  const handlePromptChange = (value: string) => {
    setLocalPrompt(value);
    setHasChanges(value !== currentOperationPrompt);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/operation-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType: promptConfig.operationType,
          prompt: localPrompt,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setOperationPrompt(promptConfig.operationType, localPrompt);
        setHasChanges(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(previewPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertVariable = (placeholder: string) => {
    // 在当前光标位置插入变量，或追加到末尾
    setLocalPrompt(prev => prev + placeholder);
    setHasChanges(true);
  };

  const OPERATION_LABELS: Record<string, string> = {
    new_email: 'New Email',
    reply_email: 'Reply Email',
    forward_email: 'Forward Email',
    summarize: 'Summarize',
    extract_action_items: 'Extract Action Items',
    todo: 'Extract Todo',
  };

  return (
    <div className="card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-filo-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Prompt: {OPERATION_LABELS[promptConfig.operationType]}
          </span>
          {hasChanges && (
            <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
              未保存
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 text-xs bg-filo-bg border border-filo-border rounded-md text-filo-text-muted">
            {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} {aiModel}
          </span>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="p-1.5 hover:bg-filo-bg rounded-md transition-colors disabled:opacity-50"
            title="保存 Prompt"
          >
            {saved ? (
              <Check className="w-4 h-4 text-filo-success" />
            ) : (
              <Save className="w-4 h-4 text-filo-accent" />
            )}
          </button>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-filo-bg rounded-md transition-colors"
            title="复制预览后的 Prompt"
          >
            {copied ? (
              <Check className="w-4 h-4 text-filo-success" />
            ) : (
              <Copy className="w-4 h-4 text-filo-text-muted" />
            )}
          </button>
        </div>
      </div>

      {/* 动态变量面板 */}
      <div className="border-b border-filo-border">
        <button
          onClick={() => setShowVariables(!showVariables)}
          className="w-full px-4 py-2 flex items-center justify-between text-sm text-filo-text-muted hover:bg-filo-bg/50 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            可用动态变量
          </span>
          {showVariables ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        {showVariables && (
          <div className="px-4 py-3 bg-filo-bg/30 max-h-64 overflow-y-auto space-y-3">
            {Object.entries(groupedVariables).map(([group, vars]) => 
              vars.length > 0 && (
                <div key={group}>
                  <h4 className="text-xs font-medium text-filo-text-muted uppercase tracking-wide mb-2">
                    {group}
                  </h4>
                  <div className="grid grid-cols-2 gap-1">
                    {vars.map((v) => (
                      <button
                        key={v.name}
                        onClick={() => insertVariable(v.placeholder)}
                        className="text-left p-2 rounded-md hover:bg-filo-bg transition-colors"
                        title={`${v.description}\n示例: ${v.example}`}
                      >
                        <code className="text-xs text-filo-accent font-mono break-all">
                          {v.placeholder}
                        </code>
                        <p className="text-xs text-filo-text-muted mt-0.5 truncate">
                          {v.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Prompt 编辑区 */}
      <div className="flex-1 overflow-hidden p-4 flex flex-col gap-2">
        <label className="text-xs text-filo-text-muted uppercase tracking-wide">
          编辑 Prompt（可使用动态变量）
        </label>
        
        {/* 邮件上下文提示 */}
        {['reply_email', 'forward_email', 'summarize', 'extract_action_items', 'todo'].includes(promptConfig.operationType) && !selectedEmail && (
          <div className="text-xs text-filo-warning bg-filo-warning/10 px-3 py-2 rounded-lg">
            💡 提示：请先在 Test Data 页面选择一封测试邮件，才能使用 {'{{MAIL}}'} 变量引入邮件内容
          </div>
        )}
        
        {selectedEmail && (
          <div className="text-xs text-filo-success bg-filo-success/10 px-3 py-2 rounded-lg">
            ✓ 已选择邮件，可使用 {'{{MAIL}}'} 引入完整邮件内容
          </div>
        )}

        <textarea
          value={localPrompt}
          onChange={(e) => handlePromptChange(e.target.value)}
          className="flex-1 w-full bg-filo-bg/50 text-filo-text text-sm font-mono resize-none focus:outline-none focus:ring-1 focus:ring-filo-accent/50 rounded-lg p-3 border border-filo-border"
          placeholder={`为 "${OPERATION_LABELS[promptConfig.operationType]}" 操作编写 Prompt...

${selectedEmail ? '可使用 {{MAIL}} 引入选中的邮件内容' : '请先选择测试邮件'}

示例:
请帮我回复以下邮件：
{{MAIL}}`}
          spellCheck={false}
        />
      </div>

      {/* 预览区（仅当有 prompt 时显示） */}
      {localPrompt && (
        <div className="border-t border-filo-border p-4 space-y-3">
          {/* System Prompt 预览 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded font-medium">
                System
              </span>
              <label className="text-xs text-filo-text-muted uppercase tracking-wide">
                预览（变量已替换）
              </label>
            </div>
            <div className="bg-filo-bg/30 rounded-lg p-3 max-h-28 overflow-y-auto border border-blue-500/20">
              <pre className="text-xs text-filo-text-muted font-mono whitespace-pre-wrap break-words">
                {previewPrompt || '（空）'}
              </pre>
            </div>
          </div>
          
          {/* User Message 预览 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded font-medium">
                User
              </span>
              <label className="text-xs text-filo-text-muted">
                用户输入（变量已替换，作为 user message 发送）
              </label>
            </div>
            <div className="bg-filo-bg/30 rounded-lg p-3 max-h-28 overflow-y-auto border border-green-500/20">
              <pre className="text-xs text-filo-text-muted font-mono whitespace-pre-wrap break-words">
                {previewUserMessage || '（无用户输入）'}
              </pre>
            </div>
          </div>
          
          <p className="text-xs text-filo-text-muted/70 italic">
            💡 System Prompt 作为系统指令，User Message 作为用户输入分别发送给 AI
          </p>
        </div>
      )}
    </div>
  );
}
