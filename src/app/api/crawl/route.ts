import { NextRequest, NextResponse } from 'next/server';
import { crawlWebsite } from '../../../lib/firecrawl';

export const maxDuration = 60; // 60 seconds (Vercel hobby plan limit)

export async function POST(request: NextRequest) {
  try {
    const { url, fullVersion = false } = await request.json();

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Create a ReadableStream for real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const result = await crawlWebsite(
            url,
            (progress) => {
              const data = JSON.stringify(progress) + '\n';
              controller.enqueue(encoder.encode(data));
            },
            fullVersion
          );

          // Send final result
          const finalData = JSON.stringify({ 
            status: 'complete', 
            result 
          }) + '\n';
          controller.enqueue(encoder.encode(finalData));
          controller.close();
        } catch (error) {
          const errorData = JSON.stringify({ 
            status: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }) + '\n';
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for direct URL access
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  const fullVersion = request.nextUrl.searchParams.get('full') === 'true';

  if (!url) {
    return NextResponse.json(
      { error: 'URL parameter is required' },
      { status: 400 }
    );
  }

  try {
    const result = await crawlWebsite(url, undefined, fullVersion);
    
    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}