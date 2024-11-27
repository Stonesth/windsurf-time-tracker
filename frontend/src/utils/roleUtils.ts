import { UserRole } from '../types/user';

export const canWrite = (role: UserRole | null): boolean => {
  return role === UserRole.ADMIN || 
         role === UserRole.PROJECT_LEADER || 
         role === UserRole.USER;
};

export const isAdmin = (role: UserRole | null): boolean => {
  return role === UserRole.ADMIN;
};

export const canManageProjects = (role: UserRole | null): boolean => {
  return role === UserRole.ADMIN || role === UserRole.PROJECT_LEADER;
};
