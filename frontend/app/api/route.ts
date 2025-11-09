import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (endpoint === 'upload') {
      // Handle file upload
      const formData = await request.formData();

      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (endpoint === 'chat') {
      // Handle chat through orchestrate
      const body = await request.json();

      const response = await fetch(`${BACKEND_URL}/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'chat',
          ...body
        }),
      });

      if (!response.ok) {
        throw new Error('Chat failed');
      }

      // Return streaming response
      return new Response(response.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    if (endpoint === 'orchestrate') {
      // Handle generic orchestrate requests (city_data, parse, etc.)
      const body = await request.json();

      const response = await fetch(`${BACKEND_URL}/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Orchestrate failed');
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint');

    if (endpoint === 'orchestrate') {
      // Call orchestrate endpoint
      const response = await fetch(`${BACKEND_URL}/orchestrate`);

      if (!response.ok) {
        throw new Error('Orchestrate failed');
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    if (endpoint === 'documents') {
      // List documents
      const response = await fetch(`${BACKEND_URL}/documents`);

      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Unknown endpoint' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Request failed' },
      { status: 500 }
    );
  }
}
