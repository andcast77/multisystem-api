'use client';

import { useState, useEffect } from 'react';

interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  inactiveEmployees: number;
  suspendedEmployees: number;
  totalRoles: number;
  totalDepartments: number;
  // Estadísticas de hoy
  todayScheduled: number;
  todayActive: number;
  isWorkDay: boolean;
  workDayReason?: string;
}

interface DepartmentStat {
  name: string;
  count: number;
}

interface RecentActivity {
  id: string;
  name: string;
  position: string;
  department: string;
  dateJoined: string;
  createdAt: string;
  type: string;
  message: string;
}

interface DashboardData {
  stats: DashboardStats;
  departmentStats: DepartmentStat[];
  recentActivity: RecentActivity[];
  company: {
    name: string;
  };
}

export function useDashboardStats() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch('/api/dashboard/stats');
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard stats');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const refetch = () => {
    setLoading(true);
    setError(null);
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return {
    stats: data?.stats,
    departmentStats: data?.departmentStats || [],
    recentActivity: data?.recentActivity || [],
    company: data?.company,
    loading,
    error,
    refetch,
  };
} 