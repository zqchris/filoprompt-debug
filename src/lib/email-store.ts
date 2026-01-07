import { getDb, generateId } from './db';
import { TestEmail, TestResult, BatchTestResult } from '@/types';

// ============ Test Emails ============

export function getAllTestEmails(): TestEmail[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM test_emails ORDER BY created_at DESC
  `).all() as any[];

  return rows.map(rowToTestEmail);
}

export function getTestEmailById(id: string): TestEmail | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT * FROM test_emails WHERE id = ?
  `).get(id) as any;

  return row ? rowToTestEmail(row) : null;
}

export function saveTestEmail(email: TestEmail): TestEmail {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO test_emails (id, subject, from_addr, to_addr, cc_addr, date, body, body_html, raw_eml, file_name, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    email.id,
    email.subject,
    email.from,
    email.to,
    email.cc || null,
    email.date,
    email.body,
    email.bodyHtml || null,
    email.rawEml,
    email.fileName,
    email.tags ? JSON.stringify(email.tags) : null,
    email.createdAt
  );

  return email;
}

export function saveMultipleTestEmails(emails: TestEmail[]): TestEmail[] {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO test_emails (id, subject, from_addr, to_addr, cc_addr, date, body, body_html, raw_eml, file_name, tags, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((emails: TestEmail[]) => {
    for (const email of emails) {
      stmt.run(
        email.id,
        email.subject,
        email.from,
        email.to,
        email.cc || null,
        email.date,
        email.body,
        email.bodyHtml || null,
        email.rawEml,
        email.fileName,
        email.tags ? JSON.stringify(email.tags) : null,
        email.createdAt
      );
    }
    return emails;
  });

  return insertMany(emails);
}

export function deleteTestEmail(id: string): boolean {
  const db = getDb();
  const result = db.prepare(`DELETE FROM test_emails WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function getTestEmailCount(): number {
  const db = getDb();
  const row = db.prepare(`SELECT COUNT(*) as count FROM test_emails`).get() as any;
  return row.count;
}

export function updateTestEmailBody(id: string, body: string, bodyHtml?: string): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE test_emails SET body = ?, body_html = ? WHERE id = ?
  `).run(body, bodyHtml || null, id);
  return result.changes > 0;
}

function rowToTestEmail(row: any): TestEmail {
  return {
    id: row.id,
    subject: row.subject,
    from: row.from_addr,
    to: row.to_addr,
    cc: row.cc_addr || undefined,
    date: row.date,
    body: row.body,
    bodyHtml: row.body_html || undefined,
    rawEml: row.raw_eml,
    fileName: row.file_name,
    tags: row.tags ? JSON.parse(row.tags) : undefined,
    createdAt: row.created_at,
  };
}

// ============ Test Results ============

export function saveTestResult(result: TestResult): TestResult {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO test_results (id, test_email_id, config, generated_prompt, ai_response, human_critique, blame_analysis, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    result.id,
    result.testEmailId,
    JSON.stringify(result.config),
    result.generatedPrompt,
    JSON.stringify(result.aiResponse),
    result.humanCritique || null,
    result.blameAnalysis ? JSON.stringify(result.blameAnalysis) : null,
    result.createdAt
  );

  return result;
}

export function getTestResultsByEmailId(emailId: string): TestResult[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM test_results WHERE test_email_id = ? ORDER BY created_at DESC
  `).all(emailId) as any[];

  return rows.map(rowToTestResult);
}

export function updateTestResultCritique(
  id: string,
  critique: string,
  blameAnalysis?: any
): boolean {
  const db = getDb();
  const result = db.prepare(`
    UPDATE test_results 
    SET human_critique = ?, blame_analysis = ?
    WHERE id = ?
  `).run(
    critique,
    blameAnalysis ? JSON.stringify(blameAnalysis) : null,
    id
  );
  return result.changes > 0;
}

function rowToTestResult(row: any): TestResult {
  return {
    id: row.id,
    testEmailId: row.test_email_id,
    config: JSON.parse(row.config),
    generatedPrompt: row.generated_prompt,
    aiResponse: JSON.parse(row.ai_response),
    humanCritique: row.human_critique || undefined,
    blameAnalysis: row.blame_analysis ? JSON.parse(row.blame_analysis) : undefined,
    createdAt: row.created_at,
  };
}

// ============ Batch Tests ============

export function saveBatchTest(batch: BatchTestResult): BatchTestResult {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO batch_tests (id, name, config, results, summary, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    batch.id,
    batch.config.name,
    JSON.stringify(batch.config),
    JSON.stringify(batch.results),
    JSON.stringify(batch.summary),
    'completed',
    batch.createdAt
  );

  return batch;
}

export function getAllBatchTests(): BatchTestResult[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT * FROM batch_tests ORDER BY created_at DESC
  `).all() as any[];

  return rows.map((row: any) => ({
    id: row.id,
    config: JSON.parse(row.config),
    results: JSON.parse(row.results),
    summary: JSON.parse(row.summary),
    createdAt: row.created_at,
  }));
}
