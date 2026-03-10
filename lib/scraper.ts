import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';
import { extractColors } from './colorExtractor';

export async function scrapeSite(url: string, delay: number = 2000) {
  let browser = null;
  try {
    const isDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    const exePath = isDev 
      ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' 
      : await chromium.executablePath('https://github.com/Sparticuz/chromium/releases/download/v143.0.4/chromium-v143.0.4-pack.x64.tar');

    browser = await puppeteer.launch({
      args: isDev ? [] : chromium.args,
      defaultViewport: { width: 1920, height: 1080 },
      executablePath: exePath,
      headless: true,
    });

    const page = await browser.newPage();
    
    // Intercept font service URLs (Google Fonts, Fontshare, Adobe Fonts)
    const googleFonts: string[] = [];
    const fontshareFonts: string[] = [];
    const adobeFonts: string[] = [];
    page.on('request', (request) => {
      const reqUrl = request.url();
      if (reqUrl.includes('fonts.googleapis.com/css')) {
        console.log('[scraper] captured Google Fonts URL:', reqUrl);
        googleFonts.push(reqUrl);
      }
      if (reqUrl.includes('api.fontshare.com')) {
        console.log('[scraper] captured Fontshare URL:', reqUrl);
        fontshareFonts.push(reqUrl);
      }
      if (reqUrl.includes('use.typekit.net')) {
        console.log('[scraper] captured Adobe Fonts URL:', reqUrl);
        adobeFonts.push(reqUrl);
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

    // Set a per-operation screenshot timeout
    page.setDefaultTimeout(25000);

    // Desktop screenshot — 1440px, DPR 1.5 (reduced from 1920/DPR2 to avoid Vercel 60s timeout)
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1.5 });
    const desktopBuffer = Buffer.from(await page.screenshot());
    const desktopScreenshot = desktopBuffer.toString('base64');

    // Extract colors from desktop hero
    const colors = await extractColors(desktopBuffer);

    // Desktop fullpage — cap body height to avoid very long pages eating memory
    await page.evaluate(() => {
      document.body.style.maxHeight = '6000px';
      document.body.style.overflow = 'hidden';
    });
    const desktopFullScreenshot = Buffer.from(await page.screenshot({ fullPage: true }));

    // Mobile screenshot — DPR 2 instead of 3 to save time/memory
    await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
    await new Promise(resolve => setTimeout(resolve, 500));
    const mobileScreenshot = Buffer.from(await page.screenshot({ fullPage: true }));

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

    // Extract all fonts used on the page (Filter out icon/system fonts)
    const extractedFonts = await page.evaluate(() => {
      const fonts = new Map<string, number>(); // font name → usage count (for priority)
      const iconKeywords = ['icon', 'symbol', 'remix', 'lucide', 'awesome', 'fontello', 'glyph', 'material'];
      const systemFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica', 'arial', 'times new roman', 'times', 'courier new', 'courier', 'inherit', 'initial', 'unset'];
      const elements = document.querySelectorAll('h1, h2, h3, h4, p, span, button, a, li, div');

      elements.forEach(el => {
        const style = window.getComputedStyle(el);
        if (style.fontFamily) {
          const family = style.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          if (family) {
             const lowerFamily = family.toLowerCase();
             if (!iconKeywords.some(kw => lowerFamily.includes(kw)) && !systemFonts.includes(lowerFamily)) {
               fonts.set(family, (fonts.get(family) || 0) + 1);
             }
          }
        }
      });

      // Also extract @font-face declarations from stylesheets
      const fontFaceMap: Record<string, string> = {};
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (rule instanceof CSSFontFaceRule) {
                const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                const src = rule.style.getPropertyValue('src');
                if (family && src) {
                  fontFaceMap[family] = src;
                }
              }
            }
          } catch { /* cross-origin stylesheets */ }
        }
      } catch { /* no access */ }

      // Sort by usage count (most used first)
      const sorted = Array.from(fonts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
      return { fontNames: sorted.slice(0, 10), fontFaceMap };
    });

    const siteBgColor = await page.evaluate(() => {
      const bg = window.getComputedStyle(document.body).backgroundColor;
      const rgb = bg.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        return "#" + rgb.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('').toUpperCase();
      }
      return "#FFFFFF";
    });

    // Helper: normalize font name for URL matching
    // Handles camelCase ("BricolageGrotesque" → "bricolage grotesque")
    // but preserves consecutive uppercase ("DM Sans" stays "dm sans", "DMSans" → "dm sans")
    const normalizeFontName = (name: string): string => {
      return name
        // Insert space before uppercase letter that follows a lowercase letter: "BricolageGrotesque" → "Bricolage Grotesque"
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Insert space before uppercase letter that is followed by lowercase and preceded by uppercase: "DMSans" → "DM Sans"
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim();
    };

    // Build fonts array with proper URL matching
    const fontsWithUrls = extractedFonts.fontNames.map(name => {
      const displayName = normalizeFontName(name);
      const searchName = displayName.toLowerCase().replace(/ +/g, '+');

      // Try matching against intercepted font service URLs
      const googleUrl = googleFonts.find(u => u.toLowerCase().includes(searchName));
      const fontshareUrl = fontshareFonts.find(u => u.toLowerCase().includes(searchName));
      const adobeUrl = adobeFonts.length > 0 ? adobeFonts[0] : undefined; // Adobe uses a single CSS for all fonts

      // Check if we have a self-hosted @font-face src for this font
      const hasFontFace = !!extractedFonts.fontFaceMap[name] || !!extractedFonts.fontFaceMap[displayName];

      const url = googleUrl || fontshareUrl || adobeUrl || undefined;

      console.log(`[scraper] font "${name}" → display: "${displayName}" | search: "${searchName}" | google: ${!!googleUrl} | fontshare: ${!!fontshareUrl} | adobe: ${!!adobeUrl} | fontFace: ${hasFontFace}`);

      return {
        name: displayName,
        isGoogleFont: !!googleUrl,
        url,
        isSelfHosted: hasFontFace && !url,
      };
    });

    // Primary font: use the most-used font and its matched URL (not just googleFonts[0])
    const primaryFont = fontsWithUrls[0];

    return {
      title,
      domain,
      siteUrl: url,
      logos: logosBase64,
      logo: logosBase64[0] || '',
      colors: finalColors,
      siteBgColor,
      fonts: fontsWithUrls,
      font: primaryFont ? {
        name: primaryFont.name,
        url: primaryFont.url,
        isGoogleFont: primaryFont.isGoogleFont,
      } : {
        name: 'Inter',
        url: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
        isGoogleFont: true,
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
