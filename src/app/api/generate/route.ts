import { NextRequest, NextResponse } from 'next/server';
import { callAI, getDefaultAIConfig } from '@/lib/ai-providers';
import { saveTestResult, getTestEmailById } from '@/lib/email-store';
import { getDb, generateId } from '@/lib/db';
import { replaceDynamicVariables } from '@/lib/dynamic-variables';
import { PromptTestConfig, AIProvider, TestEmail } from '@/types';

// 获取 operation 的 prompt
function getOperationPrompt(operationType: string): string {
  const db = getDb();
  const row = db.prepare(`
    SELECT prompt FROM operation_prompts WHERE operation_type = ?
  `).get(operationType) as any;
  return row?.prompt || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      config,
      threadEmailId,
      provider,
      model,
      saveResult = false,
      customSystemPrompt,  // 自定义 system prompt（已替换变量的）
      customUserMessage,   // 自定义 user message
    } = body as {
      config: PromptTestConfig;
      threadEmailId?: string;
      provider?: AIProvider;
      model?: string;
      saveResult?: boolean;
      customSystemPrompt?: string;
      customUserMessage?: string;
    };

    // 获取选中的测试邮件（如果有）
    let threadEmail: TestEmail | null = null;
    if (threadEmailId) {
      threadEmail = getTestEmailById(threadEmailId);
    }

    // 构建 system prompt：优先使用传入的 customSystemPrompt，否则从数据库获取并替换变量
    let systemPrompt = customSystemPrompt;
    
    if (!systemPrompt) {
      const savedPrompt = getOperationPrompt(config.operationType);
      if (savedPrompt) {
        systemPrompt = replaceDynamicVariables(savedPrompt, {
          email: threadEmail,
          senderName: config.senderContext.name,
          senderEmail: config.senderContext.email,
          userInput: config.userInput,
          style: config.styleStrategy,
          customInstruction: config.customInstruction,
          operationType: config.operationType,
          hasExternalSignature: config.senderContext.hasExternalSignature,
          profiles: config.profiles,
          allMails: config.allMails,
          locale: config.locale,
          category: config.category,
        });
      } else {
        return NextResponse.json(
          { success: false, error: `请先为 "${config.operationType}" 操作配置 Prompt` },
          { status: 400 }
        );
      }
    }
    
    if (!systemPrompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'System Prompt 不能为空' },
        { status: 400 }
      );
    }

    // 构建 user message：使用 customUserMessage 或 config.userInput
    const userMessage = customUserMessage || config.userInput || '';

    // 获取 AI 配置
    const defaultConfig = getDefaultAIConfig();
    const aiProvider = provider || defaultConfig.provider;
    const aiModel = model || defaultConfig.model;

    // 调用 AI，使用分离的 system/user 模式
    const aiResponse = await callAI({
      provider: aiProvider,
      model: aiModel,
      systemPrompt,
      userMessage,
    });

    // 用于展示的完整 prompt（system + user 合并显示）
    const displayPrompt = userMessage 
      ? `[System Prompt]\n${systemPrompt}\n\n[User Message]\n${userMessage}`
      : systemPrompt;

    // 可选：保存结果
    if (saveResult && threadEmailId) {
      const testResult = {
        id: generateId(),
        testEmailId: threadEmailId,
        config,
        generatedPrompt: displayPrompt,
        aiResponse,
        createdAt: new Date().toISOString(),
      };
      saveTestResult(testResult);
    }

    return NextResponse.json({
      success: true,
      data: {
        generatedPrompt: displayPrompt,
        systemPrompt,
        userMessage,
        aiResponse,
      },
    });
  } catch (error) {
    console.error('Failed to generate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate' 
      },
      { status: 500 }
    );
  }
}
