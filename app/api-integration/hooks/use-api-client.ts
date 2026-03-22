import { useState, useCallback } from 'react';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiRequest, ApiResponse } from '../types';

interface UseApiClientOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
}

export function useApiClient(options: UseApiClientOptions = {}) {
  const { maxRetries = 3, initialDelay = 1000, maxDelay = 10000 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [isRetrying, setIsRetrying] = useState(false);

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const executeRequest = useCallback(
    async (request: ApiRequest): Promise<ApiResponse> => {
      setIsLoading(true);
      setProgress(0);
      setError(null);
      setIsRetrying(false);

      let retryCount = 0;
      let currentDelay = initialDelay;

      const performRequest = async (): Promise<ApiResponse> => {
        const startTime = Date.now();
        try {
          // ... existing request logic ...
          const headers: Record<string, string> = {};
          request.config.headers.forEach((h) => {
            if (h.key && h.value) headers[h.key] = h.value;
          });

          if (request.config.authType === 'bearer' && request.config.authCredentials?.token) {
            headers['Authorization'] = `Bearer ${request.config.authCredentials.token}`;
          } else if (
            request.config.authType === 'basic' &&
            request.config.authCredentials?.username &&
            request.config.authCredentials?.password
          ) {
            const auth = btoa(
              `${request.config.authCredentials.username}:${request.config.authCredentials.password}`
            );
            headers['Authorization'] = `Basic ${auth}`;
          }

          const axiosConfig: AxiosRequestConfig = {
            url: request.config.endpoint,
            method: request.config.method,
            headers,
            data: request.body ? JSON.parse(request.body) : undefined,
            params: request.params,
            onUploadProgress: (progressEvent) => {
              if (progressEvent.total) {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setProgress(percentCompleted);
              }
            },
          };

          const response: AxiosResponse = await axios(axiosConfig);
          const endTime = Date.now();
          setIsRetrying(false);

          return {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers as any,
            data: response.data,
            time: endTime - startTime,
          };
        } catch (err: any) {
          const endTime = Date.now();
          const axiosError = err as AxiosError;

          if (
            retryCount < maxRetries &&
            (axiosError.response?.status === 429 || (axiosError.response?.status && axiosError.response.status >= 500))
          ) {
            retryCount++;
            setIsRetrying(true);
            await delay(currentDelay);
            currentDelay = Math.min(currentDelay * 2, maxDelay);
            return performRequest();
          }

          const apiResponse: ApiResponse = {
            status: axiosError.response?.status || 0,
            statusText: axiosError.response?.statusText || 'Error',
            headers: (axiosError.response?.headers as any) || {},
            data: axiosError.response?.data || null,
            time: endTime - startTime,
            error: axiosError.message || 'An unknown error occurred',
          };

          setError(apiResponse.error || 'Failed to execute request');
          setIsRetrying(false);
          return apiResponse;
        }
      };

      const result = await performRequest();
      setIsLoading(false);
      setProgress(100);
      return result;
    },
    [maxRetries, initialDelay, maxDelay]
  );

  return { executeRequest, isLoading, progress, error, isRetrying };
}
