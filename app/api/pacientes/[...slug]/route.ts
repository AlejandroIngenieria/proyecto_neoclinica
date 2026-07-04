import { NextResponse, type NextRequest } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

type RouteContext = {
  params: Promise<{ slug: string[] }>;
};

/**
 * Proxy catch-all para /api/pacientes/...
 * Ahora soporta FormData (multipart/form-data) y DELETE.
 */
async function proxyRequest(request: NextRequest, context: RouteContext, method: string) {
  const authorization = request.headers.get('authorization');
  const { slug } = await context.params;

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const subPath = slug.join('/');
  const targetUrl = new URL(`/api/Pacientes/${subPath}`, backendBaseUrl);

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

  // Solo pasamos el Content-Type original si NO es un FormData.
  // Si es FormData, pasamos el Content-Type original completo (incluye el boundary)
  // para que el backend pueda parsear correctamente.
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
      // Pasar el body crudo para preservar el boundary y los datos binarios intactos
      fetchOptions.body = await request.arrayBuffer();
    } else {
      // Para peticiones JSON normales
      const arrayBuffer = await request.arrayBuffer();
      if (arrayBuffer.byteLength > 0) {
        fetchOptions.body = arrayBuffer;
      }
    }
  }

  const response = await fetch(targetUrl.toString(), fetchOptions);

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