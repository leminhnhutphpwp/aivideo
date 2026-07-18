'use client';

import { useEffect } from 'react';

interface KeyboardShortcutsParams {
  selectedNodeId: string | null;
  selectedEdge: { id: string } | null;
  ctxMenu: any;
  saving: boolean;
  deleteScene: (id: string) => void;
  deleteEdge: (id: string) => void;
  handleSave: () => void;
}

export function useKeyboardShortcuts({
  selectedNodeId,
  selectedEdge,
  ctxMenu,
  saving,
  deleteScene,
  deleteEdge,
  handleSave,
}: KeyboardShortcutsParams) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === 'Delete' && selectedNodeId && !ctxMenu) deleteScene(selectedNodeId);
      if (e.key === 'Delete' && selectedEdge && !ctxMenu) deleteEdge(selectedEdge.id);
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); if (!saving) handleSave(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [selectedNodeId, deleteScene, ctxMenu, saving, selectedEdge, deleteEdge, handleSave]);
}
