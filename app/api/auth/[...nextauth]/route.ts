import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { NextRequest } from 'next/server';

const handler = NextAuth(authOptions);

export const runtime = 'nodejs';

export async function GET(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  return handler(req, { params } as any);
}

export async function POST(req: NextRequest, context: { params: Promise<{ nextauth: string[] }> }) {
  const params = await context.params;
  return handler(req, { params } as any);
}
