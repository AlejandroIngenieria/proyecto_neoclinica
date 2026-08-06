import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const response = await fetch(`${backendBaseUrl}/api/Autenticacion/restablecer-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const responseContentType = response.headers.get('content-type') ?? '';
    const textBody = await response.text();
    let responseBody: any = textBody;

    if (responseContentType.includes('application/json') && textBody) {
      try {
        responseBody = JSON.parse(textBody);
      } catch {
        // Fallback to textBody
      }
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Error de conexión con el servidor.' },
      { status: 500 },
    );
  }
}
