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
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Minus,
  Save,
  Star
} from 'lucide-react';
import { OperationType, StyleStrategy, BatchTestItemResult, ComparisonScore } from '@/types';

interface BatchTestDialogProps {
  selectedEmailIds: string[];
  onClose: () => void;
}

const OPERATION_TYPES: { value: OperationType; label: string }[] = [
  { value: 'new_email', label: 'New Email' },
  { value: 'reply_email', label: 'Reply Email' },
  { value: 'forward_email', label: 'Forward Email' },
  { value: 'summarize', label: 'Summarize' },
  { value: 'extract_action_items', label: 'Extract Action Items' },
  { value: 'todo', label: 'Extract Todo' },
];

const STYLE_STRATEGIES: StyleStrategy[] = [
  'Professional',
  'Casual',
  'Concise',
  'Detailed',
  'Friendly',
];

interface BatchResult {
  id: string;
  name: string;
  operationType: string;
  prompt: string;
  results: BatchTestItemResult[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    avgLatencyMs: number;
    comparedCount: number;
    improvedCount: number;
    regressedCount: number;
    avgScore: number | null;
  };
}

// 生产模型列表
const GENERATION_MODELS = {
  gemini: [
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (快速)' },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-3-flash', label: 'Gemini 3 Flash' },
    { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o (快速)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat' },
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro' },
  ],
};

// 比对模型列表（使用更高质量的模型）
const COMPARISON_MODELS = {
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (推荐)' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    { value: 'gemini-3-pro', label: 'Gemini 3 Pro' },
  ],
  openai: [
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro (推荐)' },
    { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat' },
    { value: 'o1', label: 'o1' },
  ],
};

