// 邮件测试数据
export interface TestEmail {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc?: string;
  date: string;
  body: string;
  bodyHtml?: string;
  rawEml: string;
  fileName: string;
  createdAt: string;
  tags?: string[];
}

// 操作类型
export type OperationType = 
  | 'new_email' 
  | 'reply_email' 
  | 'forward_email' 
  | 'summarize' 
  | 'extract_action_items'
  | 'todo';  // 从邮件中提取 todo 项

// 风格策略
export type StyleStrategy = 
  | 'Professional' 
  | 'Casual' 
  | 'Concise' 
  | 'Detailed' 
  | 'Friendly';

// 每个 Operation 的 Prompt 配置
export interface OperationPrompt {
  operationType: OperationType;
  prompt: string;  // 用户自定义的 prompt，可以包含动态变量
  updatedAt: string;
}

// 动态变量定义
export interface DynamicVariable {
  name: string;        // 变量名，如 local_time
  placeholder: string; // 占位符，如 {{local_time}}
  description: string; // 描述
  example: string;     // 示例值
}

// Prompt 测试配置
export interface PromptTestConfig {
  operationType: OperationType;
  userInput: string;
  styleStrategy: StyleStrategy;
  customInstruction?: string;
  senderContext: {
    name: string;
    email?: string;
    hasExternalSignature: boolean;
  };
  threadContext?: TestEmail;
}

// AI 提供商
export type AIProvider = 'openai' | 'gemini';

// AI 请求配置
export interface AIRequestConfig {
  provider: AIProvider;
  model: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

// AI 响应
export interface AIResponse {
  output: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

// 测试结果
export interface TestResult {
  id: string;
  testEmailId: string;
  config: PromptTestConfig;
  generatedPrompt: string;
  aiResponse: AIResponse;
  humanCritique?: string;
  blameAnalysis?: BlameAnalysis;
  createdAt: string;
}

// Blame 分析
export interface BlameAnalysis {
  reasoning: string;
  problematicSections: {
    section: string;
    issue: string;
    suggestion: string;
  }[];
}

// 批量测试配置
export interface BatchTestConfig {
  name: string;
  emailIds: string[];
  promptConfig: PromptTestConfig;
  aiConfig: {
    provider: AIProvider;
    model: string;
  };
}

// 批量测试结果
export interface BatchTestResult {
  id: string;
  config: BatchTestConfig;
  results: TestResult[];
  summary: {
    total: number;
    completed: number;
    failed: number;
    avgLatencyMs: number;
  };
  createdAt: string;
}

// Prompt 模板
export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  template: string;
  variables: string[];
  createdAt: string;
  updatedAt: string;
}

// 写作工具类型
export type WritingToolType = 
  | 'expand'           // 加长
  | 'shorten'          // 精简
  | 'spell_check'      // 拼写检查
  | 'formal'           // 正式化
  | 'casual'           // 口语化
  | 'translate_zh'     // 翻译成中文
  | 'translate_en'     // 翻译成英文
  | 'custom';          // 自定义

// 写作工具配置
export interface WritingTool {
  id: WritingToolType;
  name: string;
  icon: string;
  prompt: string;
  description: string;
}
