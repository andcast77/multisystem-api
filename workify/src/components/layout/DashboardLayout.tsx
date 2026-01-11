'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserWithRelations } from '@/types';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [user, setUser] = useState<UserWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/me')
      .then(res => {
        if (res.status === 200) return res.json();
        throw new Error();
      })
      .then(data => setUser(data.user))
      .catch(() => window.location.href = '/login')
      .finally(() => setIsLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Determinar si el usuario es admin o HR (case-insensitive, usando role.name)
  const userRoles = user.roles?.map(r => r.role?.name?.toLowerCase?.()) || [];
  const isAdminOrHR = userRoles.includes('admin') || userRoles.includes('hr');

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Empleados', href: '/employees', icon: '👥' },
    { name: 'Asignaciones Especiales', href: '/employees/special-assignments', icon: '📅' },
    { name: 'Horas Trabajadas', href: '/time-entries', icon: '⏰' },
    { name: 'Turnos', href: '/work-shifts', icon: '🕐' },
    ...(isAdminOrHR ? [{ name: 'Posiciones', href: '/positions', icon: '💼' }] : []),
    { name: 'Roles', href: '/roles', icon: '🔐' },
    { name: 'Configuración', href: '/settings', icon: '⚙️' },
  ];

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo/Brand */}
          <div className="flex h-16 items-center justify-center border-b border-gray-700">
            <h1 className="text-xl font-bold text-white">Workify</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Profile Section */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">Usuario</p>
                <p className="text-xs text-gray-400">{user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center">
              <h2 className="text-lg font-semibold text-gray-900">
                {navigation.find(item => isActive(item.href))?.name || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <span className="text-lg">🔔</span>
              </button>
              <button className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
                <span className="text-lg">👤</span>
              </button>
              <button 
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout; 