import { headers } from 'next/headers';
import { UserWithRelations } from '@/types';
import { useEffect, useState } from 'react';

// Definir el tipo AuthContextType localmente
interface AuthContextType {
  user: UserWithRelations | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    companyName: string;
    firstName: string;
    lastName: string;
  }) => Promise<void>;
}

// ========================================
// TIPOS DE AUTENTICACIÓN
// ========================================

export interface UserInfo {
  userId: string;
  email: string;
  companyId: string;
}

// ========================================
// FUNCIONES DE AUTENTICACIÓN DEL SERVIDOR
// ========================================

export async function getCurrentUser(): Promise<UserInfo | null> {
  try {
    const headersList = await headers();
    const userId = headersList.get('x-user-id');
    const email = headersList.get('x-user-email');
    const companyId = headersList.get('x-company-id');

    if (!userId || !email || !companyId) {
      return null;
    }

    return {
      userId,
      email,
      companyId,
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
}

export async function requireAuth(): Promise<UserInfo> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Authentication required');
  }
  return user;
}

// ========================================
// FUNCIONES DE AUTENTICACIÓN DEL CLIENTE
// ========================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export async function checkAuthStatus(): Promise<UserWithRelations | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include',
    });
    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return null;
  }
}

export async function loginUser(credentials: { email: string; password: string }): Promise<UserWithRelations> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const data = await response.json();
  return data.user;
}

export async function logoutUser(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, { 
    method: 'POST',
    credentials: 'include',
  });
  window.location.href = '/login';
}

export async function registerUser(data: {
  email: string;
  password: string;
  companyName: string;
  firstName: string;
  lastName: string;
}): Promise<UserWithRelations> {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error('Registration failed');
  }

  const responseData = await response.json();
  return responseData.user;
}

// ========================================
// HOOK DE AUTENTICACIÓN PARA REACT
// ========================================

export function useAuth(): AuthContextType {
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un usuario autenticado al cargar
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await checkAuthStatus();
      setUser(userData);
    } catch (error) {
      console.error('Error checking auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials: { email: string; password: string }) => {
    const userData = await loginUser(credentials);
    setUser(userData);
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
  };

  const register = async (data: {
    email: string;
    password: string;
    companyName: string;
    firstName: string;
    lastName: string;
  }) => {
    const userData = await registerUser(data);
    setUser(userData);
  };

  return {
    user,
    loading,
    login,
    logout,
    register,
  };
} 