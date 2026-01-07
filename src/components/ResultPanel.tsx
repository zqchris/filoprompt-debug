'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  MessageSquare, 
  Zap, 
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Settings,
  X,
  Check,
  Save
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { WritingToolType, GoldenResult } from '@/types';

interface WritingToolConfig {
  id: WritingToolType;
  name: string;
  icon: string;
  prompt: string;
  description: string;
}

export function ResultPanel() {
  const {
    aiResponse,
    generatedPrompt,
    humanCritique,
    setHumanCritique,
    blameAnalysis,
    setBlameAnalysis,
    isAnalyzing,
    setIsAnalyzing,
    aiProvider,
    aiModel,
    setAIResponse,
    selectedEmail,
    promptConfig,
    operationPrompts,
  } = useAppStore();

  const [showReasoning, setShowReasoning] = useState(true);
  const [writingTools, setWritingTools] = useState<WritingToolConfig[]>([]);
  const [applyingTool, setApplyingTool] = useState<WritingToolType | null>(null);
  const [showToolConfig, setShowToolConfig] = useState(false);
  const [editingTool, setEditingTool] = useState<WritingToolConfig | null>(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // 满意结果相关状态
  const [savingGolden, setSavingGolden] = useState(false);
  const [savedGolden, setSavedGolden] = useState(false);
  const [goldenResult, setGoldenResult] = useState<GoldenResult | null>(null);
  const [goldenNotes, setGoldenNotes] = useState('');

  useEffect(() => {
    setMounted(true);
    loadWritingTools();
  }, []);

  // 加载当前邮件+操作的满意结果
  useEffect(() => {
    if (selectedEmail && promptConfig.operationType) {
      loadGoldenResult();
    } else {
      setGoldenResult(null);
    }
  }, [selectedEmail?.id, promptConfig.operationType]);

  const loadGoldenResult = async () => {
    if (!selectedEmail) return;
    try {
      const res = await fetch(
        `/api/golden-results?emailId=${selectedEmail.id}&operationType=${promptConfig.operationType}`
      );
      const result = await res.json();
      if (result.success && result.data.length > 0) {
        setGoldenResult(result.data[0]);
      } else {
        setGoldenResult(null);
      }
    } catch (error) {
      console.error('Failed to load golden result:', error);
    }
  };

  const saveAsGoldenResult = async () => {
    if (!selectedEmail || !aiResponse?.output) return;

    setSavingGolden(true);
    try {
      const currentPrompt = operationPrompts[promptConfig.operationType] || '';
      const res = await fetch('/api/golden-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: selectedEmail.id,
          operationType: promptConfig.operationType,
          prompt: currentPrompt,
          output: aiResponse.output,
          notes: goldenNotes || undefined,
        }),
      });

      const result = await res.json();
      if (result.success) {
        setGoldenResult(result.data);
        setSavedGolden(true);
        setTimeout(() => setSavedGolden(false), 2000);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      console.error('Save golden result error:', error);
      alert('保存失败');
    } finally {
      setSavingGolden(false);
    }
  };

  const loadWritingTools = async () => {
    try {
      const res = await fetch('/api/writing-tools');
      const result = await res.json();
      if (result.success) {
        setWritingTools(result.data);
      }
    } catch (error) {
      console.error('Failed to load writing tools:', error);
    }
  };

  const applyTool = async (toolId: WritingToolType) => {
    if (!aiResponse?.output) return;

    setApplyingTool(toolId);
    try {
      const res = await fetch('/api/writing-tools/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId,
          content: aiResponse.output,
          provider: aiProvider,
          model: aiModel,
        }),
      });

      const result = await res.json();
      if (result.success) {
        // 更新 AI 响应
        setAIResponse({
          ...aiResponse,
          output: result.data.output,
          usage: result.data.usage || aiResponse.usage,
          latencyMs: result.data.latencyMs,
        });
      } else {
        alert('应用失败: ' + result.error);
      }
    } catch (error) {
      console.error('Apply tool error:', error);
      alert('应用失败');
    } finally {
      setApplyingTool(null);
    }
  };

  const startEditTool = (tool: WritingToolConfig) => {
    setEditingTool(tool);
    setEditPrompt(tool.prompt);
    setShowToolConfig(true);
  };

  const saveToolPrompt = async () => {
    if (!editingTool) return;

    setSaving(true);
    try {
      const res = await fetch('/api/writing-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: editingTool.id,
          prompt: editPrompt,
        }),
      });

      const result = await res.json();
      if (result.success) {
        // 更新本地状态
        setWritingTools(prev => 
          prev.map(t => t.id === editingTool.id ? { ...t, prompt: editPrompt } : t)
        );
        setShowToolConfig(false);
        setEditingTool(null);
      } else {
        alert('保存失败: ' + result.error);
      }
    } catch (error) {
      console.error('Save tool error:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleBlamePrompt = async () => {
    if (!humanCritique.trim() || !aiResponse) return;

    setIsAnalyzing(true);

    try {
      const response = await fetch('/api/blame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalPrompt: generatedPrompt,
          aiOutput: aiResponse.output,
          humanCritique,
          provider: aiProvider,
          model: aiModel,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setBlameAnalysis(result.data.blameAnalysis);
      } else {
        console.error('Blame analysis failed:', result.error);
      }
    } catch (error) {
      console.error('Blame analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* AI Output */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-filo-border">
          <FileText className="w-4 h-4 text-filo-text-muted" />
          <span className="text-sm font-medium">Result & Attribution</span>
        </div>

        <div className="p-4">
          {aiResponse ? (
            <div className="space-y-3">
              <div className="text-xs text-filo-text-muted">
                {aiResponse.provider === 'gemini' ? 'Gemini' : 'OpenAI'} Output
                <span className="ml-2 text-filo-accent">
                  {aiResponse.latencyMs}ms
                </span>
              </div>
              <div className="bg-filo-bg border border-filo-border rounded-lg p-4">
                <pre className="code-block text-sm text-filo-text whitespace-pre-wrap">
                  {aiResponse.output}
                </pre>
              </div>
              {aiResponse.usage && (
                <div className="text-xs text-filo-text-muted">
                  Tokens: {aiResponse.usage.promptTokens} prompt + {aiResponse.usage.completionTokens} completion = {aiResponse.usage.totalTokens} total
                </div>
              )}

              {/* 写作工具 */}
              <div className="pt-3 border-t border-filo-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-filo-text-muted uppercase tracking-wide">
                    Writing Tools
                  </span>
                  <button
                    onClick={() => setShowToolConfig(true)}
                    className="p-1 hover:bg-filo-bg rounded transition-colors"
                    title="配置工具"
                  >
                    <Settings className="w-3.5 h-3.5 text-filo-text-muted" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {writingTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => applyTool(tool.id)}
                      disabled={applyingTool !== null}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-lg border transition-all flex items-center gap-1.5",
                        applyingTool === tool.id
                          ? "bg-filo-accent/20 border-filo-accent text-filo-accent"
                          : "bg-filo-bg border-filo-border hover:border-filo-accent/50 text-filo-text-muted hover:text-filo-text"
                      )}
                      title={tool.description}
                    >
                      {applyingTool === tool.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <span>{tool.icon}</span>
                      )}
                      {tool.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 保存为满意结果 */}
              {selectedEmail && (
                <div className="pt-3 border-t border-filo-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-filo-text-muted uppercase tracking-wide">
                      Golden Result
                    </span>
                    {goldenResult && (
                      <span className="text-xs text-filo-success">
                        ✓ 已保存基准
                      </span>
                    )}
                  </div>
                  
                  {goldenResult ? (
                    <div className="text-xs text-filo-text-muted mb-2 p-2 bg-filo-bg rounded">
                      <p>当前基准结果保存于 {new Date(goldenResult.updatedAt).toLocaleString()}</p>
                      {goldenResult.notes && <p className="mt-1">备注: {goldenResult.notes}</p>}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={goldenNotes}
                      onChange={(e) => setGoldenNotes(e.target.value)}
                      placeholder="备注（可选）"
                      className="flex-1 text-xs bg-filo-bg border border-filo-border rounded px-2 py-1.5"
                    />
                    <button
                      onClick={saveAsGoldenResult}
                      disabled={savingGolden}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-lg flex items-center gap-1.5 transition-all",
                        savedGolden
                          ? "bg-filo-success/20 text-filo-success"
                          : "bg-filo-accent/20 text-filo-accent hover:bg-filo-accent/30"
                      )}
                    >
                      {savingGolden ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : savedGolden ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      {goldenResult ? '更新基准' : '保存为基准'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-filo-text-muted">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">点击 "Generate Output" 生成结果</p>
            </div>
          )}
        </div>
      </div>

      {/* Human Critique */}
      {aiResponse && (
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-filo-border">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-filo-text-muted" />
              <span className="text-sm font-medium">Human Critique</span>
            </div>
            {blameAnalysis && (
              <span className="px-2 py-0.5 text-xs bg-filo-warning/20 text-filo-warning rounded">
                Analyzed
              </span>
            )}
          </div>

          <div className="p-4 space-y-3">
            <textarea
              value={humanCritique}
              onChange={(e) => setHumanCritique(e.target.value)}
              placeholder="输入你对 AI 输出的批评意见，例如：太长了、语气不对、缺少关键信息等..."
              className="w-full h-24 bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50 resize-none"
            />
            
            <button
              onClick={handleBlamePrompt}
              disabled={isAnalyzing || !humanCritique.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-filo-warning/20 hover:bg-filo-warning/30 disabled:opacity-50 disabled:cursor-not-allowed text-filo-warning text-sm font-medium rounded-lg transition-colors"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Blame Prompt
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Blame Analysis */}
      {blameAnalysis && (
        <div className="card overflow-hidden animate-fade-in">
          <div 
            className="flex items-center justify-between px-4 py-3 border-b border-filo-border cursor-pointer"
            onClick={() => setShowReasoning(!showReasoning)}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-filo-error" />
              <span className="text-sm font-medium text-filo-error">AI Reasoning</span>
            </div>
            {showReasoning ? (
              <ChevronUp className="w-4 h-4 text-filo-text-muted" />
            ) : (
              <ChevronDown className="w-4 h-4 text-filo-text-muted" />
            )}
          </div>

          {showReasoning && (
            <div className="p-4 space-y-4">
              {/* Reasoning */}
              <div className="text-sm text-filo-text-muted leading-relaxed">
                {blameAnalysis.reasoning}
              </div>

              {/* Problematic Sections */}
              {blameAnalysis.problematicSections?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-medium text-filo-text-muted uppercase tracking-wide">
                    问题部分
                  </h4>
                  {blameAnalysis.problematicSections.map((section, index) => (
                    <div
                      key={index}
                      className="bg-filo-bg border border-filo-error/30 rounded-lg p-3 space-y-2"
                    >
                      <div className="text-xs text-filo-error font-medium">
                        {section.section}
                      </div>
                      <div className="text-sm text-filo-text-muted">
                        <span className="text-filo-warning">问题:</span> {section.issue}
                      </div>
                      <div className="text-sm text-filo-text-muted">
                        <span className="text-filo-success">建议:</span> {section.suggestion}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 写作工具配置对话框 */}
      {mounted && showToolConfig && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowToolConfig(false);
              setEditingTool(null);
            }}
          />
          <div className="relative bg-filo-card border border-filo-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-filo-border">
              <h2 className="text-lg font-semibold">
                {editingTool ? `编辑工具: ${editingTool.icon} ${editingTool.name}` : '写作工具配置'}
              </h2>
              <button
                onClick={() => {
                  setShowToolConfig(false);
                  setEditingTool(null);
                }}
                className="p-2 hover:bg-filo-bg rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {editingTool ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-filo-text-muted mb-2 block">
                      工具 Prompt
                    </label>
                    <p className="text-xs text-filo-text-muted mb-2">
                      使用 <code className="text-filo-accent">{'{{content}}'}</code> 表示要处理的内容
                    </p>
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="w-full h-64 bg-filo-bg border border-filo-border rounded-lg p-3 text-sm font-mono resize-none"
                      placeholder="输入工具的 Prompt..."
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={saveToolPrompt}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-filo-accent hover:bg-filo-accent-hover text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      {saving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      保存
                    </button>
                    <button
                      onClick={() => setEditingTool(null)}
                      className="px-4 py-2 text-filo-text-muted hover:text-filo-text transition-colors"
                    >
                      返回列表
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-filo-text-muted mb-4">
                    点击工具可编辑其 Prompt，自定义处理方式
                  </p>
                  {writingTools.map((tool) => (
                    <button
                      key={tool.id}
                      onClick={() => startEditTool(tool)}
                      className="w-full p-4 bg-filo-bg border border-filo-border rounded-lg hover:border-filo-accent/50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{tool.icon}</span>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-filo-text">{tool.name}</h3>
                          <p className="text-xs text-filo-text-muted mt-0.5">{tool.description}</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-filo-text-muted rotate-[-90deg]" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
