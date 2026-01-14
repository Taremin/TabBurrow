import { useState, useCallback } from 'react';

export interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmButtonText?: string;
  confirmButtonStyle?: 'danger' | 'primary';
}

export interface RenameDialogState {
  isOpen: boolean;
  currentName: string;
  groupType?: 'domain' | 'custom';
  initialValue?: string;
}

export interface CreateGroupDialogState {
  isOpen: boolean;
  tabIdToMove?: string;
  bulkMove?: boolean;
}

export interface TabEditDialogState {
  isOpen: boolean;
  tabId: string;
  currentDisplayName?: string;
  currentSortKey?: string;
}

export interface PromptDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  initialValue: string;
  onConfirm: (value: string) => void;
}

export function useDialogs() {
  // 1. 汎用確認ダイアログ
  const [confirmDialog, setConfirmDialog] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showConfirmDialog = useCallback((options: Omit<DialogState, 'isOpen'>) => {
    setConfirmDialog({ ...options, isOpen: true });
  }, []);

  const hideConfirmDialog = useCallback(() => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  // 2. グループリネームダイアログ
  const [renameDialog, setRenameDialog] = useState<RenameDialogState>({
    isOpen: false,
    currentName: '',
  });

  const showRenameDialog = useCallback((currentName: string, groupType: 'domain' | 'custom', initialValue?: string) => {
    setRenameDialog({ isOpen: true, currentName, groupType, initialValue });
  }, []);

  const hideRenameDialog = useCallback(() => {
    setRenameDialog(prev => ({ ...prev, isOpen: false, currentName: '' }));
  }, []);

  // 3. 新規グループ作成ダイアログ
  const [createGroupDialog, setCreateGroupDialog] = useState<CreateGroupDialogState>({
    isOpen: false,
  });

  const showCreateGroupDialog = useCallback((options?: Omit<CreateGroupDialogState, 'isOpen'>) => {
    setCreateGroupDialog({ ...options, isOpen: true });
  }, []);

  const hideCreateGroupDialog = useCallback(() => {
    setCreateGroupDialog({ isOpen: false });
  }, []);

  // 4. タブ編集ダイアログ
  const [editTabDialog, setEditTabDialog] = useState<TabEditDialogState>({
    isOpen: false,
    tabId: '',
  });

  const showEditTabDialog = useCallback((tabId: string, currentDisplayName?: string, currentSortKey?: string) => {
    setEditTabDialog({ isOpen: true, tabId, currentDisplayName, currentSortKey });
  }, []);

  const hideEditTabDialog = useCallback(() => {
    setEditTabDialog({ isOpen: false, tabId: '' });
  }, []);

  // 5. 汎用プロンプトダイアログ
  const [promptDialog, setPromptDialog] = useState<PromptDialogState>({
    isOpen: false,
    title: '',
    message: '',
    initialValue: '',
    onConfirm: () => {},
  });

  const showPrompt = useCallback((options: Omit<PromptDialogState, 'isOpen'>) => {
    setPromptDialog({ ...options, isOpen: true });
  }, []);

  const hidePrompt = useCallback(() => {
    setPromptDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    confirmDialog,
    showConfirmDialog,
    hideConfirmDialog,
    setConfirmDialog, // 後方互換性または特殊な更新用

    renameDialog,
    showRenameDialog,
    hideRenameDialog,
    setRenameDialog,

    createGroupDialog,
    showCreateGroupDialog,
    hideCreateGroupDialog,
    setCreateGroupDialog,

    editTabDialog,
    showEditTabDialog,
    hideEditTabDialog,
    setEditTabDialog,

    promptDialog,
    showPrompt,
    hidePrompt,
  };
}
