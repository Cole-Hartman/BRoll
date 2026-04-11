import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { immichApi } from '../api/immich';

interface AuthState {
  serverUrl: string;
  apiKey: string;
  isConfigured: boolean;
  isConnected: boolean;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  configure: (serverUrl: string, apiKey: string) => Promise<boolean>;
  disconnect: () => void;
  testConnection: () => Promise<boolean>;
}

const STORAGE_KEY = 'broll_auth';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    serverUrl: '',
    apiKey: '',
    isConfigured: false,
    isConnected: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const { serverUrl, apiKey } = JSON.parse(stored);
        if (serverUrl && apiKey) {
          immichApi.configure(serverUrl, apiKey);
          setState(prev => ({
            ...prev,
            serverUrl,
            apiKey,
            isConfigured: true,
            isLoading: true,
          }));

          immichApi.testConnection().then(connected => {
            setState(prev => ({
              ...prev,
              isConnected: connected,
              isLoading: false,
            }));
          });
          return;
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setState(prev => ({ ...prev, isLoading: false }));
  }, []);

  const configure = useCallback(async (serverUrl: string, apiKey: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    immichApi.configure(serverUrl, apiKey);
    const connected = await immichApi.testConnection();

    if (connected) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ serverUrl, apiKey }));
      setState({
        serverUrl,
        apiKey,
        isConfigured: true,
        isConnected: true,
        isLoading: false,
      });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }

    return connected;
  }, []);

  const disconnect = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    immichApi.configure('', '');
    setState({
      serverUrl: '',
      apiKey: '',
      isConfigured: false,
      isConnected: false,
      isLoading: false,
    });
  }, []);

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!state.isConfigured) return false;
    const connected = await immichApi.testConnection();
    setState(prev => ({ ...prev, isConnected: connected }));
    return connected;
  }, [state.isConfigured]);

  return (
    <AuthContext.Provider value={{ ...state, configure, disconnect, testConnection }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
