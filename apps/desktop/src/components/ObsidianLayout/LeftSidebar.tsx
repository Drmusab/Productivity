/**
 * @fileoverview Left sidebar component - file explorer
 */

import React, { useState } from 'react';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';

interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
}

interface LeftSidebarProps {
  collapsed: boolean;
  width: number;
  activeItem: string;
  onToggle: () => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({ 
  collapsed, 
  width, 
  activeItem,
  onToggle 
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['1']));
  const [selectedFile, setSelectedFile] = useState<string>('1-1');
  const [searchQuery, setSearchQuery] = useState('');

  // Sample file tree
  const fileTree: FileItem[] = [
    {
      id: '1',
      name: 'Notes',
      type: 'folder',
      children: [
        { id: '1-1', name: 'Welcome.md', type: 'file' },
        { id: '1-2', name: 'Daily Notes', type: 'folder', children: [
          { id: '1-2-1', name: '2025-01-01.md', type: 'file' },
          { id: '1-2-2', name: '2025-01-02.md', type: 'file' },
        ]},
        { id: '1-3', name: 'Projects.md', type: 'file' },
      ]
    },
    {
      id: '2',
      name: 'Resources',
      type: 'folder',
      children: [
        { id: '2-1', name: 'Articles.md', type: 'file' },
        { id: '2-2', name: 'Books.md', type: 'file' },
      ]
    },
    {
      id: '3',
      name: 'Archive',
      type: 'folder',
      children: []
    }
  ];

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const renderFileItem = (item: FileItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isSelected = selectedFile === item.id;

    return (
      <div key={item.id}>
        <div
          className={`obsidian-file-item ${item.type === 'folder' ? 'folder' : ''} ${isSelected ? 'active' : ''}`}
          style={{ paddingLeft: `${depth * 16 + 16}px` }}
          onClick={() => {
            if (item.type === 'folder') {
              toggleFolder(item.id);
            } else {
              setSelectedFile(item.id);
            }
          }}
        >
          {item.type === 'folder' && (
            <div className={`obsidian-file-chevron ${isExpanded ? 'expanded' : ''}`}>
              <ChevronRight size={14} />
            </div>
          )}
          <div className="obsidian-file-icon">
            {item.type === 'folder' ? (
              isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />
            ) : (
              <File size={16} />
            )}
          </div>
          <span>{item.name}</span>
        </div>
        {item.type === 'folder' && isExpanded && item.children && (
          <div className="obsidian-file-children">
            {item.children.map(child => renderFileItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div 
      className={`obsidian-sidebar-left ${collapsed ? 'collapsed' : ''}`}
      style={{ width: collapsed ? 0 : width }}
    >
      <div className="obsidian-sidebar-header">
        <span className="obsidian-sidebar-title">
          {activeItem === 'files' ? 'Files' : 
           activeItem === 'search' ? 'Search' : 
           activeItem === 'graph' ? 'Graph' : 'Files'}
        </span>
      </div>

      <div className="obsidian-sidebar-content">
        {activeItem === 'files' && (
          <>
            <div style={{ padding: '8px 16px' }}>
              <input
                type="text"
                className="obsidian-search"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="obsidian-file-tree">
              {fileTree.map(item => renderFileItem(item))}
            </div>
          </>
        )}
        
        {activeItem === 'search' && (
          <div style={{ padding: '16px' }}>
            <input
              type="text"
              className="obsidian-search"
              placeholder="Search in all files..."
              style={{ marginBottom: '16px' }}
            />
            <div style={{ color: 'var(--obsidian-text-muted)', fontSize: '13px' }}>
              No search results
            </div>
          </div>
        )}

        {activeItem === 'graph' && (
          <div style={{ padding: '16px', color: 'var(--obsidian-text-muted)', fontSize: '13px' }}>
            Graph view coming soon...
          </div>
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;
