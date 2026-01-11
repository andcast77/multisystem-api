import { useEffect, useState, useCallback } from 'react';

export interface Position {
  id: string;
  name: string;
  description?: string;
  companyId: string;
}

export function usePositions() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/positions');
      if (!res.ok) throw new Error('Error al obtener cargos');
      const data = await res.json();
      setPositions(data.positions || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  const getPositionById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/positions/${id}`);
      if (!res.ok) throw new Error('Error al obtener el cargo');
      const data = await res.json();
      return data.position;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  return { positions, loading, error, refetch: fetchPositions, getPositionById };
} 