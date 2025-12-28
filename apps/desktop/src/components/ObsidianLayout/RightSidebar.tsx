/**
 * @fileoverview Right sidebar component - metadata and outline
 */

import React from 'react';
import { List } from 'lucide-react';

interface RightSidebarProps {
  collapsed: boolean;
  width: number;
  onToggle: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({ collapsed, width, onToggle }) => {
  return (
    <div 
      className={`obsidian-sidebar-right ${collapsed ? 'collapsed' : ''}`}
      style={{ width: collapsed ? 0 : width }}
    >
      <div className="obsidian-sidebar-header">
        <span className="obsidian-sidebar-title">Outline</span>
      </div>

      <div className="obsidian-sidebar-content">
        {/* Document outline */}
        <div style={{ padding: '16px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--obsidian-text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Document Outline
            </div>
            <div className="obsidian-file-tree">
              <div className="obsidian-file-item" style={{ paddingLeft: '8px' }}>
                <List size={14} style={{ marginRight: '4px' }} />
                <span>Welcome to Productivity OS</span>
              </div>
            </div>
          </div>

          <div className="obsidian-divider" />

          {/* Backlinks section */}
          <div style={{ marginTop: '16px', marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--obsidian-text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Backlinks
            </div>
            <div style={{ 
              color: 'var(--obsidian-text-muted)', 
              fontSize: '13px',
              padding: '8px'
            }}>
              No backlinks found
            </div>
          </div>

          <div className="obsidian-divider" />

          {/* Tags section */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: 600, 
              color: 'var(--obsidian-text-muted)',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Tags
            </div>
            <div style={{ 
              color: 'var(--obsidian-text-muted)', 
              fontSize: '13px',
              padding: '8px'
            }}>
              No tags in this note
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;
