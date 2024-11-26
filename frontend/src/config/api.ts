export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
  HEALTH: '/health',
  AUTH_TEST: '/auth/test',
} as const;
