'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

const DEFAULT_SAAS_URL = 'https://api.stockscan.uk';
const STORAGE_KEY = 'stockscan_server_url';
const STORAGE_LABEL_KEY = 'stockscan_server_label';
const STORAGE_TYPE_KEY = 'stockscan_server_type';

export type ServerType = 'saas' | 'enterprise';

export interface ServerConnection {
  url: string;
  label: string;
  type: ServerType;
}

export interface ConnectionTestResult {
  success: boolean;
  version?: string;
  serverName?: string;
  responseTime?: number;
  error?: string;
}

interface ServerConnectionContextType {
  connection: ServerConnection;
  setConnection: (conn: ServerConnection) => void;
  isDefault: boolean;
  testConnection: (url: string) => Promise<ConnectionTestResult>;
}

const ServerConnectionContext = createContext<ServerConnectionContextType | undefined>(undefined);

export function ServerConnectionProvider({ children }: { children: ReactNode }) {
  const [connection, setConnectionState] = useState<ServerConnection>({
    url: DEFAULT_SAAS_URL,
    label: 'StockScan Cloud',
    type: 'saas',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const savedUrl = localStorage.getItem(STORAGE_KEY);
    const savedLabel = localStorage.getItem(STORAGE_LABEL_KEY);
    const savedType = localStorage.getItem(STORAGE_TYPE_KEY) as ServerType | null;
    if (savedUrl) {
      setConnectionState({
        url: savedUrl,
        label: savedLabel || (savedType === 'enterprise' ? 'Enterprise Server' : 'StockScan Cloud'),
        type: savedType || 'saas',
      });
    }
  }, []);

  const setConnection = useCallback((conn: ServerConnection) => {
    // Normalize URL - remove trailing slash
    const normalizedUrl = conn.url.replace(/\/+$/, '');
    const normalized = { ...conn, url: normalizedUrl };
    setConnectionState(normalized);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, normalized.url);
      localStorage.setItem(STORAGE_LABEL_KEY, normalized.label);
      localStorage.setItem(STORAGE_TYPE_KEY, normalized.type);
    }
  }, []);

  const isDefault = connection.url === DEFAULT_SAAS_URL;

  const testConnection = useCallback(async (url: string): Promise<ConnectionTestResult> => {
    const normalizedUrl = url.replace(/\/+$/, '');
    const startTime = Date.now();
    try {
      // Try the health/status endpoint first, then fall back to a simple GET
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      
      let response: Response | null = null;
      let data: any = null;
      
      // Try common health endpoints
      const endpoints = ['/api/health', '/health', '/api/status', '/api'];
      for (const ep of endpoints) {
        try {
          response = await fetch(`${normalizedUrl}${ep}`, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
          });
          if (response.ok) {
            try { data = await response.json(); } catch { data = {}; }
            break;
          }
        } catch {
          continue;
        }
      }
      
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      
      if (response && response.ok) {
        return {
          success: true,
          version: data?.version || data?.apiVersion || undefined,
          serverName: data?.name || data?.serverName || undefined,
          responseTime,
        };
      }
      
      // Even a non-ok response means the server is reachable
      if (response) {
        return {
          success: true,
          responseTime,
        };
      }
      
      return { success: false, error: 'Could not reach server. Check the URL and try again.' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, error: 'Connection timed out after 10 seconds.' };
      }
      return { success: false, error: err?.message || 'Connection failed.' };
    }
  }, []);

  return (
    <ServerConnectionContext.Provider value={{ connection, setConnection, isDefault, testConnection }}>
      {children}
    </ServerConnectionContext.Provider>
  );
}

export function useServerConnection() {
  const ctx = useContext(ServerConnectionContext);
  if (!ctx) throw new Error('useServerConnection must be used within ServerConnectionProvider');
  return ctx;
}

export { DEFAULT_SAAS_URL };
