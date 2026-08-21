import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';
import { api } from './api-client';
import { getAuthSecret } from './auth-secret';

type BackendAuthResponse = {
  token: string;
  rol?: string;
  tipo?: string;
  usuario?: {
    usu_codigo?: string;
    usu_correo?: string;
    usu_rol?: string;
    usu_activo?: boolean;
    usuarioId?: string;
    correo?: string;
    rol?: string;
    activo?: boolean;
    usu_foto_perfil?: string | null;
    tipoTabla?: string | null;
    usu_debe_cambiar_password?: boolean;
    debeCambiarPassword?: boolean;
  };
  debeCambiarPassword?: boolean;
};

type TokenWithAccess = JWT & {
  accessToken?: string;
  role?: string | null;
  name?: string | null;
  email?: string | null;
  debeCambiarPassword?: boolean;
};

type SessionWithAccess = Session & {
  accessToken?: string;
  userId?: string;
  user?: Session['user'] & {
    role?: string | null;
    image?: string | null;
    debeCambiarPassword?: boolean;
  };
};

type AuthUserType = NonNullable<BackendAuthResponse['usuario']>;

function readAuthUserField(
  user: AuthUserType,
  legacyField: keyof AuthUserType,
  modernField: keyof AuthUserType,
) {
  const legacyValue = user[legacyField];
  if (typeof legacyValue === 'string' || typeof legacyValue === 'boolean') {
    return legacyValue;
  }

  const modernValue = user[modernField];
  if (typeof modernValue === 'string' || typeof modernValue === 'boolean') {
    return modernValue;
  }

  return undefined;
}

function resolveAuthUser(user: AuthUserType) {
  const userId = readAuthUserField(user, 'usu_codigo', 'usuarioId');
  const email = readAuthUserField(user, 'usu_correo', 'correo');
  const role = readAuthUserField(user, 'usu_rol', 'rol');
  const active = readAuthUserField(user, 'usu_activo', 'activo');

  if (typeof userId !== 'string' || typeof email !== 'string' || typeof role !== 'string') {
    return null;
  }

  const debeCambiar =
    user.usu_debe_cambiar_password === true ||
    user.debeCambiarPassword === true;

  return {
    id: userId,
    name: email,
    email,
    image: user.usu_foto_perfil ?? null,
    accessToken: '',
    role,
    active: typeof active === 'boolean' ? active : null,
    tipoTabla: typeof user.tipoTabla === 'string' ? user.tipoTabla : null,
    debeCambiarPassword: debeCambiar,
  };
}

const apiBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

