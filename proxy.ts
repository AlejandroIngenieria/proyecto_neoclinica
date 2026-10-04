import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { getAuthSecret } from './lib/auth-secret';

const loginUrl = '/login?reason=login-required';
const validationTimeoutMs = 5000;

type ValidationResult = {
  ok: boolean;
  reason?: 'session-expired' | 'auth-error';
};

async function validateBackendSession(token: string, origin: string): Promise<ValidationResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), validationTimeoutMs);

  try {
    const response = await fetch(new URL('/api/expedientes', origin), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    if (response.status === 401 || response.status === 403) {
      return { ok: false, reason: 'session-expired' };
    }

    return response.ok ? { ok: true } : { ok: false, reason: 'auth-error' };
  } catch {
    return { ok: false, reason: 'auth-error' };
  } finally {
    clearTimeout(timeoutId);
  }
}

// Rutas privadas del dashboard que SIEMPRE requieren autenticación
function isProtectedDashboardPath(pathname: string): boolean {
  if (pathname === '/dashboard') return true;

  const protectedPrefixes = [
    '/dashboard/agendar',
    '/dashboard/citas',
    '/dashboard/configuracion',
    '/dashboard/medicamentos',
    '/dashboard/notificaciones',
    '/dashboard/perfil',
  ];

  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si la ruta NO es una de las secciones privadas del dashboard (ej: perfil de médico /dashboard/[expCodigo] o directorio público), permitir acceso libre
  if (!isProtectedDashboardPath(pathname)) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: getAuthSecret() });

  if (!token?.accessToken || typeof token.accessToken !== 'string') {
    return NextResponse.redirect(new URL(loginUrl, request.url));
  }

  const validation = await validateBackendSession(token.accessToken, request.nextUrl.origin);

  if (!validation.ok) {
    return NextResponse.redirect(new URL(`/login?reason=${validation.reason ?? 'auth-error'}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};