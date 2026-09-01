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
