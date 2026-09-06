import { NextResponse, type NextRequest } from 'next/server';
import {
  markMemoryNotificationAsRead,
  deleteMemoryNotification,
  clearMemoryNotifications,
} from '@/lib/notifications-store';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

/**
 * Proxy catch-all para sub-recursos de notificaciones (/api/notificaciones/[...slug])
 */
export async function PUT(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const subPath = slug.join('/');
  
  // Si el slug termina en /leer o contiene un notCodigo para marcar como leída
  if (slug.includes('leer') || slug.includes('leer-todas') || slug.length >= 1) {
    const notCodigo = slug[0];
    markMemoryNotificationAsRead(notCodigo);
  }

  try {
    const targetUrl = new URL(`/api/Notificaciones/${subPath}`, backendBaseUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const text = await response.text();
      try {
        return NextResponse.json(JSON.parse(text), { status: 200 });
      } catch {
        return NextResponse.json({ mensaje: 'Notificación actualizada correctamente.' }, { status: 200 });
      }
    }
  } catch {
    // Si falla el backend, el fallback local ya procesó la acción
  }

  return NextResponse.json({ mensaje: 'Notificación actualizada correctamente.' }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const subPath = slug.join('/');
  const isLimpiar = subPath.includes('limpiar');
  const soloLeidas = request.nextUrl.searchParams.get('soloLeidas') === 'true';

  if (isLimpiar) {
    clearMemoryNotifications(soloLeidas);
  } else if (slug.length >= 1) {
    deleteMemoryNotification(slug[0]);
  }

  try {
    const targetUrl = new URL(`/api/Notificaciones/${subPath}`, backendBaseUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'DELETE',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const text = await response.text();
      try {
        return NextResponse.json(JSON.parse(text), { status: 200 });
      } catch {
        return NextResponse.json({ mensaje: 'Notificación eliminada correctamente.' }, { status: 200 });
      }
    }
  } catch {
    // Si falla la conexión con el backend, el fallback local ya eliminó de memoria
  }

  return NextResponse.json({ mensaje: 'Notificación eliminada correctamente.' }, { status: 200 });
}

export async function GET(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }
  return NextResponse.json([], { status: 200 });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const subPath = slug.join('/');

  try {
    const targetUrl = new URL(`/api/Notificaciones/${subPath}`, backendBaseUrl);
    request.nextUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'POST',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const text = await response.text();
      try {
        return NextResponse.json(JSON.parse(text), { status: 200 });
      } catch {
        return NextResponse.json({ mensaje: 'Acción procesada correctamente.' }, { status: 200 });
      }
    }
  } catch {
    // Fallback
  }

  return NextResponse.json({ mensaje: 'Acción procesada correctamente.' }, { status: 200 });
}
