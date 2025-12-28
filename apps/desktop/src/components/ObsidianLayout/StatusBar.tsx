/**
 * @fileoverview Status bar component - shows document stats and status
 */

import React from 'react';
import { FileText, Clock, Wifi } from 'lucide-react';

const StatusBar: React.FC = () => {
  return (
    <div className="obsidian-statusbar">
      <div className="obsidian-statusbar-left">
        <div className="obsidian-statusbar-item">
          <FileText size={12} />
          <span>1 file</span>
        </div>
        <div className="obsidian-statusbar-item">
          <span>234 words</span>
        </div>
        <div className="obsidian-statusbar-item">
          <span>1,234 characters</span>
        </div>
      </div>

      <div className="obsidian-statusbar-right">
        <div className="obsidian-statusbar-item clickable">
          <Wifi size={12} />
          <span>Synced</span>
        </div>
        <div className="obsidian-statusbar-item">
          <Clock size={12} />
          <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
