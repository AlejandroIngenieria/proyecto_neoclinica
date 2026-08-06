import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export async function GET(req: any, ctx: any) {
  try {
    return await handler(req, ctx);
  } catch (error) {
    console.error('Error handling NextAuth GET request:', error);
    return new Response(JSON.stringify({ error: 'Authentication Handler Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(req: any, ctx: any) {
  try {
    return await handler(req, ctx);
  } catch (error) {
    console.error('Error handling NextAuth POST request:', error);
    return new Response(JSON.stringify({ error: 'Authentication Handler Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}



