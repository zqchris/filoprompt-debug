/**
 * 统一的 AI 模型配置
 * 所有模型选择都从这里获取，避免重复和不一致
 */

export type AIProvider = 'gemini' | 'openai';

export interface ModelOption {
  value: string;
  label: string;
  tier: 'fast' | 'balanced' | 'premium';  // 性能层级
  description?: string;
}

// =====================
// Gemini 模型列表
// =====================
export const GEMINI_MODELS: ModelOption[] = [
  // Gemini 3 系列（最新）
  { value: 'gemini-3-flash', label: 'Gemini 3 Flash', tier: 'fast', description: '最新快速模型' },
  { value: 'gemini-3-pro', label: 'Gemini 3 Pro', tier: 'premium', description: '最新高级模型' },
  // 2.5 系列
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tier: 'fast', description: '快速、高性价比' },
  { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'balanced', description: '均衡性能' },
  // 2.0 系列
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', tier: 'fast' },
];

// =====================
// OpenAI 模型列表
// =====================
export const OPENAI_MODELS: ModelOption[] = [
  // GPT-5.2 系列（最新）
  { value: 'gpt-5.2-chat-latest', label: 'GPT-5.2 Chat', tier: 'balanced', description: '最新对话模型' },
  { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro', tier: 'premium', description: '最新高级模型' },
  // GPT-4o 系列
  { value: 'gpt-4o', label: 'GPT-4o', tier: 'balanced', description: '均衡性能' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', tier: 'fast', description: '快速、低成本' },
  // o1 系列（推理能力强）
  { value: 'o1', label: 'o1', tier: 'premium', description: '强推理能力' },
  { value: 'o1-mini', label: 'o1 Mini', tier: 'balanced' },
];

// =====================
// 按用途分类的模型列表
// =====================

// 生成模型（生产用，注重性价比）
export const GENERATION_MODELS = {
  gemini: GEMINI_MODELS.filter(m => m.tier !== 'premium'),
  openai: OPENAI_MODELS.filter(m => m.tier !== 'premium'),
};

// 比对/评估模型（可用更高质量）
export const COMPARISON_MODELS = {
  gemini: [
    { value: 'gemini-3-pro', label: 'Gemini 3 Pro (推荐)', tier: 'premium' as const },
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'balanced' as const },
  ],
  openai: [
    { value: 'gpt-5.2-pro', label: 'GPT-5.2 Pro (推荐)', tier: 'premium' as const },
    { value: 'o1', label: 'o1 (最强推理)', tier: 'premium' as const },
    { value: 'gpt-4o', label: 'GPT-4o', tier: 'balanced' as const },
  ],
};

// 全部可用模型（用于设置）
export const ALL_MODELS = {
  gemini: GEMINI_MODELS,
  openai: OPENAI_MODELS,
};

// =====================
// 默认模型（生产用，考虑性价比）
// =====================
export const DEFAULT_MODELS = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o',
};

// 默认比对模型（评估用，可用更高质量）
export const DEFAULT_COMPARISON_MODELS = {
  gemini: 'gemini-3-pro',
  openai: 'gpt-5.2-pro',
};

// =====================
// 辅助函数
// =====================

/**
 * 获取模型显示名称
 */
export function getModelLabel(provider: AIProvider, modelValue: string): string {
  const models = ALL_MODELS[provider];
  const model = models.find(m => m.value === modelValue);
  return model?.label || modelValue;
}

/**
 * 检查模型是否有效
 */
export function isValidModel(provider: AIProvider, modelValue: string): boolean {
  const models = ALL_MODELS[provider];
  return models.some(m => m.value === modelValue);
}

/**
 * 获取模型类型（用于 API 参数调整）
 * - gpt5: GPT-5.x 系列，不支持 temperature，使用 max_completion_tokens
 * - o1: o1/o3 推理模型，不支持 temperature，使用 max_completion_tokens  
 * - gpt4: GPT-4.x 系列，支持所有传统参数
 * - gemini: Gemini 系列
 * - legacy: 其他旧版模型
 */
export type ModelType = 'gpt5' | 'gpt4' | 'o1' | 'gemini' | 'legacy';

export function getModelType(model: string): ModelType {
  if (model.startsWith('gpt-5')) return 'gpt5';
  if (model.startsWith('o1') || model.startsWith('o3')) return 'o1';
  if (model.startsWith('gpt-4')) return 'gpt4';
  if (model.startsWith('gemini')) return 'gemini';
  return 'legacy';
}
