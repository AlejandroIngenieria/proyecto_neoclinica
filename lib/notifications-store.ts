import type { NotificacionDto, CrearNotificacionRequest } from '@/types/notificacion';

// Almacenamiento en memoria para desarrollo si el backend C# aún no persiste notificaciones en BD
const memoryNotifications: NotificacionDto[] = [];

export function getMemoryNotifications(soloNoLeidas?: boolean): NotificacionDto[] {
  if (soloNoLeidas) {
    return memoryNotifications.filter((n) => !n.leida);
  }
  return [...memoryNotifications].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
}

export function addMemoryNotification(req: Partial<CrearNotificacionRequest>): NotificacionDto {
  const newNotif: NotificacionDto = {
    notCodigo: crypto.randomUUID(),
    tipo: req.tipo || 'cita',
    titulo: req.titulo || 'Nueva Notificación',
    mensaje: req.mensaje || 'Tienes una nueva actualización en tu cuenta.',
    leida: false,
    accionUrl: req.accionUrl || '/dashboard/citas',
    fecha: new Date().toISOString(),
  };

  memoryNotifications.unshift(newNotif);
  return newNotif;
}

export function markMemoryNotificationAsRead(notCodigo: string): boolean {
  if (notCodigo === 'all' || notCodigo === 'todas' || notCodigo === 'leer-todas') {
    memoryNotifications.forEach((n) => (n.leida = true));
    return true;
  }
  const notif = memoryNotifications.find((n) => n.notCodigo === notCodigo);
  if (notif) {
    notif.leida = true;
    return true;
  }
  return false;
}

export function deleteMemoryNotification(notCodigo: string): boolean {
  const idx = memoryNotifications.findIndex((n) => n.notCodigo === notCodigo);
  if (idx !== -1) {
    memoryNotifications.splice(idx, 1);
    return true;
  }
  return false;
}

export function clearMemoryNotifications(soloLeidas?: boolean): void {
  if (soloLeidas) {
    const unread = memoryNotifications.filter((n) => !n.leida);
    memoryNotifications.length = 0;
    memoryNotifications.push(...unread);
  } else {
    memoryNotifications.length = 0;
  }
}

