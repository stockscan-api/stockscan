import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_BACKEND_URL = 'https://api.stockscan.uk';

function getBackendUrl(request: NextRequest): string {
  // Read custom backend URL from header (set by client-side api-client)
  const customUrl = request.headers.get('x-backend-url');
  if (customUrl && customUrl.startsWith('http')) {
    return customUrl.replace(/\/+$/, '');
  }
  return DEFAULT_BACKEND_URL;
}

async function proxyRequest(request: NextRequest, pathSegments: string[]) {
  const BACKEND_URL = getBackendUrl(request);
  const path = pathSegments.join('/');
  const url = `${BACKEND_URL}/${path}`;
  
  const contentType = request.headers.get('Content-Type') || '';
  const isFormData = contentType.includes('multipart/form-data');
  
  const headers: Record<string, string> = {};
  
  // Forward authorization header if present
  const authHeader = request.headers.get('Authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  };
  
  // Add body for non-GET requests
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      if (isFormData) {
        // For file uploads, reconstruct FormData properly
        const incomingFormData = await request.formData();
        const outgoingFormData = new FormData();
        
        // Copy all entries from incoming to outgoing FormData
        for (const [key, value] of incomingFormData.entries()) {
          if (value instanceof File) {
            // For files, create a new Blob with the file data
            const arrayBuffer = await value.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: value.type });
            outgoingFormData.append(key, blob, value.name);
          } else {
            outgoingFormData.append(key, value);
          }
        }
        
        fetchOptions.body = outgoingFormData;
        // Don't set Content-Type - let fetch set it with proper boundary
      } else {
        headers['Content-Type'] = 'application/json';
        const body = await request.text();
        if (body) {
          fetchOptions.body = body;
        }
      }
    } catch (e) {
      // No body
    }
  } else {
    // For GET/HEAD, still set JSON content type in headers
    headers['Content-Type'] = 'application/json';
  }
  
  // Forward query parameters
  const searchParams = request.nextUrl.searchParams.toString();
  const fullUrl = searchParams ? `${url}?${searchParams}` : url;
  
  try {
    const response = await fetch(fullUrl, fetchOptions);
    const data = await response.text();
    
    return new NextResponse(data, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to backend', details: error.message },
      { status: 502 }
    );
  }
}

export async function GET(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function POST(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PUT(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function PATCH(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}

export async function DELETE(
  request: NextRequest, 
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  return proxyRequest(request, path);
}
