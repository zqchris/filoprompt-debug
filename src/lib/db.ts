import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'filoprompt.db');

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initSchema(db);
  }
  return db;
}

function initSchema(database: Database.Database) {
  database.exec(`
    -- 测试邮件表
    CREATE TABLE IF NOT EXISTS test_emails (
      id TEXT PRIMARY KEY,
      subject TEXT,
      from_addr TEXT,
      to_addr TEXT,
      cc_addr TEXT,
      date TEXT,
      body TEXT,
      body_html TEXT,
      raw_eml TEXT,
      file_name TEXT,
      tags TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Prompt 模板表
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      template TEXT NOT NULL,
      variables TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 测试结果表
    CREATE TABLE IF NOT EXISTS test_results (
      id TEXT PRIMARY KEY,
      test_email_id TEXT,
      config TEXT,
      generated_prompt TEXT,
      ai_response TEXT,
      human_critique TEXT,
      blame_analysis TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (test_email_id) REFERENCES test_emails(id)
    );

    -- 批量测试表
    CREATE TABLE IF NOT EXISTS batch_tests (
      id TEXT PRIMARY KEY,
      name TEXT,
      config TEXT,
      results TEXT,
      summary TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Operation Prompt 配置表（每个 operation type 一个 prompt）
    CREATE TABLE IF NOT EXISTS operation_prompts (
      operation_type TEXT PRIMARY KEY,
      prompt TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 写作工具 Prompt 配置表
    CREATE TABLE IF NOT EXISTS writing_tools (
      tool_id TEXT PRIMARY KEY,
      prompt TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- 满意结果（Golden Results）表
    CREATE TABLE IF NOT EXISTS golden_results (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      prompt TEXT NOT NULL,
      output TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(email_id, operation_type),
      FOREIGN KEY (email_id) REFERENCES test_emails(id) ON DELETE CASCADE
    );

    -- 创建索引
    CREATE INDEX IF NOT EXISTS idx_test_emails_subject ON test_emails(subject);
    CREATE INDEX IF NOT EXISTS idx_test_results_email_id ON test_results(test_email_id);
  `);
}

// 通用 ID 生成
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
