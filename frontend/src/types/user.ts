export enum UserRole {
  ADMIN = 'ADMIN',
  PROJECT_LEADER = 'PROJECT_LEADER',
  USER = 'USER',
  READ = 'READ'
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role: UserRole;
  createdAt: string;
  lastLogin?: string;
}

export interface UserWithStatus extends User {
  isLastAdmin?: boolean;
}

// Permissions par rôle
export const RolePermissions = {
  [UserRole.ADMIN]: {
    canManageUsers: true,
    canManageProjects: true,
    canAddLogs: true,
    canRead: true,
    description: 'Peut tout faire'
  },
  [UserRole.PROJECT_LEADER]: {
    canManageUsers: false,
    canManageProjects: true,
    canAddLogs: true,
    canRead: true,
    description: 'Peut gérer les projets et ajouter des logs'
  },
  [UserRole.USER]: {
    canManageUsers: false,
    canManageProjects: false,
    canAddLogs: true,
    canRead: true,
    description: 'Peut uniquement ajouter des logs'
  },
  [UserRole.READ]: {
    canManageUsers: false,
    canManageProjects: false,
    canAddLogs: false,
    canRead: true,
    description: 'Ne peut faire que de la consultation'
  }
};
