import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { extractColors } from './colorExtractor';

export async function scrapeSite(url: string, delay: number = 2000) {
  let browser = null;
  try {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    const exePath = isDev 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' 
      : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: isDev ? [] : chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: exePath,
      headless: true,
    });

    const page = await browser.newPage();
    
    // Intercept fonts
    const googleFonts: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('fonts.googleapis.com/css')) {
        googleFonts.push(url);
      }
    });

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for page to fully render or custom wait time (lazy images, animations, video backgrounds, etc.)
    await new Promise(resolve => setTimeout(resolve, delay));

    // Dismiss cookie consent popups
    await page.evaluate(() => {
      // Common cookie banner selectors
      const selectors = [
        // Axept.io specific
        '#axeptio_btn_acceptAll',
        '#axeptio_btn_dismiss',
        '.axeptio_widget button[data-type="accept"]',
        '[data-axeptio-type="accept"]',
        // Generic cookie consent buttons (accept/agree)
        'button[id*="cookie" i][id*="accept" i]',
        'button[id*="cookie" i][id*="agree" i]',
        'button[class*="cookie" i][class*="accept" i]',
        'button[class*="cookie" i][class*="agree" i]',
        'a[id*="cookie" i][id*="accept" i]',
        'a[class*="cookie" i][class*="accept" i]',
        // Popular cookie consent libraries
        '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
        '#onetrust-accept-btn-handler',
        '.cc-btn.cc-allow',
        '.cc-accept',
        '[data-testid="cookie-accept"]',
        '[aria-label*="cookie" i][aria-label*="accept" i]',
        '[aria-label*="cookie" i][aria-label*="agree" i]',
        // French variants
        'button[id*="accept" i]',
        'button[class*="accept" i]',
        'a[class*="accept" i]',
        '.consent-accept',
        '#consent-accept',
        // Generic close buttons on modals/popups
        '[class*="cookie" i] button',
        '[id*="cookie" i] button',
        '[class*="consent" i] button',
        '[id*="consent" i] button',
        '[class*="gdpr" i] button',
      ];

      for (const sel of selectors) {
        const btn = document.querySelector(sel) as HTMLElement | null;
        if (btn && btn.offsetParent !== null) {
          btn.click();
          break;
        }
      }

      // Text-based fallback: click any visible button that says "accept", "agree", "OK" or French equivalents
      const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]')) as HTMLElement[];
      const acceptKeywords = ['accept', 'agree', 'allow', 'accepter', 'acceptez', "j'accepte", 'tout accepter', 'ok', 'got it', 'understood'];
      for (const btn of allButtons) {
        const text = (btn.innerText || btn.textContent || '').toLowerCase().trim();
        if (acceptKeywords.some(kw => text.includes(kw)) && btn.offsetParent !== null) {
          const rect = btn.getBoundingClientRect();
          // Only click if it's a small button (not a full page CTA), heuristic: width < 400px
          if (rect.width < 400 && rect.width > 20) {
            btn.click();
            break;
          }
        }
      }

      // Forcefully hide common cookie overlay containers with CSS injection
      const overlaySelectors = [
        '[class*="cookie-banner" i]',
        '[class*="cookie-consent" i]',
        '[class*="cookie-notice" i]',
        '[class*="cookieConsent" i]',
        '[id*="cookie-banner" i]',
        '[id*="cookie-consent" i]',
        '[id*="cookieconsent" i]',
        '[class*="gdpr" i]',
        '#CybotCookiebotDialog',
        '#onetrust-banner-sdk',
        '.cc-window',
        // Axept.io container
        '#axeptio_overlay',
        '.axeptio_widget',
        '.axeptio-widget',
        '[id^="axeptio"]',
      ];
      const style = document.createElement('style');
      style.innerHTML = overlaySelectors.map(s => `${s} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).join('\n');
      document.head.appendChild(style);
    });

    // Small extra wait after dismissing popups
    await new Promise(resolve => setTimeout(resolve, 500));

    const title = await page.title();
    const domain = new URL(url).hostname;

    // Desktop screenshot
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 2 });
    const desktopBuffer = await page.screenshot() as Buffer;
    const desktopScreenshot = desktopBuffer.toString('base64');

    // Extract colors from desktop hero
    const colors = await extractColors(desktopBuffer);

    // Desktop fullpage
    const desktopFullScreenshot = (await page.screenshot({ fullPage: true })) as Buffer;

    // Mobile fullpage
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3 });
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileScreenshot = (await page.screenshot({ fullPage: true })) as Buffer;

    // Extract logos (multiple candidates)
    let logoCandidates = await page.evaluate(() => {
      const candidates: string[] = [];
      
      // 1. Favicon
      const icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement;
      if (icon) candidates.push(icon.href);
      
      // 2. Header/Nav logos
      const selectors = [
        'header img', 'nav img', '.logo img', '[class*="logo"] img',
        'header svg', 'nav svg', '.logo svg', 'a[href="/"] img', 'a[href="/"] svg',
        '[class*="logo"] svg',
      ];
      
      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          // Handle <img> elements (including <img src="logo.svg">)
          if (el instanceof HTMLImageElement && el.src) {
            candidates.push(el.src);
          }
          // Handle inline <svg> elements — serialize to data URI
          if (el instanceof SVGSVGElement) {
            try {
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(el);
              const encoded = btoa(unescape(encodeURIComponent(svgString)));
              candidates.push(`data:image/svg+xml;base64,${encoded}`);
            } catch (e) {
              // Skip SVGs that can't be serialized
            }
          }
        });
      });
      
      return Array.from(new Set(candidates)).filter(src => src.startsWith('http') || src.startsWith('data:'));
    });

    const logosBase64: string[] = [];
    for (const src of logoCandidates.slice(0, 8)) {
      try {
        // Inline SVGs are already data URIs — add directly
        if (src.startsWith('data:')) {
          logosBase64.push(src);
          continue;
        }
        const logoPage = await browser.newPage();
        const response = await logoPage.goto(src, { timeout: 10000 });
        const buffer = await response?.buffer();
        if (buffer) {
          const contentType = response?.headers()['content-type'] || 'image/png';
          logosBase64.push(`data:${contentType};base64,${buffer.toString('base64')}`);
        }
        await logoPage.close();
      } catch (e) {}
    }

    // 1. Get colors from CSS (Buttons, Links, Accents)
    const cssColors = await page.evaluate(() => {
      const colors = new Set<string>();
      const selectors = 'button, a, [class*="btn"], [class*="active"], h1, h2';
      document.querySelectorAll(selectors).forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundColor;
        const color = style.color;
        
        [bg, color].forEach(c => {
          const rgb = c.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const hex = "#" + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
            if (hex !== '#FFFFFF' && hex !== '#000000' && hex !== '#0A0A0A') {
              colors.add(hex);
            }
          }
        });
      });
      return Array.from(colors).slice(0, 10);
    });

    // 2. Extract colors from screenshot (existing Vibrant)
    const vibrantColors = await extractColors(desktopBuffer);
    
    // Combine and prioritize CSS colors (brand colors)
    const combinedColors = [
      ...cssColors.map(hex => ({ hex, isLight: false, rgb: [0,0,0] as [number,number,number] })), // Simplified for mapping
      ...vibrantColors
    ];

    // Deduplicate by HEX
    const finalColors = Array.from(new Map(combinedColors.map(c => [c.hex, c])).values()).slice(0, 8);

    // Extract all fonts used on the page (Filter out icon fonts)
    const extractedFonts = await page.evaluate(() => {
      const fonts = new Set<string>();
      const iconKeywords = ['icon', 'symbol', 'remix', 'lucide', 'awesome', 'fontello', 'glyph'];
      const elements = document.querySelectorAll('h1, h2, h3, p, button, a');
      
      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.fontFamily) {
          const family = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          if (family && family !== 'inherit') {
             const lowerFamily = family.toLowerCase();
             if (!iconKeywords.some(kw => lowerFamily.includes(kw))) {
               fonts.add(family);
             }
          }
        }
      });
      return Array.from(fonts).slice(0, 10);
    });

    const siteBgColor = await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        return "#" + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      return "#FFFFFF";
    });

    return {
      title,
      domain,
      siteUrl: url,
      logos: logosBase64,
      logo: logosBase64[0] || '',
      colors: finalColors,
      siteBgColor,
      fonts: extractedFonts.map(name => ({
        name,
        isGoogleFont: googleFonts.some(url => url.toLowerCase().includes(name.toLowerCase().replace(/ /g, '+'))),
        url: googleFonts.find(url => url.toLowerCase().includes(name.toLowerCase().replace(/ /g, '+')))
      })),
      font: {
        name: extractedFonts[0] || 'Inter',
        url: googleFonts[0],
        isGoogleFont: googleFonts.length > 0
      },
      screenshots: {
        desktop: `data:image/png;base64,${desktopScreenshot}`,
        desktopFull: `data:image/png;base64,${desktopFullScreenshot.toString('base64')}`,
        mobile: `data:image/png;base64,${mobileScreenshot.toString('base64')}`
      }
    };
  } finally {
    if (browser) await (browser as any).close();
  }
}
