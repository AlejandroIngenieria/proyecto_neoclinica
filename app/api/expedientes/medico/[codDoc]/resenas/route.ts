import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function GET(request: Request, { params }: { params: Promise<{ codDoc: string }> }) {
  const authorization = request.headers.get('authorization');
  const { codDoc } = await params;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  try {
    const response = await fetch(`${backendBaseUrl}/api/Expedientes/medico/${codDoc}/resenas`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    const body = contentType.includes('application/json') ? await response.json() : await response.text();

    return NextResponse.json(body, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error al obtener las reseñas del médico', error: error.message },
      { status: 500 }
    );
  }
}
