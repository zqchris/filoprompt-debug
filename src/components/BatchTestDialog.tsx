'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  X, 
  Play, 
  Loader2, 
  CheckCircle2, 
  XCircle,
  ChevronDown 
} from 'lucide-react';
import { OperationType, StyleStrategy, AIProvider, BatchTestResult } from '@/types';

interface BatchTestDialogProps {
  selectedEmailIds: string[];
  onClose: () => void;
}

const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: 'new_email', label: 'New Email' },
  { value: 'reply_email', label: 'Reply Email' },
  { value: 'summarize', label: 'Summarize' },
];

const STYLE_STRATEGIES: StyleStrategy[] = [
  'Professional',
  'Casual',
  'Concise',
  'Detailed',
  'Friendly',
];

export function BatchTestDialog({ selectedEmailIds, onClose }: BatchTestDialogProps) {
  const { aiProvider, aiModel, setAIConfig } = useAppStore();
  
  const [testName, setTestName] = useState(`Batch Test ${new Date().toLocaleString('zh-CN')}`);
  const [operationType, setOperationType] = useState<OperationType>('reply_email');
  const [styleStrategy, setStyleStrategy] = useState<StyleStrategy>('Professional');
  const [userInput, setUserInput] = useState('请帮我回复这封邮件');
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BatchTestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunBatchTest = async () => {
    setIsRunning(true);
    setError(null);

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: testName,
          emailIds: selectedEmailIds,
          config: {
            operationType,
            userInput,
            styleStrategy,
            senderContext: {
              name: 'Test User',
              hasExternalSignature: false,
            },
          },
          provider: aiProvider,
          model: aiModel,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run batch test');
    } finally {
      setIsRunning(false);
    }
  };

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const dialog = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="bg-filo-surface border border-filo-border rounded-xl w-full max-w-2xl overflow-hidden animate-fade-in flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-filo-border shrink-0">
          <h2 className="text-lg font-semibold">批量测试</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-filo-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-filo-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {!result ? (
            <div className="space-y-4">
              {/* Test Name */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  测试名称
                </label>
                <input
                  type="text"
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  className="w-full bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text"
                />
              </div>

              {/* Selected Emails */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  选中的邮件
                </label>
                <div className="bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text">
                  {selectedEmailIds.length} 封邮件
                </div>
              </div>

              {/* Operation Type */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  操作类型
                </label>
                <div className="relative">
                  <select
                    value={operationType}
                    onChange={(e) => setOperationType(e.target.value as OperationType)}
                    className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
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

              {/* Style Strategy */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  风格策略
                </label>
                <div className="relative">
                  <select
                    value={styleStrategy}
                    onChange={(e) => setStyleStrategy(e.target.value as StyleStrategy)}
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

              {/* User Input */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  用户输入（应用到所有邮件）
                </label>
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="w-full h-24 bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text resize-none"
                  placeholder="输入用户的草稿内容..."
                />
              </div>

              {/* AI Provider */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  AI 模型
                </label>
                <div className="bg-filo-bg border border-filo-border rounded-lg py-2 px-3 text-sm text-filo-text">
                  {aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} - {aiModel}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-filo-error/10 border border-filo-error/30 rounded-lg p-3 text-sm text-filo-error">
                  {error}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-filo-bg rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-text">
                    {result.summary.total}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">总数</div>
                </div>
                <div className="bg-filo-success/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-success">
                    {result.summary.completed}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">成功</div>
                </div>
                <div className="bg-filo-error/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-error">
                    {result.summary.failed}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">失败</div>
                </div>
                <div className="bg-filo-accent/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-accent">
                    {Math.round(result.summary.avgLatencyMs)}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">平均延迟(ms)</div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {result.results.map((r, index) => (
                  <div
                    key={r.id}
                    className="bg-filo-bg border border-filo-border rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-filo-success" />
                        <span className="text-sm font-medium">
                          测试 #{index + 1}
                        </span>
                        <span className="text-xs text-filo-text-muted">
                          {r.aiResponse.latencyMs}ms
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-filo-text-muted line-clamp-2">
                      {r.aiResponse.output.slice(0, 150)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-filo-border shrink-0">
          {!result ? (
            <>
              <button onClick={onClose} className="btn-secondary">
                取消
              </button>
              <button
                onClick={handleRunBatchTest}
                disabled={isRunning}
                className="btn-primary flex items-center gap-2"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    运行中...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    运行批量测试
                  </>
                )}
              </button>
            </>
          ) : (
            <button onClick={onClose} className="btn-primary">
              完成
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
