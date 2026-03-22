'use client';

import React from 'react';
import { ApiResponse } from '../types';
import { Card, CardHeader, CardContent } from './ui-base';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Clock, CheckCircle, XCircle, Copy, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponseViewerProps {
  response: ApiResponse | null;
  isLoading: boolean;
  progress: number;
  isRetrying?: boolean;
}

export function ResponseViewer({ response, isLoading, progress, isRetrying }: ResponseViewerProps) {
  const [copying, setCopying] = React.useState(false);

  const handleCopy = () => {
    if (!response) return;
    navigator.clipboard.writeText(JSON.stringify(response.data, null, 2));
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleDownload = () => {
    if (!response) return;
    const blob = new Blob([JSON.stringify(response.data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `api-response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="h-64 flex flex-col items-center justify-center space-y-4">
          <div className="w-64 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all duration-300",
                isRetrying ? "bg-orange-500 animate-pulse" : "bg-blue-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 font-medium text-center">
            {isRetrying ? (
              <span className="text-orange-600 font-bold flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin-reverse" />
                Rate limited. Retrying with exponential backoff...
              </span>
            ) : (
              `Processing request... ${progress}%`
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!response) {
    return (
      <Card>
        <CardContent className="h-64 flex flex-col items-center justify-center text-gray-400 space-y-2">
          <Clock className="w-12 h-12 stroke-1" />
          <p className="text-sm font-medium">Send a request to see the response</p>
        </CardContent>
      </Card>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1.5',
              isSuccess ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            )}
          >
            {isSuccess ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            Status: {response.status} {response.statusText}
          </div>
          <div className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            Time: {response.time}ms
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Copy response"
          >
            <Copy className={cn('w-4 h-4', copying && 'text-green-500')} />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Download response"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden border-none shadow-none">
        <SyntaxHighlighter
          language="json"
          style={atomDark}
          customStyle={{
            margin: 0,
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            padding: '1.5rem',
            maxHeight: '600px',
          }}
        >
          {JSON.stringify(response.data, null, 2)}
        </SyntaxHighlighter>
      </Card>

      {response.error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="text-sm font-bold text-red-700 mb-1">Request Error</h4>
          <p className="text-sm text-red-600">{response.error}</p>
        </div>
      )}

      <Card>
        <CardHeader title="Headers" />
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b border-gray-50 pb-1 last:border-0">
                <span className="text-xs font-mono font-bold text-gray-500">{key}</span>
                <span className="text-xs font-mono text-gray-700 truncate ml-4" title={value}>
                  {value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
