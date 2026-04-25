import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'API routing is working correctly!',
    timestamp: new Date().toISOString(),
    path: '/api/test-routing'
  });
}