import { NextRequest } from 'next/server';
import { scrapeSite } from '@/lib/scraper';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { url, delay, extraPages } = await req.json();

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return Response.json({ error: 'URL invalide. Vérifiez le format (ex: https://example.com)' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return Response.json({ error: 'Seuls les protocoles HTTP et HTTPS sont supportés.' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (data: { time: number; msg: string }) => {
        controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await scrapeSite(parsedUrl.href, delay, extraPages || [], sendLog);

        const json = JSON.stringify(result);
        const CHUNK_SIZE = 64 * 1024;
        const totalChunks = Math.ceil(json.length / CHUNK_SIZE);
        for (let i = 0; i < totalChunks; i++) {
          const chunk = json.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          controller.enqueue(encoder.encode(`event: result-chunk\ndata: ${JSON.stringify({ i, total: totalChunks, chunk })}\n\n`));
        }
        controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
      } catch (error: unknown) {
        console.error('Scraping error:', error);
        controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to scrape site' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
