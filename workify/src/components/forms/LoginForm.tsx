'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button, Input } from '@/components/ui';

// Función para generar token CSRF
function generateCSRFToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Función para sanitizar input
function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/[<>]/g, '') // Remover caracteres peligrosos
    .replace(/javascript:/gi, '') // Remover javascript: protocol
    .replace(/data:/gi, '') // Remover data: protocol
    .replace(/vbscript:/gi, '') // Remover vbscript: protocol
    .substring(0, 100); // Limitar longitud
}

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, startTransition] = useTransition();
  const [csrfToken, setCsrfToken] = useState('');

  // Generar token CSRF al montar el componente
  useEffect(() => {
    setCsrfToken(generateCSRFToken());
  }, []);

  // Validar email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 100;
  };

  // Validar contraseña
  const validatePassword = (password: string): boolean => {
    return password.length >= 6 && password.length <= 128;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedEmail = sanitizeInput(e.target.value);
    setEmail(sanitizedEmail);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedPassword = sanitizeInput(e.target.value);
    setPassword(sanitizedPassword);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones del lado del cliente
    if (!email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (!validateEmail(email)) {
      setError('Formato de email inválido');
      return;
    }

    if (!validatePassword(password)) {
      setError('La contraseña debe tener entre 6 y 128 caracteres');
      return;
    }

    // Validar token CSRF
    if (!csrfToken) {
      setError('Error de seguridad. Recarga la página e intenta de nuevo.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          credentials: 'include',
          body: JSON.stringify({ 
            email: email.toLowerCase().trim(), 
            password,
            csrfToken 
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Error al iniciar sesión');
          return;
        }

        const data = await response.json();
        
        // Validar respuesta del servidor
        if (!data.user || !data.token) {
          setError('Respuesta del servidor inválida');
          return;
        }

        // Redirigir solo si la respuesta es válida
        window.location.href = '/dashboard';
      } catch (error) {
        console.error('Error de login:', error);
        setError('Error de conexión. Inténtalo de nuevo.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Iniciar Sesión</h1>
            <p className="text-sm sm:text-base text-gray-600">Accede a tu cuenta</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Token CSRF oculto */}
            <input type="hidden" name="csrfToken" value={csrfToken} />
            
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="tu@email.com"
              required
              disabled={isLoading}
              maxLength={100}
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              value={password}
              onChange={handlePasswordChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
              maxLength={128}
              autoComplete="current-password"
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 sm:px-4 sm:py-3 rounded-md text-xs sm:text-sm">{error}</div>
            )}
            <Button
              type="submit"
              disabled={isLoading}
              loading={isLoading}
              className="w-full"
            >
              {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
            </Button>
            <div className="text-center">
              <a href="#" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors">¿Olvidaste tu contraseña?</a>
            </div>
          </form>
          <div className="mt-6 sm:mt-8 text-center">
            <p className="text-xs text-gray-500">© 2024 Workify</p>
          </div>
        </div>
      </div>
    </div>
  );
} 