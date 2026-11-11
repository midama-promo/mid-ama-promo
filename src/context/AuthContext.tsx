import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isImpersonating: boolean;
  impersonatedClientName: string | null;
  requestLoginOtp: (email: string) => Promise<string>;
  verifyLoginOtp: (email: string, code: string) => Promise<User>;
  accessClientAccount: (clientId: string) => Promise<User>;
  exitClientAccount: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUserDirectly: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isImpersonating, setIsImpersonating] = useState<boolean>(() => {
    return typeof window !== 'undefined' && Boolean(sessionStorage.getItem('midama_admin_return_token'));
  });
  const [impersonatedClientName, setImpersonatedClientName] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? sessionStorage.getItem('midama_admin_return_name') : null;
  });

  const refreshUser = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
    } catch (err) {
      console.warn('Session check failed or expired', err);
      // A failed bootstrap check must not issue /logout: a transient request failure
      // would otherwise erase the valid HttpOnly session cookie. Keep the cookie intact.
      api.clearLocalToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const requestLoginOtp = async (email: string): Promise<string> => {
    const normalizedEmail = email.trim().toLowerCase();
    // One authoritative flow: sends ONE /api/auth/request-otp request to server,
    // which issues and emails one Resend OTP for a registered account.
    const serverRes = await api.requestLoginOtp(normalizedEmail);
    return serverRes.message || 'If this email is registered with Mid-Ama Promo, a one-time login code has been sent. Check your inbox and spam folder.';
  };

  const verifyLoginOtp = async (email: string, code: string): Promise<User> => {
    sessionStorage.removeItem('midama_admin_return_token');
    sessionStorage.removeItem('midama_admin_return_name');
    setIsImpersonating(false);
    setImpersonatedClientName(null);

    const normalizedEmail = email.trim().toLowerCase();
    const tokenStr = code.trim();

    // One authoritative flow: sends ONE /api/auth/verify-otp request to server,
    // which verifies the Resend OTP and establishes the application session.
    const res = await api.verifyLoginOtp(normalizedEmail, tokenStr);
    setUser(res.user);
    return res.user;
  };

  const accessClientAccount = async (clientId: string): Promise<User> => {
    const adminToken = api.getToken();
    if (!adminToken) {
      throw new Error('You must be signed in as an administrator to access a client account.');
    }
    const res = await api.adminAccessClientAccount(clientId);
    // Securely back up admin token in sessionStorage so the administrator can seamlessly exit back
    sessionStorage.setItem('midama_admin_return_token', adminToken);
    sessionStorage.setItem('midama_admin_return_name', res.client.name);
    setIsImpersonating(true);
    setImpersonatedClientName(res.client.name);
    api.setToken(res.token);
    setUser(res.client);
    return res.client;
  };

  const exitClientAccount = async (): Promise<void> => {
    const adminToken = sessionStorage.getItem('midama_admin_return_token');
    sessionStorage.removeItem('midama_admin_return_token');
    sessionStorage.removeItem('midama_admin_return_name');
    setIsImpersonating(false);
    setImpersonatedClientName(null);
    if (adminToken) {
      api.setToken(adminToken);
      await refreshUser();
    } else {
      api.logout();
      setUser(null);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('midama_admin_return_token');
    sessionStorage.removeItem('midama_admin_return_name');
    setIsImpersonating(false);
    setImpersonatedClientName(null);
    void api.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isImpersonating,
        impersonatedClientName,
        requestLoginOtp,
        verifyLoginOtp,
        accessClientAccount,
        exitClientAccount,
        logout,
        refreshUser,
        setUserDirectly: setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
