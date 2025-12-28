/**
 * @fileoverview Main editor component with tabs and content area
 */

import React from 'react';
import { X } from 'lucide-react';

interface Tab {
  id: string;
  title: string;
  content: string;
}

interface MainEditorProps {
  tabs: Tab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  activeTab?: Tab;
  children?: React.ReactNode;
}

const MainEditor: React.FC<MainEditorProps> = ({ 
  tabs, 
  activeTabId, 
  onTabClick, 
  onTabClose, 
  activeTab,
  children 
}) => {
  return (
    <div className="obsidian-main">
      {/* Tab bar */}
      <div className="obsidian-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`obsidian-tab ${activeTabId === tab.id ? 'active' : ''}`}
            onClick={() => onTabClick(tab.id)}
          >
            <span>{tab.title}</span>
            {tabs.length > 1 && (
              <div
                className="obsidian-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                <X size={14} />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Editor content */}
      <div className="obsidian-editor">
        {children ? (
          children
        ) : activeTab ? (
          <div className="obsidian-editor-content">
            {/* Render markdown content */}
            {activeTab.content.split('\n').map((line, index) => {
              if (line.startsWith('# ')) {
                return <h1 key={index}>{line.substring(2)}</h1>;
              } else if (line.startsWith('## ')) {
                return <h2 key={index}>{line.substring(3)}</h2>;
              } else if (line.startsWith('### ')) {
                return <h3 key={index}>{line.substring(4)}</h3>;
              } else if (line.trim() === '') {
                return <br key={index} />;
              } else {
                return <p key={index}>{line}</p>;
              }
            })}
          </div>
        ) : (
          <div className="obsidian-editor-content">
            <p style={{ color: 'var(--obsidian-text-muted)' }}>No file open</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainEditor;
