# Filo Prompt Debugger

本地 Prompt 调试工具，用于测试和优化 Filo Mail 的 AI Prompt。

## 功能特性

- 🎮 **Prompt Playground** - 实时预览和测试 Prompt
- 📧 **Test Data 管理** - 上传和管理 .eml 测试邮件样本（支持 200-300+ 个文件）
- 🔍 **Blame Prompt** - 分析 AI 输出问题出在 Prompt 的哪个部分
- 📊 **批量验证** - 对多个邮件样本运行批量测试
- 🤖 **多 AI 支持** - 支持 Gemini 和 OpenAI

## 快速开始

### 1. 安装依赖

```bash
cd /Users/zkyo/Projects/filoprompt-debug
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件：

```bash
# AI API Keys
OPENAI_API_KEY=sk-xxx
GOOGLE_AI_API_KEY=xxx

# Default AI Provider: openai | gemini
DEFAULT_AI_PROVIDER=gemini

# Default Model
OPENAI_MODEL=gpt-4o
GEMINI_MODEL=gemini-2.5-flash
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

## 使用指南

### Prompt Playground

1. 在左侧面板配置：
   - 选择 AI 提供商和模型
   - 选择操作类型 (New Email, Reply, etc.)
   - 输入用户草稿
   - 选择风格策略
   - 添加自定义指令（可选）
   - 设置发送者上下文

2. 中间面板显示实时 Prompt 预览

3. 点击 "Generate Output" 生成结果

4. 右侧面板显示：
   - AI 输出结果
   - Human Critique 输入框
   - Blame Prompt 分析结果

### Test Data 管理

1. 拖拽或点击上传 .eml 文件
2. 查看已存储的测试邮件列表
3. 选择邮件进行批量测试
4. 点击播放按钮在 Playground 中使用

### Blame Prompt

当 AI 输出不符合预期时：

1. 在 Human Critique 输入你的批评意见
2. 点击 "Blame Prompt" 
3. AI 会分析问题出在 Prompt 的哪个部分
4. 根据建议优化你的 Prompt

## 技术栈

- **前端**: Next.js 14 + React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **数据库**: SQLite (better-sqlite3)
- **邮件解析**: mailparser
- **AI SDK**: OpenAI SDK, Google Generative AI

## 项目结构

```
filoprompt-debug/
├── src/
│   ├── app/
│   │   ├── api/           # API Routes
│   │   │   ├── emails/    # 邮件 CRUD
│   │   │   ├── generate/  # AI 生成
│   │   │   ├── blame/     # Blame 分析
│   │   │   └── batch/     # 批量测试
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/        # React 组件
│   ├── lib/               # 工具库
│   │   ├── ai-providers.ts
│   │   ├── db.ts
│   │   ├── email-store.ts
│   │   ├── eml-parser.ts
│   │   ├── prompt-builder.ts
│   │   ├── store.ts
│   │   └── utils.ts
│   └── types/             # TypeScript 类型
├── data/                  # 数据目录
│   ├── filoprompt.db     # SQLite 数据库
│   └── eml-files/        # EML 文件存储
├── package.json
└── README.md
```

## License

Private - Filo Mail Internal Tool
