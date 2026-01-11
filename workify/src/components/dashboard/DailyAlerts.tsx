'use client';

import React from 'react';
import { useAttendanceStats } from '@/hooks/api/useAttendanceStats';
import { Card } from '@/components/ui/layout/Card';
import { Badge } from '@/components/ui/data/Badge';
import { 
  AlertTriangle, 
  Clock, 
  UserX, 
  Coffee,
  CheckCircle,
  Loader2,
  Calendar,
  PartyPopper
} from 'lucide-react';

export function DailyAlerts() {
  const { stats, loading, error } = useAttendanceStats();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Cargando alertas...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">Error al cargar alertas: {error}</span>
        </div>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const alerts = [];

  // Alerta principal: Día no laborable
  if (!stats.isWorkDay) {
    alerts.push({
      type: 'info',
      icon: PartyPopper,
      title: 'Día No Laborable',
      message: stats.workDayReason || 'Hoy no es un día laborable',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    });

    // Si es un día no laborable, no mostrar otras alertas de asistencia
    return (
      <div className="space-y-3">
        {alerts.map((alert, index) => {
          const Icon = alert.icon;
          
          return (
            <Card key={index} className={`p-4 border-l-4 ${alert.borderColor} ${alert.bgColor}`}>
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 ${alert.color}`} />
                <div className="flex-1">
                  <h4 className={`font-medium ${alert.color}`}>
                    {alert.title}
                  </h4>
                  <p className="text-sm text-gray-700 mt-1">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    No hay empleados programados para trabajar hoy
                  </p>
                </div>
                <Badge 
                  variant="outline"
                  className="text-xs"
                >
                  Info
                </Badge>
              </div>
            </Card>
          );
        })}
      </div>
    );
  }

  // Alerta por tardanzas (solo si es día laborable)
  if (stats.employeesLate > 0) {
    alerts.push({
      type: 'warning',
      icon: Clock,
      title: 'Tardanzas Detectadas',
      message: `${stats.employeesLate} empleado${stats.employeesLate > 1 ? 's' : ''} llegó tarde hoy`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    });
  }

  // Alerta por ausencias (solo si es día laborable)
  if (stats.employeesAbsent > 0) {
    alerts.push({
      type: 'error',
      icon: UserX,
      title: 'Ausencias Reportadas',
      message: `${stats.employeesAbsent} de ${stats.employeesScheduled} empleado${stats.employeesScheduled > 1 ? 's' : ''} programado${stats.employeesScheduled > 1 ? 's' : ''} no asistió hoy`,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    });
  }

  // Alerta por empleados en descanso
  if (stats.employeesOnBreak > 0) {
    alerts.push({
      type: 'info',
      icon: Coffee,
      title: 'Empleados en Descanso',
      message: `${stats.employeesOnBreak} empleado${stats.employeesOnBreak > 1 ? 's' : ''} está en pausa`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    });
  }

  // Mensaje positivo si no hay problemas y es día laborable
  if (alerts.length === 0 && stats.employeesWorking > 0) {
    alerts.push({
      type: 'success',
      icon: CheckCircle,
      title: 'Todo en Orden',
      message: `${stats.employeesWorking} de ${stats.employeesScheduled} empleado${stats.employeesScheduled > 1 ? 's' : ''} programado${stats.employeesScheduled > 1 ? 's' : ''} trabajando normalmente`,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    });
  }

  // Si no hay empleados programados pero es día laborable
  if (alerts.length === 0 && stats.employeesScheduled === 0) {
    alerts.push({
      type: 'info',
      icon: Calendar,
      title: 'Sin Empleados Programados',
      message: 'No hay empleados programados para trabajar hoy',
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    });
  }

  if (alerts.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm">No hay alertas para mostrar</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => {
        const Icon = alert.icon;
        
        return (
          <Card key={index} className={`p-4 border-l-4 ${alert.borderColor} ${alert.bgColor}`}>
            <div className="flex items-start gap-3">
              <Icon className={`h-5 w-5 mt-0.5 ${alert.color}`} />
              <div className="flex-1">
                <h4 className={`font-medium ${alert.color}`}>
                  {alert.title}
                </h4>
                <p className="text-sm text-gray-700 mt-1">
                  {alert.message}
                </p>
              </div>
              <Badge 
                variant={alert.type === 'success' ? 'default' : 
                        alert.type === 'warning' ? 'secondary' : 
                        alert.type === 'error' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {alert.type === 'success' ? 'Éxito' :
                 alert.type === 'warning' ? 'Advertencia' :
                 alert.type === 'error' ? 'Error' : 'Info'}
              </Badge>
            </div>
          </Card>
        );
      })}
    </div>
  );
} 