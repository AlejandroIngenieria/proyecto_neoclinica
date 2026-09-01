import { NextResponse, type NextRequest } from 'next/server';
import { getMemoryNotifications, addMemoryNotification } from '@/lib/notifications-store';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

/**
 * GET /api/notificaciones
 * Obtener notificaciones con soporte híbrido de almacenamiento
 */
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const soloNoLeidas = searchParams.get('soloNoLeidas') === 'true';

  try {
    const targetUrl = new URL('/api/Notificaciones', backendBaseUrl);
    searchParams.forEach((value, key) => {
      targetUrl.searchParams.set(key, value);
    });

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        const backendData = await response.json();
        if (Array.isArray(backendData) && backendData.length > 0) {
          return NextResponse.json(backendData, { status: 200 });
        }
      }
    }
  } catch (error) {
    // Backend inalcanzable, usar almacenamiento híbrido
  }

  // Fallback a almacenamiento local en memoria
  const localNotifs = getMemoryNotifications(soloNoLeidas);
  return NextResponse.json(localNotifs, { status: 200 });
}

/**
 * POST /api/notificaciones
 * Crear una nueva notificación
 */
export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  try {
    const bodyData = await request.json();

    // Guardar siempre en memoria local para garantizar entrega en frontend
    const localCreated = addMemoryNotification(bodyData);

    // Intentar replicar al backend en segundo plano
    try {
      await fetch(`${backendBaseUrl}/api/Notificaciones`, {
        method: 'POST',
        headers: {
          Authorization: authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(bodyData),
        cache: 'no-store',
      });
    } catch {
      // Ignorar fallo de réplica si el endpoint backend no existe aún
    }

    return NextResponse.json(localCreated, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/notificaciones] Error:', error);
    return NextResponse.json(
      { message: 'Error al procesar la notificación', error: error.message },
      { status: 500 }
    );
  }
}
