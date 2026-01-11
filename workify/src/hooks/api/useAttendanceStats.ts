'use client';

import { useState, useEffect, useCallback } from 'react';
import { DailyAttendanceStats } from '@/services/attendance.service';

interface UseAttendanceStatsReturn {
  stats: DailyAttendanceStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAttendanceStats(date?: Date): UseAttendanceStatsReturn {
  const [stats, setStats] = useState<DailyAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const dateParam = date ? date.toISOString().split('T')[0] : '';
      const url = `/api/attendance/stats${dateParam ? `?date=${dateParam}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al obtener estadísticas de asistencia');
      }

      const data = await response.json();
      setStats(data.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  };
} 