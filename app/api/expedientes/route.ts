import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function GET(request: Request) {
  const authorization = request.headers.get('authorization');
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  const response = await fetch(`${backendBaseUrl}/api/Expedientes`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return NextResponse.json(body, { status: response.status });
}

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  try {
    const bodyData = await request.json();

    const response = await fetch(`${backendBaseUrl}/api/Expedientes`, {
      method: 'POST',
      headers: {
        Authorization: authorization,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(bodyData),
      cache: 'no-store',
    });

    const contentType = response.headers.get('content-type') ?? '';
    let responseData: any;

    if (contentType.includes('application/json')) {
      responseData = await response.json();
    } else {
      const text = await response.text();
      responseData = text ? { message: text } : {};
    }

    if (!response.ok) {
      console.error(`[POST /api/expedientes] Backend respondió con status ${response.status}:`, responseData);
    }

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    console.error('[POST /api/expedientes] Error interno:', error);
    return NextResponse.json(
      { message: 'Error interno de conexión con el backend', error: error.message },
      { status: 500 }
    );
  }
}