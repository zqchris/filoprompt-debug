'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Save, Loader2, Key, AlertCircle } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { AIProvider } from '@/types';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { setAIConfig } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [openaiKeyConfigured, setOpenaiKeyConfigured] = useState(false);
  const [googleKeyConfigured, setGoogleKeyConfigured] = useState(false);
  const [defaultProvider, setDefaultProvider] = useState('gemini');
  const [openaiModel, setOpenaiModel] = useState('gpt-5.2-chat-latest');
  const [geminiModel, setGeminiModel] = useState('gemini-2.5-flash');

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      const result = await response.json();
      if (result.success) {
        // API Key 字段保持空白，让用户输入新值
        setOpenaiApiKey('');
        setGoogleApiKey('');
        // 记录是否已配置
        setOpenaiKeyConfigured(result.data.openaiKeyConfigured);
        setGoogleKeyConfigured(result.data.googleKeyConfigured);
        setDefaultProvider(result.data.defaultProvider);
        setOpenaiModel(result.data.openaiModel);
        setGeminiModel(result.data.geminiModel);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          openaiApiKey,
          googleApiKey,
          defaultProvider,
          openaiModel,
          geminiModel,
        }),
      });

      const result = await response.json();
      if (result.success) {
        // 立即更新 store 中的 AI 配置
        const provider = defaultProvider as AIProvider;
        const model = provider === 'gemini' ? geminiModel : openaiModel;
        setAIConfig(provider, model);
        
        setMessage({ 
          type: 'success', 
          text: '设置已保存并生效！' 
        });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '保存失败' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const dialog = (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div 
        className="bg-filo-surface border border-filo-border rounded-xl w-full max-w-lg overflow-hidden animate-fade-in flex flex-col"
        style={{ maxHeight: 'calc(100vh - 2rem)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-filo-border shrink-0">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-filo-accent" />
            <h2 className="text-lg font-semibold">API 设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-filo-bg rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-filo-text-muted" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-filo-text-muted" />
            </div>
          ) : (
            <>
              {/* Google AI API Key */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-filo-text">
                    Google AI API Key (Gemini)
                  </label>
                  {googleKeyConfigured && (
                    <span className="text-xs px-2 py-0.5 bg-filo-success/20 text-filo-success rounded">
                      ✓ 已配置
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={googleApiKey}
                  onChange={(e) => setGoogleApiKey(e.target.value)}
                  className="w-full bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50"
                  placeholder={googleKeyConfigured ? "留空保持不变，或输入新 Key" : "输入 Google AI API Key"}
                />
                <p className="mt-1 text-xs text-filo-text-muted">
                  获取地址：
                  <a 
                    href="https://aistudio.google.com/apikey" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-filo-accent hover:underline ml-1"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* OpenAI API Key */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-filo-text">
                    OpenAI API Key
                  </label>
                  {openaiKeyConfigured && (
                    <span className="text-xs px-2 py-0.5 bg-filo-success/20 text-filo-success rounded">
                      ✓ 已配置
                    </span>
                  )}
                </div>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  className="w-full bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 text-sm text-filo-text placeholder:text-filo-text-muted/50"
                  placeholder={openaiKeyConfigured ? "留空保持不变，或输入新 Key" : "输入 OpenAI API Key (sk-...)"}
                />
                <p className="mt-1 text-xs text-filo-text-muted">
                  获取地址：
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-filo-accent hover:underline ml-1"
                  >
                    OpenAI Platform
                  </a>
                </p>
              </div>

              {/* Default Provider */}
              <div>
                <label className="block text-sm font-medium text-filo-text mb-2">
                  默认 AI 提供商
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDefaultProvider('gemini')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      defaultProvider === 'gemini'
                        ? 'bg-filo-accent text-white'
                        : 'bg-filo-bg border border-filo-border text-filo-text-muted hover:text-filo-text'
                    }`}
                  >
                    Gemini
                  </button>
                  <button
                    onClick={() => setDefaultProvider('openai')}
                    className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                      defaultProvider === 'openai'
                        ? 'bg-filo-accent text-white'
                        : 'bg-filo-bg border border-filo-border text-filo-text-muted hover:text-filo-text'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>
              </div>

              {/* Models */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-filo-text mb-2">
                    Gemini 模型
                  </label>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="w-full bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 text-sm text-filo-text"
                  >
                    <optgroup label="Gemini 3 (最新)">
                      <option value="gemini-3-flash-preview">gemini-3-flash-preview</option>
                      <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
                    </optgroup>
                    <optgroup label="Gemini 2.5">
                      <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    </optgroup>
                    <optgroup label="Gemini 2.0">
                      <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                      <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-filo-text mb-2">
                    OpenAI 模型
                  </label>
                  <select
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                    className="w-full bg-filo-bg border border-filo-border rounded-lg py-2.5 px-3 text-sm text-filo-text"
                  >
                    <optgroup label="GPT-5.2 (最新)">
                      <option value="gpt-5.2-chat-latest">gpt-5.2-chat-latest</option>
                      <option value="gpt-5.2-pro">gpt-5.2-pro</option>
                      <option value="gpt-5.2-pro-2025-12-11">gpt-5.2-pro-2025-12-11</option>
                    </optgroup>
                    <optgroup label="GPT-5.1 Codex">
                      <option value="gpt-5.1-codex">gpt-5.1-codex</option>
                      <option value="gpt-5.1-codex-mini">gpt-5.1-codex-mini</option>
                      <option value="gpt-5.1-codex-max">gpt-5.1-codex-max</option>
                    </optgroup>
                    <optgroup label="GPT-4o">
                      <option value="gpt-4o">gpt-4o</option>
                      <option value="gpt-4o-mini">gpt-4o-mini</option>
                    </optgroup>
                    <optgroup label="o1 推理模型">
                      <option value="o1">o1</option>
                      <option value="o1-mini">o1-mini</option>
                    </optgroup>
                  </select>
                </div>
              </div>

              {/* Message */}
              {message && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  message.type === 'success' 
                    ? 'bg-filo-success/10 text-filo-success' 
                    : 'bg-filo-error/10 text-filo-error'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                  {message.text}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-filo-border shrink-0">
          <button onClick={onClose} className="btn-secondary">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                保存设置
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
