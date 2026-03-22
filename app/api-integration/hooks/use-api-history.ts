import { useState, useEffect } from 'react';
import { ApiHistoryItem, ApiRequest, ApiResponse } from '../types';

export function useApiHistory() {
  const [history, setHistory] = useState<ApiHistoryItem[]>([]);

  useEffect(() => {
    const savedHistory = localStorage.getItem('api-integration-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to load API history', e);
      }
    }
  }, []);

  const redactSensitiveData = (request: ApiRequest): ApiRequest => {
    const redactedHeaders = request.config.headers.map((h) => {
      const sensitiveKeys = ['authorization', 'api-key', 'token', 'password', 'secret'];
      if (sensitiveKeys.includes(h.key.toLowerCase())) {
        return { ...h, value: '********' };
      }
      return h;
    });

    const redactedCredentials = request.config.authCredentials
      ? {
          ...request.config.authCredentials,
          password: request.config.authCredentials.password ? '********' : undefined,
          token: request.config.authCredentials.token ? '********' : undefined,
        }
      : undefined;

    return {
      ...request,
      config: {
        ...request.config,
        headers: redactedHeaders,
        authCredentials: redactedCredentials,
      },
    };
  };

  const addToHistory = (request: ApiRequest, response: ApiResponse) => {
    const redactedRequest = redactSensitiveData(request);
    const newItem: ApiHistoryItem = {
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now(),
      request: redactedRequest,
      response,
    };
    const updatedHistory = [newItem, ...history].slice(0, 50); // Keep last 50 items
    setHistory(updatedHistory);
    localStorage.setItem('api-integration-history', JSON.stringify(updatedHistory));
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('api-integration-history');
  };

  const deleteHistoryItem = (id: string) => {
    const updatedHistory = history.filter((item) => item.id !== id);
    setHistory(updatedHistory);
    localStorage.setItem('api-integration-history', JSON.stringify(updatedHistory));
  };

  return { history, addToHistory, clearHistory, deleteHistoryItem };
}
