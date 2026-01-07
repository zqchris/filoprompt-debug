import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Filo Debugger - Prompt Testing & Debugging',
  description: 'Local prompt debugging tool for Filo Mail',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-filo-bg">{children}</body>
    </html>
  );
}
