import { useUser } from '@clerk/nextjs';
import { useEffect, useState } from 'react';
import { UserRole, RolePermissions } from '../types';

const defaultPermissions: RolePermissions = {
  canConfigure: false,
  canExecute: false,
  canViewHistory: false,
  canDeleteHistory: false,
};

const roleToPermissions: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canConfigure: true,
    canExecute: true,
    canViewHistory: true,
    canDeleteHistory: true,
  },
  MANAGER: {
    canConfigure: true,
    canExecute: true,
    canViewHistory: true,
    canDeleteHistory: false,
  },
  USER: {
    canConfigure: false,
    canExecute: true,
    canViewHistory: true,
    canDeleteHistory: false,
  },
  WORKER: {
    canConfigure: false,
    canExecute: false,
    canViewHistory: true,
    canDeleteHistory: false,
  },
};

export function usePermissions() {
  const { user, isLoaded } = useUser();
  const [permissions, setPermissions] = useState<RolePermissions>(defaultPermissions);
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    if (isLoaded && user) {
      const fetchUserRole = async () => {
        try {
          const response = await fetch('/api/users/sync');
          const data = await response.json();
          if (data.data?.role) {
            const userRole = data.data.role as UserRole;
            setRole(userRole);
            setPermissions(roleToPermissions[userRole] || defaultPermissions);
          }
        } catch (e) {
          console.error('Failed to fetch user role', e);
        }
      };
      void fetchUserRole();
    }
  }, [isLoaded, user]);

  return { permissions, role, isLoaded };
}
