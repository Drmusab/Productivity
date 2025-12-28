/**
 * @fileoverview Left ribbon component - slim vertical icon bar
 */

import React from 'react';
import { 
  FileText, 
  Search, 
  Settings, 
  Network,
  PanelLeftClose,
  PanelRightClose
} from 'lucide-react';

interface LeftRibbonProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

const LeftRibbon: React.FC<LeftRibbonProps> = ({ 
  activeItem, 
  onItemClick,
  onToggleLeftSidebar,
  onToggleRightSidebar
}) => {
  const ribbonItems = [
    { id: 'files', icon: FileText, label: 'Files' },
    { id: 'search', icon: Search, label: 'Search' },
    { id: 'graph', icon: Network, label: 'Graph View' },
  ];

  return (
    <div className="obsidian-ribbon">
      {/* Toggle left sidebar */}
      <button
        className="obsidian-ribbon-button"
        onClick={onToggleLeftSidebar}
        title="Toggle left sidebar"
      >
        <PanelLeftClose size={20} />
      </button>

      <div className="obsidian-divider" />

      {/* Main ribbon items */}
      {ribbonItems.map(item => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`obsidian-ribbon-button ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => onItemClick(item.id)}
            title={item.label}
          >
            <Icon size={20} />
          </button>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom items */}
      <button
        className="obsidian-ribbon-button"
        onClick={onToggleRightSidebar}
        title="Toggle right sidebar"
      >
        <PanelRightClose size={20} />
      </button>

      <button
        className="obsidian-ribbon-button"
        title="Settings"
      >
        <Settings size={20} />
      </button>
    </div>
  );
};

export default LeftRibbon;
