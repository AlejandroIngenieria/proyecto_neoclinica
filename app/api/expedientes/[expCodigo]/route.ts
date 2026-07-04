import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ expCodigo: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const authorization = request.headers.get('authorization');
  const { expCodigo } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const response = await fetch(`${backendBaseUrl}/api/Expedientes/${expCodigo}`, {
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
}