import { create } from 'zustand';
import { 
  TestEmail, 
  PromptTestConfig, 
  AIResponse, 
  BlameAnalysis,
  AIProvider,
  OperationType,
  StyleStrategy,
  OperationPrompt,
} from '@/types';

interface AppState {
  // 当前选中的邮件
  selectedEmail: TestEmail | null;
  setSelectedEmail: (email: TestEmail | null) => void;

  // Prompt 配置
  promptConfig: PromptTestConfig;
  setPromptConfig: (config: Partial<PromptTestConfig>) => void;
  resetPromptConfig: () => void;

  // 每个 Operation 的 Prompt 配置（包括 system prompt 和 user message）
  operationPrompts: Record<OperationType, string>;
  operationUserMessages: Record<OperationType, string>;
  setOperationPrompt: (operationType: OperationType, prompt: string, userMessage?: string) => void;
  setOperationPrompts: (prompts: OperationPrompt[]) => void;

  // 自定义 Prompt 模板（兼容旧版）
  customPromptTemplate: string;
  setCustomPromptTemplate: (template: string) => void;

  // AI 配置
  aiProvider: AIProvider;
  aiModel: string;
  setAIConfig: (provider: AIProvider, model: string) => void;

  // 生成结果
  generatedPrompt: string;
  aiResponse: AIResponse | null;
  isGenerating: boolean;
  setGeneratedPrompt: (prompt: string) => void;
  setAIResponse: (response: AIResponse | null) => void;
  setIsGenerating: (loading: boolean) => void;

  // Blame 分析
  humanCritique: string;
  blameAnalysis: BlameAnalysis | null;
  isAnalyzing: boolean;
  setHumanCritique: (critique: string) => void;
  setBlameAnalysis: (analysis: BlameAnalysis | null) => void;
  setIsAnalyzing: (loading: boolean) => void;

  // 邮件列表
  emails: TestEmail[];
  setEmails: (emails: TestEmail[]) => void;
  addEmails: (emails: TestEmail[]) => void;
  removeEmail: (id: string) => void;

  // 当前视图
  currentView: 'playground' | 'testdata';
  setCurrentView: (view: 'playground' | 'testdata') => void;
}

const defaultPromptConfig: PromptTestConfig = {
  operationType: 'new_email' as OperationType,
  userInput: '',
  styleStrategy: 'Professional' as StyleStrategy,
  customInstruction: '',
  senderContext: {
    name: '',
    email: '',
    hasExternalSignature: false,
  },
  // 模拟用户口吻的变量
  allMails: '',
  locale: 'en-US',
  category: '',
  profiles: '',
};

const defaultOperationPrompts: Record<OperationType, string> = {
  new_email: '',
  reply_email: '',
  forward_email: '',
  summarize: '',
  extract_action_items: '',
  todo: '',
};

const defaultOperationUserMessages: Record<OperationType, string> = {
  new_email: '',
  reply_email: '',
  forward_email: '',
  summarize: '',
  extract_action_items: '',
  todo: '',
};

export const useAppStore = create<AppState>((set) => ({
  // 当前选中的邮件
  selectedEmail: null,
  setSelectedEmail: (email) => set({ selectedEmail: email }),

  // Prompt 配置
  promptConfig: defaultPromptConfig,
  setPromptConfig: (config) =>
    set((state) => ({
      promptConfig: { ...state.promptConfig, ...config },
    })),
  resetPromptConfig: () => set({ promptConfig: defaultPromptConfig }),

  // 每个 Operation 的 Prompt 配置（包括 system prompt 和 user message）
  operationPrompts: defaultOperationPrompts,
  operationUserMessages: defaultOperationUserMessages,
  setOperationPrompt: (operationType, prompt, userMessage) =>
    set((state) => ({
      operationPrompts: { ...state.operationPrompts, [operationType]: prompt },
      operationUserMessages: userMessage !== undefined 
        ? { ...state.operationUserMessages, [operationType]: userMessage }
        : state.operationUserMessages,
    })),
  setOperationPrompts: (prompts) =>
    set((state) => {
      const newPrompts = { ...state.operationPrompts };
      const newUserMessages = { ...state.operationUserMessages };
      prompts.forEach((p) => {
        newPrompts[p.operationType] = p.prompt;
        newUserMessages[p.operationType] = p.userMessage || '';
      });
      return { operationPrompts: newPrompts, operationUserMessages: newUserMessages };
    }),

  // 自定义 Prompt 模板（兼容旧版）
  customPromptTemplate: '',
  setCustomPromptTemplate: (template) => set({ customPromptTemplate: template }),

  // AI 配置
  aiProvider: 'gemini',
  aiModel: 'gemini-2.5-flash',
  setAIConfig: (provider, model) => set({ aiProvider: provider, aiModel: model }),

  // 生成结果
  generatedPrompt: '',
  aiResponse: null,
  isGenerating: false,
  setGeneratedPrompt: (prompt) => set({ generatedPrompt: prompt }),
  setAIResponse: (response) => set({ aiResponse: response }),
  setIsGenerating: (loading) => set({ isGenerating: loading }),

  // Blame 分析
  humanCritique: '',
  blameAnalysis: null,
  isAnalyzing: false,
  setHumanCritique: (critique) => set({ humanCritique: critique }),
  setBlameAnalysis: (analysis) => set({ blameAnalysis: analysis }),
  setIsAnalyzing: (loading) => set({ isAnalyzing: loading }),

  // 邮件列表
  emails: [],
  setEmails: (emails) => set({ emails }),
  addEmails: (newEmails) =>
    set((state) => ({ emails: [...newEmails, ...state.emails] })),
  removeEmail: (id) =>
    set((state) => ({ emails: state.emails.filter((e) => e.id !== id) })),

  // 当前视图
  currentView: 'playground',
  setCurrentView: (view) => set({ currentView: view }),
}));
