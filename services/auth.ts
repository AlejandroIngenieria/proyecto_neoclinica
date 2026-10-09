export type CambiarPasswordPayload = {
  passwordActual: string;
  nuevaPassword: string;
};

export async function cambiarPassword(payload: CambiarPasswordPayload, token?: string): Promise<{ mensaje: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/autenticacion/cambiar-password', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = typeof data === 'string' ? data : data?.mensaje || data?.message || 'Error al cambiar contraseña.';
    throw new Error(errorMsg);
  }

  return typeof data === 'string' ? { mensaje: data } : data;
}

export async function reenviarPasswordTemporal(correo?: string, token?: string): Promise<{ mensaje: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/autenticacion/reenviar-password-temporal', {
    method: 'POST',
    headers,
    body: JSON.stringify({ correo: correo || undefined }),
  });

  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const errorMsg = typeof data === 'string' ? data : data?.mensaje || data?.message || 'Error al reenviar contraseña temporal.';
    throw new Error(errorMsg);
  }

  return typeof data === 'string' ? { mensaje: data } : data;
}

export type EstadoPasswordResponse = {
  correo: string;
  tienePassword: boolean;
  esUsuarioSocial: boolean;
  debeCambiarPassword: boolean;
};

export async function obtenerEstadoPassword(token?: string): Promise<EstadoPasswordResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch('/api/autenticacion/estado-password', {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  if (!res.ok) {
    return {
      correo: '',
      tienePassword: true,
      esUsuarioSocial: false,
      debeCambiarPassword: false,
    };
  }

  return await res.json();
}

