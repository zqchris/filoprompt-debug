'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAppStore } from '@/lib/store';
import { cn, formatDate, truncate } from '@/lib/utils';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Loader2,
  Mail,
  CheckCircle2,
  XCircle,
  Play
} from 'lucide-react';
import { TestEmail } from '@/types';
import { BatchTestDialog } from './BatchTestDialog';

export function TestDataView() {
  const { emails, setEmails, addEmails, removeEmail, setSelectedEmail, setCurrentView } = useAppStore();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch('/api/emails', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        addEmails(result.data);
      } else {
        console.error('Upload failed:', result.error);
        alert(`上传失败: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('上传失败，请检查控制台');
    } finally {
      setIsUploading(false);
    }
  }, [addEmails]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'message/rfc822': ['.eml'],
    },
    multiple: true,
  });

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/emails/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        removeEmail(id);
        selectedIds.delete(id);
        setSelectedIds(new Set(selectedIds));
      }
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === emails.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(emails.map((e) => e.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleUseInPlayground = (email: TestEmail) => {
    setSelectedEmail(email);
    setCurrentView('playground');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'card border-2 border-dashed p-8 text-center cursor-pointer transition-all',
          isDragActive
            ? 'border-filo-accent bg-filo-accent/5'
            : 'border-filo-border hover:border-filo-border-light'
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          {isUploading ? (
            <>
              <Loader2 className="w-10 h-10 text-filo-accent animate-spin" />
              <p className="text-filo-text-muted">上传中...</p>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-filo-text-muted" />
              <div>
                <p className="text-lg font-medium text-filo-text">
                  Upload .eml files
                </p>
                <p className="text-sm text-filo-text-muted mt-1">
                  Drag and drop or click to select files to use as test context.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Email List */}
      {emails.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Stored Test Emails
              <span className="ml-2 text-sm text-filo-text-muted">
                ({emails.length})
              </span>
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="btn-secondary text-sm py-1.5 px-3"
              >
                {selectedIds.size === emails.length ? '取消全选' : '全选'}
              </button>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowBatchDialog(true)}
                  className="btn-primary text-sm py-1.5 px-3 flex items-center gap-1"
                >
                  <Play className="w-4 h-4" />
                  批量测试 ({selectedIds.size})
                </button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {emails.map((email) => (
              <div
                key={email.id}
                className={cn(
                  'card p-4 flex items-start gap-4 transition-all',
                  selectedIds.has(email.id) && 'ring-1 ring-filo-accent'
                )}
              >
                {/* Checkbox */}
                <div className="pt-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(email.id)}
                    onChange={() => handleToggleSelect(email.id)}
                    className="w-4 h-4 rounded border-filo-border bg-filo-bg text-filo-accent focus:ring-filo-accent cursor-pointer"
                  />
                </div>

                {/* Icon */}
                <div className="w-10 h-10 bg-filo-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-filo-accent" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-filo-text truncate">
                    {email.subject}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-sm text-filo-text-muted">
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" />
                      From: {truncate(email.from, 30)}
                    </span>
                    <span>To: {truncate(email.to, 30)}</span>
                  </div>
                  <p className="mt-2 text-sm text-filo-text-muted line-clamp-2">
                    {truncate(email.body, 150)}
                  </p>
                  <div className="mt-2 text-xs text-filo-text-muted/70">
                    {email.fileName} • {formatDate(email.date)}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleUseInPlayground(email)}
                    className="p-2 hover:bg-filo-accent/10 rounded-lg transition-colors text-filo-accent"
                    title="在 Playground 中使用"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(email.id)}
                    className="p-2 hover:bg-filo-error/10 rounded-lg transition-colors text-filo-error"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {emails.length === 0 && (
        <div className="card p-12 text-center">
          <Mail className="w-12 h-12 mx-auto text-filo-text-muted/50" />
          <h3 className="mt-4 text-lg font-medium text-filo-text">
            No test emails yet
          </h3>
          <p className="mt-2 text-sm text-filo-text-muted">
            上传 .eml 文件来开始测试你的 prompt
          </p>
        </div>
      )}

      {/* Batch Test Dialog */}
      {showBatchDialog && (
        <BatchTestDialog
          selectedEmailIds={Array.from(selectedIds)}
          onClose={() => setShowBatchDialog(false)}
        />
      )}
    </div>
  );
}
