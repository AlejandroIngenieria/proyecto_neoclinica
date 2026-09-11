import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(`${backendBaseUrl}/api/Autenticacion/estado-password`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: authHeader,
      },
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
      { mensaje: error?.message || 'Error de conexión con el servidor.' },
      { status: 500 },
    );
  }
}
