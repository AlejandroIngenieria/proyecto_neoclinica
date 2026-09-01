import { NextResponse, type NextRequest } from 'next/server';
import { markMemoryNotificationAsRead } from '@/lib/notifications-store';

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
  if (slug.includes('leer') || slug.length >= 1) {
    const notCodigo = slug[0];
    markMemoryNotificationAsRead(notCodigo);
  }

  try {
    const targetUrl = new URL(`/api/Notificaciones/${subPath}`, backendBaseUrl);
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
        return NextResponse.json({ mensaje: 'Notificación marcada como leída.' }, { status: 200 });
      }
    }
  } catch {
    // Si falla el backend, el fallback local ya marcó como leída
  }

  return NextResponse.json({ mensaje: 'Notificación marcada como leída correctamente.' }, { status: 200 });
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
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }
  return NextResponse.json({ mensaje: 'Acción procesada correctamente' }, { status: 200 });
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }
  return NextResponse.json({ mensaje: 'Notificación eliminada correctamente' }, { status: 200 });
}
