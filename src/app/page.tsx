'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Header } from '@/components/Header';
import { PromptPlayground } from '@/components/PromptPlayground';
import { TestDataView } from '@/components/TestDataView';
import { AIProvider } from '@/types';

export default function Home() {
  const { currentView, setEmails, setAIConfig, setOperationPrompts } = useAppStore();

  // 加载设置和邮件数据
  useEffect(() => {
    async function loadData() {
      try {
        // 加载 AI 设置
        const settingsRes = await fetch('/api/settings');
        const settingsResult = await settingsRes.json();
        if (settingsResult.success) {
          const { defaultProvider, geminiModel, openaiModel } = settingsResult.data;
          const provider = defaultProvider as AIProvider;
          const model = provider === 'gemini' ? geminiModel : openaiModel;
          setAIConfig(provider, model);
        }

        // 加载邮件数据
        const emailsRes = await fetch('/api/emails');
        const emailsResult = await emailsRes.json();
        if (emailsResult.success) {
          setEmails(emailsResult.data);
        }

        // 加载 Operation Prompts
        const promptsRes = await fetch('/api/operation-prompts');
        const promptsResult = await promptsRes.json();
        if (promptsResult.success) {
          setOperationPrompts(promptsResult.data);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    }
    loadData();
  }, [setEmails, setAIConfig, setOperationPrompts]);

  return (
    <main className="min-h-screen">
      <Header />
      
      <div className="pt-14 h-screen">
        {currentView === 'playground' ? (
          <PromptPlayground />
        ) : (
          <TestDataView />
        )}
      </div>
    </main>
  );
}
