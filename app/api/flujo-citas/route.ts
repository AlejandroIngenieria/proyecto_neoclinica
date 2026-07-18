import { NextResponse, type NextRequest } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function POST(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };

  const body = await request.text();
  if (body) {
    fetchOptions.body = body;
  }

  const response = await fetch(`${backendBaseUrl}/api/FlujoCitas`, fetchOptions);

  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: any = await response.text();

  if (contentType.includes('application/json') && responseBody) {
    try {
      responseBody = JSON.parse(responseBody);
    } catch { }
  }

  return NextResponse.json(responseBody, { status: response.status });
}
export async function GET(request: NextRequest) {
  const authorization = request.headers.get('authorization');

  if (!authorization) {
    return NextResponse.json({ message: 'Authorization header requerido' }, { status: 401 });
  }

  const fetchOptions: RequestInit = {
    method: 'GET',
    headers: {
      Authorization: authorization,
      Accept: 'application/json',
    },
    cache: 'no-store',
  };

  const targetUrl = new URL(`${backendBaseUrl}/api/FlujoCitas`);
  const searchParams = request.nextUrl.searchParams;
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  console.log(`[Proxy] Forwarding GET to: ${targetUrl.toString()}`);

  const response = await fetch(targetUrl.toString(), fetchOptions);

  console.log(`[Proxy] Backend returned: ${response.status}`);

  const contentType = response.headers.get('content-type') ?? '';
  let responseBody: any = await response.text();

  if (contentType.includes('application/json') && responseBody) {
    try {
      responseBody = JSON.parse(responseBody);
    } catch { }
  }

  return NextResponse.json(responseBody, { status: response.status });
}
