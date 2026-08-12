import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextRequest } from 'next/server';

const handler = NextAuth(authOptions);

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth?: string[] }> | { nextauth?: string[] } }
) {
  try {
    const params = await ctx?.params;
    return await handler(req, { params });
  } catch (error) {
    console.error('Error handling NextAuth GET request:', error);
    return new Response(JSON.stringify({ error: 'Authentication Handler Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ nextauth?: string[] }> | { nextauth?: string[] } }
) {
  try {
    const params = await ctx?.params;
    return await handler(req, { params });
  } catch (error) {
    console.error('Error handling NextAuth POST request:', error);
    return new Response(JSON.stringify({ error: 'Authentication Handler Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
