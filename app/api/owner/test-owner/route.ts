import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Owner API routing is working!',
    timestamp: new Date().toISOString(),
    path: '/api/owner/test-owner'
  });
}