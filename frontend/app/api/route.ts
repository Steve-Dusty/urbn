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

    if (endpoint === 'agents') {
      // Handle agents API - proxy to backend
      const { method } = request;
      const url = new URL(request.url);
      const path = url.searchParams.get('path') || '';
      
      if (method === 'GET' && !path) {
        // List all agents
        const response = await fetch(`${BACKEND_URL}/agents`);
        const data = await response.json();
        return NextResponse.json(data);
      } else if (method === 'GET' && path && !path.includes('/')) {
        // Get specific agent
        const response = await fetch(`${BACKEND_URL}/agents/${path}`);
        const data = await response.json();
        return NextResponse.json(data);
      } else if (method === 'POST' && path.includes('/chat')) {
        // Chat with agent (streaming)
        const body = await request.json();
        const agentId = path.split('/')[0];
        
        const response = await fetch(`${BACKEND_URL}/agents/${agentId}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        
        if (!response.ok) {
          throw new Error('Chat failed');
        }
        
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      } else if (method === 'POST') {
        // Create agent
        const body = await request.json();
        const response = await fetch(`${BACKEND_URL}/agents`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const data = await response.json();
        return NextResponse.json(data);
      } else if (method === 'DELETE') {
        // Delete agent
        const agentId = path.split('/')[0];
        const response = await fetch(`${BACKEND_URL}/agents/${agentId}`, {
          method: 'DELETE'
        });
        const data = await response.json();
        return NextResponse.json(data);
      }
    }

    if (endpoint === 'orchestrate') {
      // Handle generic orchestrate requests (city_data, parse, etc.)
      const body = await request.json();

      // Check if this is a streaming action (chat, run_simulation, etc.)
      const streamingActions = ['chat', 'run_simulation', 'city_data', 'policy_analysis'];
      const isStreaming = streamingActions.includes(body.action) && body.stream !== false;

      console.log(`🔄 API Route: action=${body.action}, isStreaming=${isStreaming}`);

      const response = await fetch(`${BACKEND_URL}/orchestrate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`Orchestrate failed: ${errorText}`);
      }

      // Return streaming response for streaming actions
      if (isStreaming) {
        // Ensure we're returning the stream properly
        if (!response.body) {
          console.error('No response body for streaming action');
          throw new Error('No response body for streaming action');
        }
        
        console.log('✅ Returning streaming response');
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
          },
        });
      }

      // Return JSON response for non-streaming actions
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
