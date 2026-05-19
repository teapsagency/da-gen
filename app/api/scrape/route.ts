import { NextRequest } from 'next/server';
import { scrapeSite } from '@/lib/scraper';
import { validateExternalUrl } from '@/lib/security';

// Scraping is long-running (navigation + screenshots + extra pages).
export const maxDuration = 300;

const MAX_EXTRA_PAGES = 6;

export async function POST(req: NextRequest) {
  const { url, delay, extraPages } = await req.json();

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }

  const validated = validateExternalUrl(url);
  if ('error' in validated) {
    return Response.json({ error: validated.error }, { status: 400 });
  }
  const parsedUrl = validated.url;

  // Validate extra pages: must be valid http(s), not internal, same host.
  const safeExtraPages: { label: string; url: string }[] = [];
  if (Array.isArray(extraPages)) {
    for (const ep of extraPages.slice(0, MAX_EXTRA_PAGES)) {
      if (!ep || typeof ep.url !== 'string') continue;
      const v = validateExternalUrl(ep.url);
      if ('error' in v) continue;
      if (v.url.host !== parsedUrl.host) continue;
      safeExtraPages.push({ label: String(ep.label ?? ''), url: v.url.href });
    }
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendLog = (data: { time: number; msg: string }) => {
        controller.enqueue(encoder.encode(`event: log\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const result = await scrapeSite(parsedUrl.href, delay, safeExtraPages, sendLog);

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
