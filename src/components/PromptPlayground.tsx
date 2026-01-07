'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { ConfigPanel } from './ConfigPanel';
import { PromptPreview } from './PromptPreview';
import { ResultPanel } from './ResultPanel';
import { Sparkles, Loader2 } from 'lucide-react';
import { buildFinalPrompt } from '@/lib/dynamic-variables';

export function PromptPlayground() {
  const {
    promptConfig,
    selectedEmail,
    aiProvider,
    aiModel,
    operationPrompts,
    setGeneratedPrompt,
    setAIResponse,
    isGenerating,
    setIsGenerating,
    setBlameAnalysis,
    setHumanCritique,
  } = useAppStore();

  // 获取当前 operation 的 prompt
  const currentPrompt = operationPrompts[promptConfig.operationType] || '';

  const handleGenerate = async () => {
    if (!currentPrompt.trim()) {
      alert(`请先为 "${promptConfig.operationType}" 操作配置 Prompt`);
      return;
    }

    setIsGenerating(true);
    setBlameAnalysis(null);
    setHumanCritique('');

    // 构建最终 prompt（替换变量 + 自动附加邮件上下文）
    const processedPrompt = buildFinalPrompt(currentPrompt, {
      email: selectedEmail,
      senderName: promptConfig.senderContext.name,
      senderEmail: promptConfig.senderContext.email,
      userInput: promptConfig.userInput,
      style: promptConfig.styleStrategy,
      customInstruction: promptConfig.customInstruction,
      operationType: promptConfig.operationType,
      hasExternalSignature: promptConfig.senderContext.hasExternalSignature,
    });

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: promptConfig,
          threadEmailId: selectedEmail?.id,
          provider: aiProvider,
          model: aiModel,
          customPrompt: processedPrompt,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setGeneratedPrompt(result.data.generatedPrompt);
        setAIResponse(result.data.aiResponse);
      } else {
        console.error('Generation failed:', result.error);
        alert(`生成失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('生成失败，请检查控制台');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* 三列布局 */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
        {/* 左侧：配置面板 */}
        <div className="col-span-3 overflow-y-auto">
          <ConfigPanel />
        </div>

        {/* 中间：Prompt 预览 */}
        <div className="col-span-5 flex flex-col overflow-hidden">
          <PromptPreview />
          
          {/* 生成按钮 */}
          <div className="mt-4 flex justify-center">
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !currentPrompt.trim()}
              className="flex items-center gap-2 px-6 py-3 bg-filo-accent hover:bg-filo-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all shadow-lg shadow-filo-accent/20"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Output
                </>
              )}
            </button>
          </div>
        </div>

        {/* 右侧：结果面板 */}
        <div className="col-span-4 overflow-y-auto">
          <ResultPanel />
        </div>
      </div>
    </div>
  );
}
