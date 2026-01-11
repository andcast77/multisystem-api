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

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    firstName: '',
    lastName: ''
  });
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
    return password.length >= 8 && password.length <= 128;
  };

  // Validar complejidad de contraseña
  const validatePasswordComplexity = (password: string): boolean => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    return hasUpperCase && hasLowerCase && hasNumbers;
  };

  // Validar nombre de empresa
  const validateCompanyName = (name: string): boolean => {
    return name.length >= 2 && name.length <= 100;
  };

  // Validar nombres
  const validateName = (name: string): boolean => {
    return name.length >= 1 && name.length <= 50;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const sanitizedValue = sanitizeInput(value);
    
    setFormData(prev => ({
      ...prev,
      [name]: sanitizedValue
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones del lado del cliente
    if (!formData.firstName.trim()) {
      setError('El nombre es requerido');
      return;
    }

    if (!formData.lastName.trim()) {
      setError('El apellido es requerido');
      return;
    }

    if (!formData.companyName.trim()) {
      setError('El nombre de la empresa es requerido');
      return;
    }

    if (!formData.email.trim()) {
      setError('El email es requerido');
      return;
    }

    if (!formData.password.trim()) {
      setError('La contraseña es requerida');
      return;
    }

    if (!formData.confirmPassword.trim()) {
      setError('La confirmación de contraseña es requerida');
      return;
    }

    // Validaciones específicas
    if (!validateName(formData.firstName)) {
      setError('El nombre debe tener entre 1 y 50 caracteres');
      return;
    }

    if (!validateName(formData.lastName)) {
      setError('El apellido debe tener entre 1 y 50 caracteres');
      return;
    }

    if (!validateCompanyName(formData.companyName)) {
      setError('El nombre de la empresa debe tener entre 2 y 100 caracteres');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Formato de email inválido');
      return;
    }

    if (!validatePassword(formData.password)) {
      setError('La contraseña debe tener entre 8 y 128 caracteres');
      return;
    }

    if (!validatePasswordComplexity(formData.password)) {
      setError('La contraseña debe contener mayúsculas, minúsculas y números');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    // Validar token CSRF
    if (!csrfToken) {
      setError('Error de seguridad. Recarga la página e intenta de nuevo.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken
          },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            companyName: formData.companyName.trim(),
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            csrfToken
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Error al registrar');
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
        console.error('Error de registro:', error);
        setError('Error de conexión. Inténtalo de nuevo.');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md sm:max-w-lg">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
            <p className="text-sm sm:text-base text-gray-600">Registra tu empresa</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Token CSRF oculto */}
            <input type="hidden" name="csrfToken" value={csrfToken} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Nombre"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
                disabled={isLoading}
                maxLength={50}
                autoComplete="given-name"
              />
              <Input
                label="Apellido"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
                disabled={isLoading}
                maxLength={50}
                autoComplete="family-name"
              />
            </div>
            <Input
              label="Nombre de la Empresa"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              required
              disabled={isLoading}
              maxLength={100}
              autoComplete="organization"
            />
            <Input
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              disabled={isLoading}
              maxLength={100}
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
              maxLength={128}
              autoComplete="new-password"
            />
            <Input
              label="Confirmar Contraseña"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              required
              disabled={isLoading}
              maxLength={128}
              autoComplete="new-password"
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
              {isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </Button>
            <div className="text-center">
              <a href="/login" className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 transition-colors">
                ¿Ya tienes cuenta? Inicia sesión
              </a>
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