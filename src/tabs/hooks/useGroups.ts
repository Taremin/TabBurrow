/**
 * TabBurrow - グループ操作フック
 * カスタムグループの作成、更新、削除を管理
 */

import { useCallback } from 'react';
import {
  createCustomGroup,
  deleteCustomGroup,
  renameCustomGroup,
} from '../../storage';

// useTabsから必要な関数を受け取る形にするか、あるいは独自のデータフッチングを持つか。
// ここでは状態を持たず、操作関数のみを提供する形がシンプルだが、
// createGroup時には重複チェックなどで現在のグループ一覧が必要になる。
// なので、コンポーネント側でグループ一覧を渡すか、ここでも取得するか。
// 整合性を保つため、Actionsのみを提供する。

export function useGroups(
  onGroupsChanged: () => void | Promise<void>
) {

  // グループ作成
  const handleCreateGroup = useCallback(async (name: string) => {
    await createCustomGroup(name);
    await onGroupsChanged();
  }, [onGroupsChanged]);

  // グループ削除（カスタムグループ）
  const handleDeleteCustomGroup = useCallback(async (name: string) => {
    await deleteCustomGroup(name);
    await onGroupsChanged();
  }, [onGroupsChanged]);

  // グループ名変更
  const handleRenameGroup = useCallback(async (oldName: string, newName: string) => {
    await renameCustomGroup(oldName, newName);
    await onGroupsChanged();
  }, [onGroupsChanged]);

  return {
    createGroup: handleCreateGroup,
    deleteCustomGroup: handleDeleteCustomGroup,
    renameGroup: handleRenameGroup,
  };
}
