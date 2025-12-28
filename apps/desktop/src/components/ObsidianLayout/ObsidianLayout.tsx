/**
 * @fileoverview Main Obsidian-inspired layout component
 * Provides the complete Obsidian.md-style UI with ribbon, sidebars, editor, and status bar
 */

import React, { useState, useCallback } from 'react';
import LeftRibbon from './LeftRibbon';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import MainEditor from './MainEditor';
import StatusBar from './StatusBar';
import ResizableGutter from './ResizableGutter';
import '../../styles/obsidian-theme.css';

interface ObsidianLayoutProps {
  children?: React.ReactNode;
}

interface Tab {
  id: string;
  title: string;
  content: string;
}

const ObsidianLayout: React.FC<ObsidianLayoutProps> = ({ children }) => {
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(true);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
  const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
  const [activeRibbonItem, setActiveRibbonItem] = useState<string>('files');
  const [tabs, setTabs] = useState<Tab[]>([
    { id: '1', title: 'Welcome', content: '# Welcome to Productivity OS\n\nThis is an Obsidian-inspired interface.' }
  ]);
  const [activeTabId, setActiveTabId] = useState('1');

  const handleLeftSidebarResize = useCallback((delta: number) => {
    setLeftSidebarWidth(prev => Math.max(200, Math.min(500, prev + delta)));
  }, []);

  const handleRightSidebarResize = useCallback((delta: number) => {
    setRightSidebarWidth(prev => Math.max(200, Math.min(500, prev - delta)));
  }, []);

  const toggleLeftSidebar = () => {
    setLeftSidebarCollapsed(prev => !prev);
  };

  const toggleRightSidebar = () => {
    setRightSidebarCollapsed(prev => !prev);
  };

  const handleTabClose = (tabId: string) => {
    const tabIndex = tabs.findIndex(t => t.id === tabId);
    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);
    
    // If closing active tab, switch to adjacent tab
    if (tabId === activeTabId && newTabs.length > 0) {
      const newActiveIndex = Math.min(tabIndex, newTabs.length - 1);
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="obsidian-layout">
      <div className="obsidian-workspace">
        {/* Left Ribbon */}
        <LeftRibbon
          activeItem={activeRibbonItem}
          onItemClick={setActiveRibbonItem}
          onToggleLeftSidebar={toggleLeftSidebar}
          onToggleRightSidebar={toggleRightSidebar}
        />

        {/* Left Sidebar */}
        <LeftSidebar
          collapsed={leftSidebarCollapsed}
          width={leftSidebarWidth}
          activeItem={activeRibbonItem}
          onToggle={toggleLeftSidebar}
        />

        {/* Gutter for left sidebar resize */}
        {!leftSidebarCollapsed && (
          <ResizableGutter onResize={handleLeftSidebarResize} />
        )}

        {/* Main Editor Area */}
        <MainEditor
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={setActiveTabId}
          onTabClose={handleTabClose}
          activeTab={activeTab}
        >
          {children}
        </MainEditor>

        {/* Gutter for right sidebar resize */}
        {!rightSidebarCollapsed && (
          <ResizableGutter onResize={handleRightSidebarResize} />
        )}

        {/* Right Sidebar */}
        <RightSidebar
          collapsed={rightSidebarCollapsed}
          width={rightSidebarWidth}
          onToggle={toggleRightSidebar}
        />
      </div>

      {/* Status Bar */}
      <StatusBar />
    </div>
  );
};

export default ObsidianLayout;
