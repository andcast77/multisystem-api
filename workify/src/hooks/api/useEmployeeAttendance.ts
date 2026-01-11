'use client';

import { useState, useEffect, useCallback } from 'react';

interface AttendanceDay {
  date: Date;
  dayOfWeek: number;
  dayName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  clockIn: Date | null;
  clockOut: Date | null;
  status: 'not_scheduled' | 'present' | 'late' | 'absent';
  isLate: boolean;
  hasIncident: boolean;
  notes: string;
  isWorkDay: boolean;
}

interface MonthlyKPIs {
  totalDays: number;
  workDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  incidents: number;
  totalHours: number;
}

interface EmployeeAttendanceData {
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    position: string | null;
    department: string | null;
  };
  month: string;
  attendance: AttendanceDay[];
  kpis: MonthlyKPIs;
}

interface UseEmployeeAttendanceReturn {
  data: EmployeeAttendanceData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useEmployeeAttendance(
  employeeId: string, 
  month?: string
): UseEmployeeAttendanceReturn {
  const [data, setData] = useState<EmployeeAttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!employeeId) return;

    try {
      setLoading(true);
      setError(null);

      const monthParam = month || new Date().toISOString().slice(0, 7); // YYYY-MM
      const url = `/api/employees/${employeeId}/attendance?month=${monthParam}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Error al obtener datos de asistencia');
      }

      const result = await response.json();
      
      // Convertir fechas de string a Date
      const attendanceWithDates = result.attendance.map((day: AttendanceDay & { date: string; clockIn: string | null; clockOut: string | null }) => ({
        ...day,
        date: new Date(day.date),
        clockIn: day.clockIn ? new Date(day.clockIn) : null,
        clockOut: day.clockOut ? new Date(day.clockOut) : null,
      }));

      setData({
        ...result,
        attendance: attendanceWithDates
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
} 