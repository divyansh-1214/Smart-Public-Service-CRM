'use client';

import React from 'react';
import { HttpMethod, ApiConfig, ApiHeader } from '../types';
import { Button, Input, Card, CardHeader, CardContent } from './ui-base';
import { Plus, Trash, Shield, Globe, Key, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigPanelProps {
  config: ApiConfig;
  onChange: (config: ApiConfig) => void;
  disabled?: boolean;
}

const mockApis = [
  {
    name: 'JSONPlaceholder - Get Post',
    endpoint: 'https://jsonplaceholder.typicode.com/posts/1',
    method: 'GET' as HttpMethod,
  },
  {
    name: 'JSONPlaceholder - Create Post',
    endpoint: 'https://jsonplaceholder.typicode.com/posts',
    method: 'POST' as HttpMethod,
  },
  {
    name: 'Mocky - 200 OK',
    endpoint: 'https://run.mocky.io/v3/d0c399a7-8656-4b4f-8086-44485573427d',
    method: 'GET' as HttpMethod,
  },
];

export function ConfigPanel({ config, onChange, disabled }: ConfigPanelProps) {
  const loadMock = (mock: typeof mockApis[0]) => {
    onChange({
      ...config,
      endpoint: mock.endpoint,
      method: mock.method,
    });
  };
  const handleHeaderAdd = () => {
    onChange({
      ...config,
      headers: [...config.headers, { key: '', value: '' }],
    });
  };

  const handleHeaderRemove = (index: number) => {
    onChange({
      ...config,
      headers: config.headers.filter((_, i) => i !== index),
    });
  };

  const handleHeaderChange = (index: number, key: keyof ApiHeader, value: string) => {
    const newHeaders = [...config.headers];
    newHeaders[index] = { ...newHeaders[index], [key]: value };
    onChange({ ...config, headers: newHeaders });
  };

  const handleAuthChange = (type: ApiConfig['authType']) => {
    onChange({ ...config, authType: type });
  };

  const handleCredentialChange = (key: string, value: string) => {
    onChange({
      ...config,
      authCredentials: {
        ...config.authCredentials,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Endpoint Configuration"
          description="Define your API endpoint and request method."
        />
        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest self-center mr-2">
              Mock Presets:
            </span>
            {mockApis.map((mock) => (
              <Button
                key={mock.name}
                variant="outline"
                size="sm"
                className="text-[10px] h-8"
                onClick={() => loadMock(mock)}
                disabled={disabled}
              >
                <Database className="w-3 h-3 mr-1" />
                {mock.name}
              </Button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/4">
              <label className="text-sm font-medium text-gray-700 block mb-1">Method</label>
              <select
                disabled={disabled}
                value={config.method}
                onChange={(e) => onChange({ ...config, method: e.target.value as HttpMethod })}
                className="w-full h-10 px-3 py-2 rounded-md border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {['GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Input
                label="Endpoint URL"
                placeholder="https://api.example.com/v1/resource"
                value={config.endpoint}
                onChange={(e) => onChange({ ...config, endpoint: e.target.value })}
                disabled={disabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Authentication"
          description="Select and configure your authentication strategy."
        />
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(['none', 'basic', 'bearer'] as const).map((type) => (
              <Button
                key={type}
                variant={config.authType === type ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleAuthChange(type)}
                disabled={disabled}
              >
                <Shield className="w-3.5 h-3.5 mr-2" />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>

          {config.authType === 'bearer' && (
            <Input
              label="Bearer Token"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              value={config.authCredentials?.token || ''}
              onChange={(e) => handleCredentialChange('token', e.target.value)}
              disabled={disabled}
            />
          )}

          {config.authType === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Username"
                placeholder="admin"
                value={config.authCredentials?.username || ''}
                onChange={(e) => handleCredentialChange('username', e.target.value)}
                disabled={disabled}
              />
              <Input
                label="Password"
                type="password"
                placeholder="********"
                value={config.authCredentials?.password || ''}
                onChange={(e) => handleCredentialChange('password', e.target.value)}
                disabled={disabled}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Headers"
          description="Custom headers to include with the request."
        />
        <CardContent className="space-y-4">
          {config.headers.map((header, index) => (
            <div key={index} className="flex gap-2 items-end">
              <div className="flex-1">
                <Input
                  placeholder="Key"
                  value={header.key}
                  onChange={(e) => handleHeaderChange(index, 'key', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Value"
                  value={header.value}
                  onChange={(e) => handleHeaderChange(index, 'value', e.target.value)}
                  disabled={disabled}
                />
              </div>
              <Button
                variant="danger"
                size="icon"
                onClick={() => handleHeaderRemove(index)}
                disabled={disabled}
              >
                <Trash className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleHeaderAdd} disabled={disabled}>
            <Plus className="w-4 h-4 mr-2" />
            Add Header
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
