import { NextResponse, type NextRequest } from 'next/server';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

/**
 * Proxy catch-all para /api/recompensas/...
 */
async function proxyRequest(request: NextRequest, context: RouteContext, method: string) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  const subPath = slug.join('/');
  const targetUrl = new URL(`/api/Recompensas/${subPath}`, backendBaseUrl);

  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (authorization) {
    headers.Authorization = authorization;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (method === 'POST' || method === 'PUT') {
    const body = await request.text();
    if (body) fetchOptions.body = body;
  }

  try {
    const response = await fetch(targetUrl.toString(), fetchOptions);
    const responseContentType = response.headers.get('content-type') ?? '';
    const textBody = await response.text();
    let responseBody: any = textBody;

    if (responseContentType.includes('application/json') && textBody) {
      try {
        responseBody = JSON.parse(textBody);
      } catch {
        // Ignorar error de parseo y retornar texto
      }
    }

    if (!response.ok) {
      return NextResponse.json(responseBody || { message: response.statusText }, { status: response.status });
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error: any) {
    // Si el backend no está disponible, retornar respuesta simulada graceful
    return NextResponse.json(
      { message: 'Servicio de recompensas no disponible temporalmente en backend.' },
      { status: 503 }
    );
  }
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context, 'GET');
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context, 'POST');
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context, 'PUT');
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyRequest(request, context, 'DELETE');
}
