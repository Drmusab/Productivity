// @ts-nocheck
/**
 * @fileoverview Workspace Context for Notes-first knowledge workflow
 * Manages the active entity (note or task) and workspace state
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type ActiveEntityType = 'note' | 'task' | null;

export interface ActiveEntity {
  type: ActiveEntityType;
  id: string | null;
  title?: string;
}

export interface WorkspaceState {
  activeEntity: ActiveEntity;
  sidebarMode: 'tree' | 'list';
  editorMode: 'edit' | 'preview' | 'split';
  contextPanelOpen: boolean;
}

export interface WorkspaceContextValue {
  state: WorkspaceState;
  setActiveNote: (id: string, title?: string) => void;
  setActiveTask: (id: string, title?: string) => void;
  clearActiveEntity: () => void;
  setSidebarMode: (mode: 'tree' | 'list') => void;
  setEditorMode: (mode: 'edit' | 'preview' | 'split') => void;
  toggleContextPanel: () => void;
}

const defaultState: WorkspaceState = {
  activeEntity: { type: null, id: null },
  sidebarMode: 'tree',
  editorMode: 'edit',
  contextPanelOpen: true,
};

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<WorkspaceState>(defaultState);

  const setActiveNote = useCallback((id: string, title?: string) => {
    setState(prev => ({
      ...prev,
      activeEntity: { type: 'note', id, title },
    }));
    // Update URL for deep linking
    const url = new URL(window.location.href);
    url.searchParams.set('note', id);
    url.searchParams.delete('task');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const setActiveTask = useCallback((id: string, title?: string) => {
    setState(prev => ({
      ...prev,
      activeEntity: { type: 'task', id, title },
    }));
    // Update URL for deep linking
    const url = new URL(window.location.href);
    url.searchParams.set('task', id);
    url.searchParams.delete('note');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const clearActiveEntity = useCallback(() => {
    setState(prev => ({
      ...prev,
      activeEntity: { type: null, id: null },
    }));
    const url = new URL(window.location.href);
    url.searchParams.delete('note');
    url.searchParams.delete('task');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const setSidebarMode = useCallback((mode: 'tree' | 'list') => {
    setState(prev => ({ ...prev, sidebarMode: mode }));
  }, []);

  const setEditorMode = useCallback((mode: 'edit' | 'preview' | 'split') => {
    setState(prev => ({ ...prev, editorMode: mode }));
  }, []);

  const toggleContextPanel = useCallback(() => {
    setState(prev => ({ ...prev, contextPanelOpen: !prev.contextPanelOpen }));
  }, []);

  return (
    <WorkspaceContext.Provider
      value={{
        state,
        setActiveNote,
        setActiveTask,
        clearActiveEntity,
        setSidebarMode,
        setEditorMode,
        toggleContextPanel,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextValue => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

export default WorkspaceContext;
