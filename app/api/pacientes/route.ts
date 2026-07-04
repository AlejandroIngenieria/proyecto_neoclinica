import { NextResponse, type NextRequest } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

/**
 * Proxy para /api/pacientes (sin sub-path).
 * GET  → lista pacientes
 * POST → crear paciente titular
 */

async function proxyBase(request: NextRequest, method: string) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const fetchOptions: RequestInit = {
    method,
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };

  if (method === 'POST') {
    const body = await request.text();
    if (body) {
      fetchOptions.body = body;
    }
  }

  const response = await fetch(`${backendBaseUrl}/api/pacientes`, fetchOptions);

  const contentType = response.headers.get('content-type') ?? '';
  const responseBody = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  return NextResponse.json(responseBody, { status: response.status });
}

export async function GET(request: NextRequest) {
  return proxyBase(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyBase(request, 'POST');
}
