import { NextRequest, NextResponse } from 'next/server';
import { parseMultipleEmlFiles } from '@/lib/eml-parser';
import { 
  getAllTestEmails, 
  saveMultipleTestEmails, 
  getTestEmailCount 
} from '@/lib/email-store';

// GET /api/emails - 获取所有测试邮件
export async function GET() {
  try {
    const emails = getAllTestEmails();
    const count = getTestEmailCount();
    
    return NextResponse.json({
      success: true,
      data: emails,
      total: count,
    });
  } catch (error) {
    console.error('Failed to get emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get emails' },
      { status: 500 }
    );
  }
}

// POST /api/emails - 上传 .eml 文件
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No files provided' },
        { status: 400 }
      );
    }

    // 解析所有 .eml 文件
    const fileBuffers = await Promise.all(
      files.map(async (file) => ({
        buffer: Buffer.from(await file.arrayBuffer()),
        fileName: file.name,
      }))
    );

    const parsedEmails = await parseMultipleEmlFiles(fileBuffers);
    
    // 保存到数据库
    const savedEmails = saveMultipleTestEmails(parsedEmails);

    return NextResponse.json({
      success: true,
      data: savedEmails,
      count: savedEmails.length,
    });
  } catch (error) {
    console.error('Failed to upload emails:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload emails' },
      { status: 500 }
    );
  }
}
