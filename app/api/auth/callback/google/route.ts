import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/auth/callback/google';
const SCOPE = 'https://www.googleapis.com/auth/meetings.space.created';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Si no hay código ni error, redirigir al flujo de consentimiento de Google
  if (!code && !error) {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      CLIENT_ID
    )}&redirect_uri=${encodeURIComponent(
      REDIRECT_URI
    )}&response_type=code&scope=${encodeURIComponent(
      SCOPE
    )}&access_type=offline&prompt=consent`;

    return NextResponse.redirect(authUrl);
  }

  if (error) {
    return new NextResponse(
      `<html>
        <head><title>Error OAuth</title></head>
        <body style="font-family: system-ui; padding: 40px; background: #0B1120; color: #fff; text-align: center;">
          <h2 style="color: #EF4444;">❌ Error de Autorización</h2>
          <p>${error}</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 400 }
    );
  }

  try {
    // Intercambiar código por tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code!,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.refresh_token) {
      return new NextResponse(
        `<html>
          <head><title>Error Canjeando Código</title></head>
          <body style="font-family: system-ui; padding: 40px; background: #0B1120; color: #fff; text-align: center;">
            <h2 style="color: #EF4444;">❌ No se pudo obtener el Refresh Token</h2>
            <p>${JSON.stringify(tokenData)}</p>
            <p><a href="/api/auth/callback/google" style="color: #38BDF8;">Reintentar autorización</a></p>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
      );
    }

    const refreshToken = tokenData.refresh_token;

    // Actualizar appsettings.json del backend
    const appsettingsPath = path.resolve(process.cwd(), '..', 'backend_SaludYa', 'appsettings.json');
    if (fs.existsSync(appsettingsPath)) {
      const rawJson = fs.readFileSync(appsettingsPath, 'utf-8');
      const config = JSON.parse(rawJson);
      if (!config.Google) config.Google = {};
      config.Google.ClientId = CLIENT_ID;
      config.Google.ClientSecret = CLIENT_SECRET;
      config.Google.RefreshToken = refreshToken;
      fs.writeFileSync(appsettingsPath, JSON.stringify(config, null, 2), 'utf-8');
    }

    return new NextResponse(
      `<!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Google Meet Conectado con Éxito</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              background: #0F172A;
              color: #F8FAFC;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .card {
              background: #1E293B;
              border: 1px solid #334155;
              border-radius: 20px;
              padding: 40px;
              max-width: 540px;
              text-align: center;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }
            .badge {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              background: rgba(16, 185, 129, 0.15);
              color: #10B981;
              border: 1px solid rgba(16, 185, 129, 0.3);
              padding: 6px 16px;
              border-radius: 999px;
              font-size: 13px;
              font-weight: 700;
              margin-bottom: 20px;
            }
            h1 { font-size: 24px; margin: 0 0 12px 0; color: #FFFFFF; }
            p { font-size: 14px; line-height: 1.6; color: #94A3B8; margin: 0 0 24px 0; }
            .token-box {
              background: #0B1120;
              border: 1px solid #1E293B;
              border-radius: 12px;
              padding: 12px;
              font-family: monospace;
              font-size: 11px;
              color: #38BDF8;
              word-break: break-all;
              text-align: left;
              margin-bottom: 24px;
            }
            .btn {
              display: inline-block;
              background: #2563EB;
              color: #fff;
              text-decoration: none;
              font-weight: 700;
              font-size: 14px;
              padding: 12px 28px;
              border-radius: 12px;
              transition: all 0.2s;
            }
            .btn:hover { background: #1D4ED8; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">✓ Conexión Exitosa</div>
            <h1>¡Google Meet Vinculado!</h1>
            <p>Se ha generado el <strong>RefreshToken</strong> oficial y se ha guardado automáticamente en el archivo <code>appsettings.json</code> del backend.</p>
            <div class="token-box">${refreshToken}</div>
            <a href="/dashboard/citas" class="btn">Regresar al Sistema</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 }
    );
  } catch (err: any) {
    return new NextResponse(
      `<html>
        <head><title>Error</title></head>
        <body style="font-family: system-ui; padding: 40px; background: #0B1120; color: #fff; text-align: center;">
          <h2 style="color: #EF4444;">❌ Excepción al procesar token</h2>
          <p>${err?.message || err}</p>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    );
  }
}
