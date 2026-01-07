import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_FILE_PATH = path.join(process.cwd(), '.env.local');

// 从文件读取配置
function readEnvFile(): Map<string, string> {
  const envMap = new Map<string, string>();
  
  if (fs.existsSync(ENV_FILE_PATH)) {
    const envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    const envLines = envContent.split('\n');
    
    for (const line of envLines) {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=').trim();
        if (key.trim() && value) {
          envMap.set(key.trim(), value);
        }
      }
    }
  }
  
  return envMap;
}

// GET /api/settings - 获取当前设置
export async function GET() {
  try {
    // 从文件读取实际配置
    const envMap = readEnvFile();
    
    const openaiKey = envMap.get('OPENAI_API_KEY') || '';
    const googleKey = envMap.get('GOOGLE_AI_API_KEY') || '';
    
    // 检查是否是占位符
    const isOpenaiConfigured = openaiKey && openaiKey !== 'sk-xxx' && openaiKey.startsWith('sk-');
    const isGoogleConfigured = googleKey && googleKey !== 'xxx' && googleKey.length > 10;
    
    const settings = {
      // 隐藏 API Key 的实际值，但显示是否已配置
      openaiApiKey: isOpenaiConfigured ? '***已配置***' : '',
      googleApiKey: isGoogleConfigured ? '***已配置***' : '',
      openaiKeyConfigured: isOpenaiConfigured,
      googleKeyConfigured: isGoogleConfigured,
      defaultProvider: envMap.get('DEFAULT_AI_PROVIDER') || 'gemini',
      openaiModel: envMap.get('OPENAI_MODEL') || 'gpt-5.2-chat-latest',
      geminiModel: envMap.get('GEMINI_MODEL') || 'gemini-2.5-flash',
    };

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error('Failed to get settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - 更新设置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      openaiApiKey,
      googleApiKey,
      defaultProvider,
      openaiModel,
      geminiModel,
    } = body;

    // 读取现有的 .env.local 文件
    let envContent = '';
    if (fs.existsSync(ENV_FILE_PATH)) {
      envContent = fs.readFileSync(ENV_FILE_PATH, 'utf-8');
    }

    // 解析现有内容
    const envLines = envContent.split('\n');
    const envMap = new Map<string, string>();
    
    for (const line of envLines) {
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, ...valueParts] = line.split('=');
        envMap.set(key.trim(), valueParts.join('=').trim());
      }
    }

    // 更新值（只有当提供了新值且不是占位符时才更新）
    if (openaiApiKey && !openaiApiKey.includes('***')) {
      envMap.set('OPENAI_API_KEY', openaiApiKey);
    }
    if (googleApiKey && !googleApiKey.includes('***')) {
      envMap.set('GOOGLE_AI_API_KEY', googleApiKey);
    }
    if (defaultProvider) {
      envMap.set('DEFAULT_AI_PROVIDER', defaultProvider);
    }
    if (openaiModel) {
      envMap.set('OPENAI_MODEL', openaiModel);
    }
    if (geminiModel) {
      envMap.set('GEMINI_MODEL', geminiModel);
    }

    // 生成新的 .env.local 内容
    const newEnvContent = `# AI API Keys
OPENAI_API_KEY=${envMap.get('OPENAI_API_KEY') || 'sk-xxx'}
GOOGLE_AI_API_KEY=${envMap.get('GOOGLE_AI_API_KEY') || 'xxx'}

# Default AI Provider: openai | gemini
DEFAULT_AI_PROVIDER=${envMap.get('DEFAULT_AI_PROVIDER') || 'gemini'}

# Default Model
OPENAI_MODEL=${envMap.get('OPENAI_MODEL') || 'gpt-5.2-chat-latest'}
GEMINI_MODEL=${envMap.get('GEMINI_MODEL') || 'gemini-2.5-flash'}
`;

    // 写入文件
    fs.writeFileSync(ENV_FILE_PATH, newEnvContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Settings saved. Please restart the server for changes to take effect.',
    });
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}
