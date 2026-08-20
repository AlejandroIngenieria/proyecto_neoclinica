import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ expCodigo: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const { expCodigo } = await context.params;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authorization) {
    headers['Authorization'] = authorization;
  }

  const response = await fetch(`${backendBaseUrl}/api/Expedientes/${expCodigo}`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return NextResponse.json(body, { status: response.status });
}

export async function PUT(request: Request, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const { expCodigo } = await context.params;

  try {
    const bodyData = await request.json();

    const response = await fetch(`${backendBaseUrl}/api/Expedientes/${expCodigo}`, {
      method: 'PUT',
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

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error interno al actualizar en backend', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const { expCodigo } = await context.params;

  try {
    const response = await fetch(`${backendBaseUrl}/api/Expedientes/${expCodigo}`, {
      method: 'DELETE',
      headers: {
        Authorization: authorization,
        Accept: 'application/json',
      },
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

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error interno al eliminar en backend', error: error.message },
      { status: 500 }
    );
  }
}