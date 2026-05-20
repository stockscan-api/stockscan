import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Simple endpoint to echo back what the proxy should use
// The actual server URL is stored client-side in localStorage and sent via header
export async function GET(request: NextRequest) {
  const serverUrl = request.headers.get('x-backend-url') || 'https://api.stockscan.uk';
  return NextResponse.json({ serverUrl });
}
