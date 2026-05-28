import { User, PermissionKey } from '@/types/pos';

export const hasPermission = (user: User | null, permission: PermissionKey): boolean => {
  if (!user) return false;

  // 1. Owner always has all permissions
  if (user.role === 'Owner') return true;

  // 2. Account must be active to perform any action
  if (user.isActive === false) return false;

  // 3. Check custom assigned permissions
  if (user.permissions && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission);
  }

  // 4. Default Cashier fallback (empty permissions array by default)
  const defaultCashierPermissions: PermissionKey[] = [];
  return defaultCashierPermissions.includes(permission);
};
