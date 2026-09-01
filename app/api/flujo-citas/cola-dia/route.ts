import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codMedico = searchParams.get('codMedico') || '';
    const fecha = searchParams.get('fecha') || '';
    const codPaciente = searchParams.get('codPaciente') || '';

    const queryParams = new URLSearchParams();
    if (codMedico) queryParams.set('codMedico', codMedico);
    if (fecha) queryParams.set('fecha', fecha);
    if (codPaciente) queryParams.set('codPaciente', codPaciente);

    const response = await fetch(`${backendBaseUrl}/api/FlujoCitas/cola-dia?${queryParams.toString()}`, {
      headers: {
        Accept: 'application/json',
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
        // Fallback
      }
    }

    return NextResponse.json(responseBody, { status: response.status });
  } catch (error: any) {
    return NextResponse.json(
      { message: error?.message || 'Error al obtener la cola del día' },
      { status: 500 },
    );
  }
}
