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

export interface TabRenameDialogState {
  isOpen: boolean;
  tabId: string;
  currentDisplayName?: string;
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

  // 4. タブ表示名変更ダイアログ
  const [tabRenameDialog, setTabRenameDialog] = useState<TabRenameDialogState>({
    isOpen: false,
    tabId: '',
  });

  const showTabRenameDialog = useCallback((tabId: string, currentDisplayName?: string) => {
    setTabRenameDialog({ isOpen: true, tabId, currentDisplayName });
  }, []);

  const hideTabRenameDialog = useCallback(() => {
    setTabRenameDialog({ isOpen: false, tabId: '' });
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

    tabRenameDialog,
    showTabRenameDialog,
    hideTabRenameDialog,
    setTabRenameDialog,
  };
}
