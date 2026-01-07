'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { 
  X, 
  Save, 
  Trash2, 
  Plus, 
  FileCode,
  ChevronDown,
  Check,
  Loader2,
  Copy
} from 'lucide-react';
import { PromptTemplate } from '@/types';

interface PromptTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPrompt: string;
  onSelectTemplate: (template: string) => void;
}

// 默认 Prompt 模板
const DEFAULT_TEMPLATE = `### ROLE ###
You are Filo Mail's Smart Compose Assistant, an expert at turning user input into polished, professional emails that match the user's intent and style preferences.

### CONTEXT ###
*   Current Time: {{currentTime}}
*   User customized prompt: {{customInstruction}}
*   User's profile in original thread (if any): {{senderName}}
*   You are drafting an email on behalf of the user: {{senderName}} {{senderEmail}}
*   The recipient(s) of the email: {{recipients}}
*   Cc of the email: {{cc}}
*   Subject of the email: {{subject}}
*   User's Raw Input/Draft: {{userInput}}

*   **User Selected Style:** {{styleStrategy}}

Turn user's draft into polished email draft.

### CORE TASK ###
Analyze the context using the Style & Tone Strategy below, then generate a polished email draft.

#### 1. Determine Communication Style
*   **Strategy 0: Execute User-Selected Style (ABSOLUTE PRIORITY)**
    *   **Directives:** You MUST strictly follow the style guidelines below.

"""
{{styleGuidelines}}
"""

*   **Interaction with Custom Prompt:** If custom prompt is provided, integrate its requirements within the framework of the selected style.

### OUTPUT FORMAT ###
Your response MUST follow this exact format:

\`\`\`filomail
subject: [Email subject line]

[Email body content here]
\`\`\``;

export function PromptTemplateManager({ 
  isOpen, 
  onClose, 
  currentPrompt,
  onSelectTemplate 
}: PromptTemplateManagerProps) {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // 编辑状态
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isNewTemplate, setIsNewTemplate] = useState(false);

  // 加载模板列表
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen]);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        setTemplates(result.data);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditName(template.name);
    setEditDescription(template.description || '');
    setEditContent(template.template);
    setIsNewTemplate(false);
  };

  const handleNewTemplate = () => {
    setSelectedTemplate(null);
    setEditName('New Template');
    setEditDescription('');
    setEditContent(currentPrompt || DEFAULT_TEMPLATE);
    setIsNewTemplate(true);
  };

  const handleSaveFromCurrent = () => {
    setSelectedTemplate(null);
    setEditName('从当前 Prompt 保存');
    setEditDescription('');
    setEditContent(currentPrompt);
    setIsNewTemplate(true);
  };

  const handleSave = async () => {
    if (!editName.trim() || !editContent.trim()) return;

    setIsSaving(true);
    try {
      if (isNewTemplate) {
        // 创建新模板
        const response = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editName,
            description: editDescription,
            template: editContent,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setTemplates([result.data, ...templates]);
          setSelectedTemplate(result.data);
          setIsNewTemplate(false);
        }
      } else if (selectedTemplate) {
        // 更新现有模板
        const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: editName,
            description: editDescription,
            template: editContent,
          }),
        });
        const result = await response.json();
        if (result.success) {
          setTemplates(templates.map(t => 
            t.id === selectedTemplate.id 
              ? { ...t, name: editName, description: editDescription, template: editContent }
              : t
          ));
        }
      }
    } catch (error) {
      console.error('Failed to save template:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;
    
    if (!confirm(`确定要删除模板 "${selectedTemplate.name}" 吗？`)) return;

    try {
      const response = await fetch(`/api/templates/${selectedTemplate.id}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (result.success) {
        setTemplates(templates.filter(t => t.id !== selectedTemplate.id));
        setSelectedTemplate(null);
        setEditName('');
        setEditDescription('');
        setEditContent('');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleUseTemplate = () => {
    if (editContent) {
      onSelectTemplate(editContent);
      onClose();
    }
  };

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const dialog = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="bg-filo-surface border border-filo-border rounded-xl w-full max-w-5xl overflow-hidden animate-fade-in flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-filo-border">
          <div className="flex items-center gap-3">
            <FileCode className="w-5 h-5 text-filo-accent" />
            <h2 className="text-lg font-semibold">Prompt 模板管理</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-filo-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-filo-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* 左侧：模板列表 */}
          <div className="w-64 border-r border-filo-border flex flex-col">
            <div className="p-3 border-b border-filo-border space-y-2">
              <button
                onClick={handleNewTemplate}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-filo-accent hover:bg-filo-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                新建模板
              </button>
              <button
                onClick={handleSaveFromCurrent}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-filo-bg border border-filo-border hover:border-filo-border-light text-filo-text text-sm font-medium rounded-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                保存当前 Prompt
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-filo-text-muted" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-sm text-filo-text-muted">
                  暂无保存的模板
                </div>
              ) : (
                templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleSelectTemplate(template)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                      selectedTemplate?.id === template.id
                        ? 'bg-filo-accent/20 text-filo-accent'
                        : 'hover:bg-filo-bg text-filo-text'
                    )}
                  >
                    <div className="font-medium text-sm truncate">{template.name}</div>
                    {template.description && (
                      <div className="text-xs text-filo-text-muted truncate mt-0.5">
                        {template.description}
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 右侧：编辑区域 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {(selectedTemplate || isNewTemplate) ? (
              <>
                {/* 模板信息 */}
                <div className="p-4 border-b border-filo-border space-y-3">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-filo-text-muted mb-1">
                        模板名称
                      </label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text"
                        placeholder="输入模板名称"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-filo-text-muted mb-1">
                        描述（可选）
                      </label>
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text"
                        placeholder="简短描述这个模板"
                      />
                    </div>
                  </div>
                </div>

                {/* 模板内容 */}
                <div className="flex-1 p-4 overflow-hidden">
                  <label className="block text-xs font-medium text-filo-text-muted mb-2">
                    Prompt 模板内容
                  </label>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full bg-filo-bg border border-filo-border rounded-lg py-3 px-4 text-sm text-filo-text font-mono resize-none"
                    placeholder="输入 Prompt 模板内容..."
                  />
                </div>

                {/* 操作按钮 */}
                <div className="flex items-center justify-between px-4 py-3 border-t border-filo-border">
                  <div>
                    {!isNewTemplate && selectedTemplate && (
                      <button
                        onClick={handleDelete}
                        className="flex items-center gap-2 px-3 py-2 text-filo-error hover:bg-filo-error/10 rounded-lg text-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        删除
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSave}
                      disabled={isSaving || !editName.trim() || !editContent.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-filo-bg border border-filo-border hover:border-filo-border-light disabled:opacity-50 text-filo-text text-sm font-medium rounded-lg transition-colors"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      保存
                    </button>
                    <button
                      onClick={handleUseTemplate}
                      className="flex items-center gap-2 px-4 py-2 bg-filo-accent hover:bg-filo-accent-hover text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      使用此模板
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-filo-text-muted">
                <div className="text-center">
                  <FileCode className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>选择一个模板进行编辑</p>
                  <p className="text-sm mt-1">或创建新模板</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