export function BatchTestDialog({ selectedEmailIds, onClose }: BatchTestDialogProps) {
  const { aiProvider, aiModel, promptConfig } = useAppStore();
  
  const [testName, setTestName] = useState(`Batch Test ${new Date().toLocaleString('zh-CN')}`);
  const [operationType, setOperationType] = useState<OperationType>(promptConfig.operationType || 'reply_email');
  const [styleStrategy, setStyleStrategy] = useState<StyleStrategy>('Professional');
  const [userInput, setUserInput] = useState('');
  const [enableComparison, setEnableComparison] = useState(true);
  
  // 生产模型选择
  const [generationProvider, setGenerationProvider] = useState<'gemini' | 'openai'>(aiProvider);
  const [generationModel, setGenerationModel] = useState(aiModel);
  
  // 比对模型单独选择
  const [comparisonProvider, setComparisonProvider] = useState<'gemini' | 'openai'>(aiProvider);
  const [comparisonModel, setComparisonModel] = useState(
    aiProvider === 'gemini' ? 'gemini-2.5-pro' : 'gpt-5.2-pro'
  );
  
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isSavingAllGolden, setIsSavingAllGolden] = useState(false);

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
          provider: generationProvider,
          model: generationModel,
          enableComparison,
          // 比对模型配置
          comparisonProvider,
          comparisonModel,
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

  // 一键保存全部结果为基准
  const saveAllAsGolden = async () => {
    if (!result) return;
    
    const successItems = result.results.filter(item => item.success && item.output);
    if (successItems.length === 0) {
      alert('没有可保存的结果');
      return;
    }

    const confirmMsg = `确定要将 ${successItems.length} 个结果全部保存为基准吗？\n这会覆盖已有的基准结果。`;
    if (!confirm(confirmMsg)) return;

    setIsSavingAllGolden(true);
    let savedCount = 0;
    let failedCount = 0;

    for (const item of successItems) {
      try {
        const res = await fetch('/api/golden-results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailId: item.emailId,
            operationType,
            prompt: result.prompt || '',
            output: item.output,
          }),
        });

        const data = await res.json();
        if (data.success) {
          savedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('Save golden error:', error);
        failedCount++;
      }
    }

    setIsSavingAllGolden(false);
    alert(`保存完成！\n成功: ${savedCount} 个\n失败: ${failedCount} 个`);
  };

  // 保存单个结果为满意结果
  const saveAsGolden = async (item: BatchTestItemResult) => {
    if (!item.output) return;

    try {
      const res = await fetch('/api/golden-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: item.emailId,
          operationType,
          prompt: result?.prompt || '',
          output: item.output,
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('已保存为基准结果');
      } else {
        alert('保存失败: ' + data.error);
      }
    } catch (error) {
      console.error('Save golden error:', error);
      alert('保存失败');
    }
  };

  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // 评分颜色
  const getScoreColor = (score: number) => {
    if (score >= 60) return 'text-filo-success';
    if (score >= 45) return 'text-filo-warning';
    return 'text-filo-error';
  };

  // 评分图标
  const getScoreIcon = (score: number) => {
    if (score >= 55) return <TrendingUp className="w-4 h-4 text-filo-success" />;
    if (score >= 45) return <Minus className="w-4 h-4 text-filo-warning" />;
    return <TrendingDown className="w-4 h-4 text-filo-error" />;
  };

  const dialog = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="bg-filo-surface border border-filo-border rounded-xl w-full max-w-4xl overflow-hidden animate-fade-in flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-filo-border shrink-0">
          <h2 className="text-lg font-semibold">批量测试（带评分对比）</h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-filo-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-filo-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
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

              {/* AI Provider - 生成模型 */}
              <div>
                <label className="block text-sm font-medium text-filo-text-muted mb-2">
                  生成模型（生产用）
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Provider */}
                  <div>
                    <label className="block text-xs text-filo-text-muted mb-1">提供商</label>
                    <div className="relative">
                      <select
                        value={generationProvider}
                        onChange={(e) => {
                          const provider = e.target.value as 'gemini' | 'openai';
                          setGenerationProvider(provider);
                          setGenerationModel(GENERATION_MODELS[provider][0].value);
                        }}
                        className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
                      >
                        <option value="gemini">Gemini</option>
                        <option value="openai">OpenAI</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
                    </div>
                  </div>
                  
                  {/* Model */}
                  <div>
                    <label className="block text-xs text-filo-text-muted mb-1">模型</label>
                    <div className="relative">
                      <select
                        value={generationModel}
                        onChange={(e) => setGenerationModel(e.target.value)}
                        className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
                      >
                        {GENERATION_MODELS[generationProvider].map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-filo-text-muted mt-2">
                  💡 生产模型用于生成邮件内容，建议选择性价比高的模型
                </p>
              </div>

              {/* Enable Comparison */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="enableComparison"
                  checked={enableComparison}
                  onChange={(e) => setEnableComparison(e.target.checked)}
                  className="w-4 h-4 rounded border-filo-border bg-filo-bg text-filo-accent focus:ring-filo-accent"
                />
                <label htmlFor="enableComparison" className="text-sm text-filo-text cursor-pointer">
                  与满意结果对比评分（需要先保存基准结果）
                </label>
              </div>

              {/* Comparison Model - 比对模型 */}
              {enableComparison && (
                <div className="bg-filo-accent/5 border border-filo-accent/20 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-filo-accent" />
                    <span className="text-sm font-medium text-filo-text">比对模型（评估用，可选更高质量模型）</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {/* Provider */}
                    <div>
                      <label className="block text-xs text-filo-text-muted mb-1">提供商</label>
                      <div className="relative">
                        <select
                          value={comparisonProvider}
                          onChange={(e) => {
                            const provider = e.target.value as 'gemini' | 'openai';
                            setComparisonProvider(provider);
                            setComparisonModel(COMPARISON_MODELS[provider][0].value);
                          }}
                          className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
                        >
                          <option value="gemini">Gemini</option>
                          <option value="openai">OpenAI</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
                      </div>
                    </div>
                    
                    {/* Model */}
                    <div>
                      <label className="block text-xs text-filo-text-muted mb-1">模型</label>
                      <div className="relative">
                        <select
                          value={comparisonModel}
                          onChange={(e) => setComparisonModel(e.target.value)}
                          className="w-full appearance-none bg-filo-bg border border-filo-border rounded-lg py-2 px-3 pr-10 text-sm text-filo-text"
                        >
                          {COMPARISON_MODELS[comparisonProvider].map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-filo-text-muted pointer-events-none" />
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-filo-text-muted">
                    💡 比对模型用于评估生成结果与基准的差异，可选择更智能的模型以获得更准确的评分
                  </p>
                </div>
              )}

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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-filo-bg rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-text">
                    {result.summary.completed}/{result.summary.total}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">成功/总数</div>
                </div>
                
                {result.summary.avgScore !== null && (
                  <div className={cn(
                    "rounded-lg p-4 text-center",
                    result.summary.avgScore >= 55 ? "bg-filo-success/10" : 
                    result.summary.avgScore >= 45 ? "bg-filo-warning/10" : "bg-filo-error/10"
                  )}>
                    <div className={cn("text-2xl font-bold", getScoreColor(result.summary.avgScore))}>
                      {Math.round(result.summary.avgScore)}
                    </div>
                    <div className="text-xs text-filo-text-muted mt-1">平均评分</div>
                  </div>
                )}
                
                <div className="bg-filo-success/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-success">
                    {result.summary.improvedCount}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">改进</div>
                </div>
                
                <div className="bg-filo-error/10 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-filo-error">
                    {result.summary.regressedCount}
                  </div>
                  <div className="text-xs text-filo-text-muted mt-1">退步</div>
                </div>
              </div>

              {/* Results List */}
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {result.results.map((item, index) => (
                  <div
                    key={item.emailId}
                    className="bg-filo-bg border border-filo-border rounded-lg overflow-hidden"
                  >
                    {/* Item Header */}
                    <div 
                      className="p-3 flex items-center justify-between cursor-pointer hover:bg-filo-bg/80"
                      onClick={() => setExpandedItem(expandedItem === item.emailId ? null : item.emailId)}
                    >
                      <div className="flex items-center gap-3">
                        {item.success ? (
                          <CheckCircle2 className="w-4 h-4 text-filo-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-filo-error" />
                        )}
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {item.emailSubject}
                        </span>
                        {item.latencyMs && (
                          <span className="text-xs text-filo-text-muted">
                            {item.latencyMs}ms
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* 评分显示 */}
                        {item.comparison && (
                          <div className="flex items-center gap-2">
                            {getScoreIcon(item.comparison.score)}
                            <span className={cn("text-sm font-bold", getScoreColor(item.comparison.score))}>
                              {item.comparison.score}
                            </span>
                          </div>
                        )}
                        
                        {/* 无基准标记 */}
                        {!item.hasGoldenResult && (
                          <span className="text-xs text-filo-text-muted bg-filo-surface px-2 py-0.5 rounded">
                            无基准
                          </span>
                        )}

                        <ChevronDown className={cn(
                          "w-4 h-4 text-filo-text-muted transition-transform",
                          expandedItem === item.emailId && "rotate-180"
                        )} />
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {expandedItem === item.emailId && (
                      <div className="border-t border-filo-border p-4 space-y-4">
                        {item.error ? (
                          <div className="text-sm text-filo-error">{item.error}</div>
                        ) : (
                          <>
                            {/* 新输出 */}
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-medium text-filo-text-muted uppercase">
                                  新输出
                                </h4>
                                <button
                                  onClick={() => saveAsGolden(item)}
                                  className="flex items-center gap-1 text-xs text-filo-accent hover:underline"
                                >
                                  <Star className="w-3 h-3" />
                                  保存为基准
                                </button>
                              </div>
                              <pre className="text-xs bg-filo-surface p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                                {item.output}
                              </pre>
                            </div>

                            {/* 基准输出 */}
                            {item.goldenOutput && (
                              <div>
                                <h4 className="text-xs font-medium text-filo-text-muted uppercase mb-2">
                                  基准输出
                                </h4>
                                <pre className="text-xs bg-filo-surface p-3 rounded overflow-x-auto whitespace-pre-wrap max-h-32 overflow-y-auto">
                                  {item.goldenOutput}
                                </pre>
                              </div>
                            )}

                            {/* 评分详情 */}
                            {item.comparison && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-medium text-filo-text-muted uppercase">
                                  评分分析
                                </h4>
                                <p className="text-sm text-filo-text-muted">
                                  {item.comparison.reasoning}
                                </p>
                                
                                {item.comparison.improvements.length > 0 && (
                                  <div>
                                    <span className="text-xs text-filo-success">改进点:</span>
                                    <ul className="list-disc list-inside text-xs text-filo-text-muted ml-2">
                                      {item.comparison.improvements.map((imp, i) => (
                                        <li key={i}>{imp}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {item.comparison.regressions.length > 0 && (
                                  <div>
                                    <span className="text-xs text-filo-error">退步点:</span>
                                    <ul className="list-disc list-inside text-xs text-filo-text-muted ml-2">
                                      {item.comparison.regressions.map((reg, i) => (
                                        <li key={i}>{reg}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
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
            <>
              {/* 一键保存全部为基准 */}
              <button 
                onClick={saveAllAsGolden}
                disabled={isSavingAllGolden}
                className="btn-secondary flex items-center gap-2"
                title="将本次所有成功结果保存为基准（首次运行建议使用）"
              >
                {isSavingAllGolden ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {isSavingAllGolden ? '保存中...' : '全部保存为基准'}
              </button>
              <button 
                onClick={() => setResult(null)} 
                className="btn-secondary"
              >
                重新测试
              </button>
              <button onClick={onClose} className="btn-primary">
                完成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
