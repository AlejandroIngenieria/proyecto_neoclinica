import { NextResponse } from 'next/server';

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5010';

const SEED_ASEGURADORAS = [
  { aseCodigo: 1, aseDescripcion: 'Seguros G&T', aseImagen: null },
  { aseCodigo: 2, aseDescripcion: 'Seguros El Roble', aseImagen: null },
  { aseCodigo: 3, aseDescripcion: 'Aseguradora General', aseImagen: null },
  { aseCodigo: 4, aseDescripcion: 'Mapfre Guatemala', aseImagen: null },
  { aseCodigo: 5, aseDescripcion: 'Pan-American Life', aseImagen: null },
  { aseCodigo: 6, aseDescripcion: 'Aseguradora Rural', aseImagen: null },
  { aseCodigo: 7, aseDescripcion: 'Seguros Universales', aseImagen: null },
  { aseCodigo: 8, aseDescripcion: 'Seguros Bantrab', aseImagen: null },
  { aseCodigo: 9, aseDescripcion: 'FICOHSA Seguros', aseImagen: null },
  { aseCodigo: 10, aseDescripcion: 'BMI Guatemala', aseImagen: null },
  { aseCodigo: 11, aseDescripcion: 'Bupa Global', aseImagen: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/07/Bupa_logo.svg/512px-Bupa_logo.svg.png' },
  { aseCodigo: 12, aseDescripcion: 'Seguros Agromercantil (BAM)', aseImagen: null },
];

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    const response = await fetch(`${backendBaseUrl}/api/FlujoCitas/aseguradoras`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return NextResponse.json(data);
      }
    }
  } catch (err) {
    // Si el backend aún no se ha reiniciado o falla la conexión, usar el catálogo oficial
    console.warn('[API] Usando catálogo oficial de aseguradoras:', err);
  }

  return NextResponse.json(SEED_ASEGURADORAS);
}
