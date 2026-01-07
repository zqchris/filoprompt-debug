'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Bug, FlaskConical, Database, Settings } from 'lucide-react';
import { SettingsDialog } from './SettingsDialog';

export function Header() {
  const { currentView, setCurrentView, emails } = useAppStore();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-filo-bg/95 backdrop-blur-sm border-b border-filo-border">
      <div className="flex items-center justify-between h-14 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-filo-accent/20 rounded-lg flex items-center justify-center">
            <Bug className="w-5 h-5 text-filo-accent" />
          </div>
          <span className="text-lg font-semibold">
            <span className="text-filo-text">Filo</span>
            <span className="text-filo-text-muted ml-1">Debugger</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView('playground')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              currentView === 'playground'
                ? 'bg-filo-surface text-filo-text border border-filo-border'
                : 'text-filo-text-muted hover:text-filo-text hover:bg-filo-surface/50'
            )}
          >
            <FlaskConical className="w-4 h-4" />
            Prompt Playground
          </button>
          <button
            onClick={() => setCurrentView('testdata')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              currentView === 'testdata'
                ? 'bg-filo-surface text-filo-text border border-filo-border'
                : 'text-filo-text-muted hover:text-filo-text hover:bg-filo-surface/50'
            )}
          >
            <Database className="w-4 h-4" />
            Test Data
            {emails.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-filo-accent/20 text-filo-accent rounded">
                {emails.length}
              </span>
            )}
          </button>
          
          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="ml-2 p-2 hover:bg-filo-surface/50 rounded-lg transition-colors"
            title="API 设置"
          >
            <Settings className="w-5 h-5 text-filo-text-muted hover:text-filo-text" />
          </button>
        </nav>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </header>
  );
}