async function postLoginWithRetries(
  correo: string,
  password: string,
  maxRetries = 3
): Promise<BackendAuthResponse | null> {
  const url = `${apiBaseUrl}/api/Autenticacion/login`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`=> NextAuth login attempt ${attempt}/${maxRetries} to ${url} for ${correo}`);
      const { data } = await api.post<BackendAuthResponse>(url, { correo, password });
      return data;
    } catch (error: any) {
      const status = error?.response?.status;
      const isClientError = status >= 400 && status < 500 && status !== 408; // 400/401/403/404 son errores de credenciales
      console.log(`=> Login attempt ${attempt} failed:`, status ?? error?.code ?? error?.message);

      if (isClientError) {
        // Credenciales inválidas; no reintentar para no demorar al usuario
        return null;
      }

      if (attempt < maxRetries) {
        const delayMs = attempt * 1000; // 1s, 2s
        console.log(`=> Cold-start / Server wake-up detected. Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  return null;
}

export const authOptions: NextAuthOptions = {
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        correo: { label: 'Correo', type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        console.log("=> NextAuth authorize start", { correo: credentials?.correo });
        if (!credentials?.correo || !credentials.password) {
          console.log("=> Missing credentials");
          return null;
        }

        // Acceso Administrativo Especial para Gestión de Citas y Estados
        if (credentials.correo.trim().toLowerCase() === 'admin@admin.com' && credentials.password === 'Admin123@') {
          try {
            const data = await postLoginWithRetries(credentials.correo, credentials.password, 2);
            if (data?.token) {
              const resolvedUser = data.usuario ? resolveAuthUser(data.usuario) : null;
              return {
                id: resolvedUser?.id || '00000000-0000-0000-0000-000000000001',
                name: resolvedUser?.name || 'Administrador Clínico',
                email: 'admin@admin.com',
                image: null,
                accessToken: data.token,
                role: 'admin',
                active: true,
                tipoTabla: 'admin',
                debeCambiarPassword: false,
              };
            }
          } catch {
            // Fallback si no está en la BD del backend
          }

          return {
            id: '00000000-0000-0000-0000-000000000001',
            name: 'Administrador Clínico',
            email: 'admin@admin.com',
            image: null,
            accessToken: 'admin-jwt-token-local',
            role: 'admin',
            active: true,
            tipoTabla: 'admin',
            debeCambiarPassword: false,
          };
        }

        try {
          const data = await postLoginWithRetries(credentials.correo, credentials.password, 3);

          if (!data || !data.token) {
            console.log("=> Missing token or login failed after retries");
            return null;
          }

          let resolvedUser = null;

          if (data.usuario) {
            resolvedUser = resolveAuthUser(data.usuario);
          } else {
            try {
              const base64Url = data.token.split('.')[1];
              const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
              const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');
              const decoded = JSON.parse(jsonPayload);
              
              resolvedUser = {
                id: decoded.nameid || decoded.sub || '',
                name: decoded.email || decoded.unique_name || '',
                email: decoded.email || decoded.unique_name || '',
                image: null,
                accessToken: '',
                role: data.rol || decoded.role || decoded.rol || '',
                active: true,
                tipoTabla: data.tipo || decoded.TipoTabla || null,
                debeCambiarPassword: Boolean(decoded.DebeCambiarPassword || decoded.debe_cambiar_password || data.debeCambiarPassword),
              };
            } catch (e) {
              console.error('Error parsing JWT', e);
            }
          }

          if (!resolvedUser || !resolvedUser.id) {
            console.log("=> resolvedUser is invalid or missing id:", resolvedUser);
            return null;
          }

          console.log("=> Login successful for user:", resolvedUser.email);
          return {
            ...resolvedUser,
            accessToken: data.token,
          };
        } catch (error: any) {
          console.log("=> Error during backend login request:", error?.message || error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const nextToken = token as TokenWithAccess;

      if (user) {
        const typedUser = user as typeof user & { accessToken?: string; role?: string | null; debeCambiarPassword?: boolean };
        nextToken.accessToken = typedUser.accessToken;
        nextToken.name = typedUser.name ?? null;
        nextToken.email = typedUser.email ?? null;
        nextToken.role = typedUser.role ?? null;
        nextToken.debeCambiarPassword = typedUser.debeCambiarPassword ?? false;
      }

      return nextToken;
    },
    async session({ session, token }) {
      const sessionWithAccess = session as SessionWithAccess;
      const tokenWithAccess = token as TokenWithAccess;

      sessionWithAccess.accessToken = tokenWithAccess.accessToken;
      sessionWithAccess.userId = tokenWithAccess.sub ?? undefined;
      sessionWithAccess.user = {
        ...(sessionWithAccess.user ?? {}),
        name: tokenWithAccess.name ?? sessionWithAccess.user?.name ?? null,
        email: tokenWithAccess.email ?? sessionWithAccess.user?.email ?? null,
        image: sessionWithAccess.user?.image ?? null,
        role: tokenWithAccess.role ?? null,
        debeCambiarPassword: tokenWithAccess.debeCambiarPassword ?? false,
      };

      return sessionWithAccess;
    },
  },
  secret: getAuthSecret(),
};
