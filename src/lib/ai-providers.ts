import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AIRequestConfig, AIResponse, AIProvider } from '@/types';

// OpenAI 客户端
function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey });
}

// Google AI 客户端
function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not set');
  }
  return new GoogleGenerativeAI(apiKey);
}

// 获取模型类型
type ModelType = 'gpt5' | 'o1' | 'gpt4' | 'legacy';

function getModelType(model: string): ModelType {
  if (model.startsWith('gpt-5')) return 'gpt5';
  if (model.startsWith('o1') || model.startsWith('o3')) return 'o1';
  if (model.startsWith('gpt-4')) return 'gpt4';
  return 'legacy';
}

// 调用 OpenAI
async function callOpenAI(config: AIRequestConfig): Promise<AIResponse> {
  const client = getOpenAIClient();
  const startTime = Date.now();
  const model = config.model || 'gpt-5.2-chat-latest';
  const modelType = getModelType(model);

  // 构建 messages 数组
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
  
  // 如果有 systemPrompt + userMessage，使用分离模式
  if (config.systemPrompt || config.userMessage) {
    if (config.systemPrompt) {
      messages.push({ role: 'system', content: config.systemPrompt });
    }
    messages.push({ role: 'user', content: config.userMessage || '' });
  } else {
    // 向后兼容：单 prompt 模式
    messages.push({ role: 'user', content: config.prompt || '' });
  }

  // 基础参数
  const requestParams: any = {
    model,
    messages,
  };

  // 根据模型类型设置参数
  switch (modelType) {
    case 'gpt5':
      // GPT-5.x: 使用 max_completion_tokens，不支持自定义 temperature
      requestParams.max_completion_tokens = config.maxTokens ?? 16384;
      // 不设置 temperature，使用默认值 1
      break;
    
    case 'o1':
      // o1/o3 推理模型: 只需要 max_completion_tokens，不支持 temperature
      requestParams.max_completion_tokens = config.maxTokens ?? 16384;
      break;
    
    case 'gpt4':
      // GPT-4.x: 支持所有传统参数
      requestParams.max_tokens = config.maxTokens ?? 4096;
      requestParams.temperature = config.temperature ?? 0.7;
      break;
    
    default:
      // 旧版模型
      requestParams.max_tokens = config.maxTokens ?? 4096;
      requestParams.temperature = config.temperature ?? 0.7;
  }

  const response = await client.chat.completions.create(requestParams);

  const latencyMs = Date.now() - startTime;

  return {
    output: response.choices[0]?.message?.content || '',
    model,
    provider: 'openai',
    usage: response.usage
      ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        }
      : undefined,
    latencyMs,
  };
}

// 调用 Gemini
async function callGemini(config: AIRequestConfig): Promise<AIResponse> {
  const client = getGeminiClient();
  const startTime = Date.now();

  // Gemini 支持 systemInstruction 作为 system prompt
  // 参考: https://ai.google.dev/gemini-api/docs/system-instructions
  const modelConfig: any = {
    model: config.model || 'gemini-2.5-flash',
  };
  
  // 如果有 systemPrompt，使用 systemInstruction
  if (config.systemPrompt) {
    modelConfig.systemInstruction = config.systemPrompt;
  }
  
  // Gemini 3 thinking 模式配置
  // 设置为 false 关闭 thinking 模式，减少延迟和 token 消耗
  const isGemini3 = config.model?.includes('gemini-3');
  if (isGemini3) {
    modelConfig.generationConfig = {
      ...modelConfig.generationConfig,
      // 关闭 thinking 模式
      thinkingConfig: {
        thinkingBudget: 0,  // 0 = 关闭 thinking
      },
    };
  }

  const model = client.getGenerativeModel(modelConfig);

  // 确定用户消息内容
  const userContent = config.userMessage || config.prompt || '';
  
  const result = await model.generateContent(userContent);
  const response = result.response;
  const text = response.text();

  const latencyMs = Date.now() - startTime;

  return {
    output: text,
    model: config.model,
    provider: 'gemini',
    usage: response.usageMetadata
      ? {
          promptTokens: response.usageMetadata.promptTokenCount || 0,
          completionTokens: response.usageMetadata.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata.totalTokenCount || 0,
        }
      : undefined,
    latencyMs,
  };
}

// 统一调用接口
export async function callAI(config: AIRequestConfig): Promise<AIResponse> {
  switch (config.provider) {
    case 'openai':
      return callOpenAI(config);
    case 'gemini':
      return callGemini(config);
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

// 验证过可用的模型列表
export function getAvailableModels(provider: AIProvider): string[] {
  switch (provider) {
    case 'openai':
      return [
        'gpt-5.2-chat-latest', 'gpt-5.2-pro', 'gpt-5.2-pro-2025-12-11',  // GPT-5.2 最新
        'gpt-5.1-codex', 'gpt-5.1-codex-mini', 'gpt-5.1-codex-max',  // GPT-5.1 Codex
        'gpt-4o', 'gpt-4o-mini',  // GPT-4o
        'o1', 'o1-mini',  // o1 推理模型
      ];
    case 'gemini':
      return [
        'gemini-3-flash-preview', 'gemini-3-pro-preview',  // Gemini 3 最新
        'gemini-2.5-flash', 'gemini-2.5-pro',  // Gemini 2.5
        'gemini-2.0-flash', 'gemini-2.0-flash-lite',  // Gemini 2.0
      ];
    default:
      return [];
  }
}

// 默认配置
export function getDefaultAIConfig(): { provider: AIProvider; model: string } {
  const provider = (process.env.DEFAULT_AI_PROVIDER as AIProvider) || 'gemini';
  const model =
    provider === 'openai'
      ? process.env.OPENAI_MODEL || 'gpt-5.2-chat-latest'
      : process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  
  return { provider, model };
}
