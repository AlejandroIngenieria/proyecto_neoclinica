import { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    userId?: string;
    user?: {
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string | null;
      debeCambiarPassword?: boolean;
    };
  }

  interface User {
    id?: string;
    accessToken?: string;
    role?: string | null;
    debeCambiarPassword?: boolean;
    active?: boolean | null;
    tipoTabla?: string | null;
  }
}
