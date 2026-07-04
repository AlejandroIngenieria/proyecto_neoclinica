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
  };
};

type TokenWithAccess = JWT & {
  accessToken?: string;
  role?: string | null;
  name?: string | null;
  email?: string | null;
};

type SessionWithAccess = Session & {
  accessToken?: string;
  userId?: string;
  user?: Session['user'] & {
    role?: string | null;
    image?: string | null;
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

  return {
    id: userId,
    name: email,
    email,
    image: user.usu_foto_perfil ?? null,
    accessToken: '',
    role,
    active: typeof active === 'boolean' ? active : null,
    tipoTabla: typeof user.tipoTabla === 'string' ? user.tipoTabla : null,
  };
}

const apiBaseUrl = process.env.AUTH_BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL ?? '';

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
        if (!credentials?.correo || !credentials.password) {
          return null;
        }

        const { data } = await api.post<BackendAuthResponse>(
          `${apiBaseUrl}/api/Autenticacion/login`,
          {
            correo: credentials.correo,
            password: credentials.password,
          },
        );

        if (!data.token) {
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
            };
          } catch (e) {
            console.error('Error parsing JWT', e);
          }
        }

        if (!resolvedUser || !resolvedUser.id) {
          return null;
        }

        return {
          ...resolvedUser,
          accessToken: data.token,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const nextToken = token as TokenWithAccess;

      if (user) {
        const typedUser = user as typeof user & { accessToken?: string; role?: string | null };
        nextToken.accessToken = typedUser.accessToken;
        nextToken.name = typedUser.name ?? null;
        nextToken.email = typedUser.email ?? null;
        nextToken.role = typedUser.role ?? null;
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
      };

      return sessionWithAccess;
    },
  },
  secret: getAuthSecret(),
};
