import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { Command } from '@productivity-os/core';
import { cn } from './utils';

/**
 * Command Palette Component (CMD+K)
 * Global command interface for all productivity features
 */

export interface CommandPaletteProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
  placeholder?: string;
  maxResults?: number;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  commands,
  isOpen,
  onClose,
  placeholder = 'Type a command or search...',
  maxResults = 10,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter commands based on search
  const filteredCommands = React.useMemo(() => {
    if (!search.trim()) {
      return commands.slice(0, maxResults);
    }

    const lowerSearch = search.toLowerCase();
    return commands
      .filter((cmd) => {
        const matchesTitle = cmd.title.toLowerCase().includes(lowerSearch);
        const matchesDescription = cmd.description?.toLowerCase().includes(lowerSearch);
        const matchesKeywords = cmd.keywords.some((kw) => kw.toLowerCase().includes(lowerSearch));
        return matchesTitle || matchesDescription || matchesKeywords;
      })
      .slice(0, maxResults);
  }, [commands, search, maxResults]);

  // Create index map for O(1) lookup
  const commandIndexMap = React.useMemo(() => {
    const map = new Map<string, number>();
    filteredCommands.forEach((cmd, index) => {
      map.set(cmd.id, index);
    });
    return map;
  }, [filteredCommands]);

  // Group commands by category
  const groupedCommands = React.useMemo(() => {
    const groups = new Map<string, Command[]>();
    
    filteredCommands.forEach((cmd) => {
      const category = cmd.category || 'Other';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    });

    return Array.from(groups.entries()).map(([category, cmds]) => ({
      category,
      commands: cmds,
    }));
  }, [filteredCommands]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  // Execute command
  const executeCommand = async (command: Command): Promise<void> => {
    try {
      await command.handler({});
      onClose();
    } catch (error) {
      console.error('Command execution failed:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 pt-[20vh]">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-2xl dark:bg-gray-900">
        {/* Search Input */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <input
            ref={inputRef}
            type="text"
            className={cn(
              'w-full px-6 py-4 text-lg',
              'bg-transparent outline-none',
              'placeholder-gray-400 dark:placeholder-gray-500',
              'text-gray-900 dark:text-gray-100'
            )}
            placeholder={placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {/* Commands List */}
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
              No commands found
            </div>
          ) : (
            groupedCommands.map(({ category, commands: categoryCommands }) => (
              <div key={category} className="mb-4">
                {/* Category Header */}
                <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {category}
                </div>

                {/* Commands */}
                {categoryCommands.map((command, _index) => {
                  const globalIndex = commandIndexMap.get(command.id) ?? 0;
                  const isSelected = globalIndex === selectedIndex;

                  return (
                    <button
                      key={command.id}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        'flex items-center justify-between gap-4',
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                      onClick={() => executeCommand(command)}
                      onMouseEnter={() => setSelectedIndex(globalIndex)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {command.title}
                        </div>
                        {command.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            {command.description}
                          </div>
                        )}
                      </div>

                      {command.shortcut && (
                        <kbd className={cn(
                          'px-2 py-1 text-xs font-mono',
                          'bg-gray-100 dark:bg-gray-800',
                          'border border-gray-300 dark:border-gray-600',
                          'rounded'
                        )}>
                          {command.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px]">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px]">↵</kbd>
                Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-[10px]">esc</kbd>
                Close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
