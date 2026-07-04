import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ munCodigo: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { munCodigo } = await context.params;
  const response = await fetch(`${backendBaseUrl}/api/Municipios/${munCodigo}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();

  return NextResponse.json(body, { status: response.status });
}
