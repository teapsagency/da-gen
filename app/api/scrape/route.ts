import { NextRequest, NextResponse } from 'next/server';
import { scrapeSite } from '@/lib/scraper';

export async function POST(req: NextRequest) {
  try {
    const { url, delay } = await req.json();
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const result = await scrapeSite(url, delay);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Scraping error:', error);
    return NextResponse.json({ error: error.message || 'Failed to scrape site' }, { status: 500 });
  }
}
