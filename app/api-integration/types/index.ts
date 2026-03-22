export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ApiHeader {
  key: string;
  value: string;
}

export interface ApiConfig {
  endpoint: string;
  method: HttpMethod;
  headers: ApiHeader[];
  authType: 'none' | 'basic' | 'bearer';
  authCredentials?: {
    username?: string;
    password?: string;
    token?: string;
  };
}

export interface ApiRequest {
  config: ApiConfig;
  body?: string;
  params?: Record<string, string>;
}

export interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  error?: string;
}

export interface ApiHistoryItem {
  id: string;
  timestamp: number;
  request: ApiRequest;
  response: ApiResponse;
}

export type UserRole = 'ADMIN' | 'MANAGER' | 'USER' | 'WORKER';

export interface RolePermissions {
  canConfigure: boolean;
  canExecute: boolean;
  canViewHistory: boolean;
  canDeleteHistory: boolean;
}
