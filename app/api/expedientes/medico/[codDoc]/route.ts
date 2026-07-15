import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function GET(request: Request, { params }: { params: Promise<{ codDoc: string }> }) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const { codDoc } = await params;

  try {
    const response = await fetch(`${backendBaseUrl}/api/Expedientes/medico/${codDoc}`, {
      method: 'GET',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();

    return NextResponse.json(body, { status: response.status });
  } catch (error) {
    console.error(`Error en proxy a /api/Expedientes/medico/${codDoc}:`, error);
    return NextResponse.json(
      { message: 'Error interno de conexión con el backend' },
      { status: 500 }
    );
  }
}
