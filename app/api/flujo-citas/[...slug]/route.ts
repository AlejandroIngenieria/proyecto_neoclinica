import { NextResponse, type NextRequest } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

/**
 * Proxy catch-all para /api/flujo-citas/...
 */
async function proxyRequest(request: NextRequest, context: RouteContext, method: string) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const subPath = slug.join('/');
  const targetUrl = new URL(`/api/FlujoCitas/${subPath}`, backendBaseUrl);

  console.log(`[PROXY] Proxying ${method} request to: ${targetUrl.toString()}`);

  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: Record<string, string> = {
    Authorization: authorization,
    Accept: 'application/json',
  };

  const contentType = request.headers.get('content-type') ?? '';
  const isFormData = contentType.includes('multipart/form-data');

  if (contentType) {
    headers['Content-Type'] = contentType;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    cache: 'no-store',
  };

  if (method === 'POST' || method === 'PUT') {
    if (isFormData) {
      fetchOptions.body = await request.arrayBuffer();
    } else {
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        fetchOptions.body = arrayBuffer;
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(targetUrl.toString(), fetchOptions);
  } catch (error: any) {
    console.error(`[PROXY ERROR] Failed to connect to backend at ${targetUrl.toString()}:`, error.message);
    return NextResponse.json(
      { message: 'Error de conexión con el backend', error: error.message },
      { status: 502 }
    );
  }

  const responseContentType = response.headers.get('content-type') ?? '';
  const textBody = await response.text();
  let responseBody: any = textBody;
  
  if (responseContentType.includes('application/json') && textBody) {
    try {
      responseBody = JSON.parse(textBody);
    } catch {
      // Ignorar error de parseo y retornar el texto original
    }
  }

  return NextResponse.json(responseBody, { status: response.status });
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
