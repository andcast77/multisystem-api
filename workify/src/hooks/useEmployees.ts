'use client';

import { useState, useEffect } from 'react';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  position: string | null;
  department: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  dateJoined: string | null;
  idNumber: string;
  user: {
    id: string;
    email: string;
  } | null;
}

interface EmployeesResponse {
  employees: Employee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

interface UseEmployeesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
}

export function useEmployees(options: UseEmployeesOptions = {}) {
  const [data, setData] = useState<EmployeesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, limit = 10, search = '', status = '', department = '' } = options;

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
          ...(search && { search }),
          ...(status && { status }),
          ...(department && { department }),
        });

        const response = await fetch(`/api/employees?${params}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }

        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchEmployees();
  }, [page, limit, search, status, department]);

  const refetch = () => {
    setLoading(true);
    setError(null);
    // Trigger useEffect again
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status }),
      ...(department && { department }),
    });
    
    fetch(`/api/employees?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  };

  return {
    employees: data?.employees || [],
    pagination: data?.pagination,
    stats: data?.stats,
    loading,
    error,
    refetch,
  };
} 