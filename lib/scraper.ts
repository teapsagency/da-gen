import puppeteer, { type Page } from 'puppeteer';
import { extractColors } from './colorExtractor';
import { cleanFontName } from './fontName';

type ExtraPage = { label: string; url: string };

/** Dismiss cookie banners, hide overlays & floating widgets */
async function dismissPopups(page: Page) {
  // Age gates ("avez-vous 18 ans ?") en PREMIER : ils bloquent tout le reste
  // (y compris le bandeau cookies). On clique TOUJOURS le bouton affirmatif,
  // jamais le "non" (qui redirige hors du site) ; on saisit une date de
  // naissance majeure si une est demandée ; on retire l'overlay en dernier
  // recours. Couvre l'app Shopify AgeX (cmginfotech) + une heuristique
  // générique scopée aux modales qui parlent d'âge/alcool.
  await page.evaluate(() => {
    const isVisible = (el: Element | null): el is HTMLElement =>
      !!el && el instanceof HTMLElement && el.offsetParent !== null;

    // --- AgeX (Shopify, cmginfotech) : id/classe connus ---
    if (document.querySelector('#cmginfoTechmodal')) {
      const setVal = (sel: string, val: string) => {
        const el = document.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null;
        if (!el) return;
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      };
      // Variante "date de naissance" : on saisit une date clairement majeure.
      setVal('#cmg_age_birthdate', '1');
      setVal('#cmg_age_birthmonth', '1');
      setVal('#cmg_age_birthyear', '1990');
      const agree = document.querySelector('#agreebtn, .cmg_age_agree_btn') as HTMLElement | null;
      agree?.click();
    }

    // --- Heuristique générique (autres apps d'age gate) ---
    const ageRegex = /18\s?ans|21\s?ans|majeur|âge l[ée]gal|age[ -]?verif|verify your age|drinking age|legal drinking|are you\s+(over\s+)?(18|21)|over\s+(18|21)|alcool|alcohol|date de naissance|year of birth/i;
    const affirmRegex = /^(oui|yes|enter|entrer|ok|accéder|confirmer|continuer)$|j['’]?ai\s+(plus de\s+)?(18|21)|je suis majeur|i ?am\s+(over|of)|of legal age|over\s+(18|21)/i;
    const negRegex = /\b(non|no|not|under|moins de|quitter|sortir|leave|exit|sorry)\b/i;

    const fullScreenish = (el: HTMLElement): boolean => {
      const cs = window.getComputedStyle(el);
      if (cs.position !== 'fixed' && cs.position !== 'absolute') return false;
      const r = el.getBoundingClientRect();
      return r.width > window.innerWidth * 0.5 && r.height > window.innerHeight * 0.5;
    };

    const modals = Array.from(document.querySelectorAll<HTMLElement>('div, section, dialog, aside'))
      .filter(isVisible)
      .filter((el) => fullScreenish(el) && ageRegex.test(el.innerText || ''));

    for (const modal of modals) {
      const btns = Array.from(
        modal.querySelectorAll<HTMLElement>('button, a[role="button"], a, input[type="button"], input[type="submit"], [class*="btn" i]')
      ).filter(isVisible);
      const yes = btns.find((b) => {
        const t = ((b as HTMLInputElement).value || b.innerText || b.textContent || '').trim();
        return affirmRegex.test(t) && !negRegex.test(t);
      });
      if (yes) { yes.click(); break; }
    }
  });
  await new Promise((resolve) => setTimeout(resolve, 400));

  // Filet de sécurité : retirer les overlays d'age gate encore visibles et
  // rétablir le scroll (souvent verrouillé via overflow:hidden).
  await page.evaluate(() => {
    const sels = [
      '#cmginfoTechmodal',
      '[id*="age-gate" i]', '[class*="age-gate" i]',
      '[id*="agegate" i]', '[class*="agegate" i]',
      '[id*="age-verification" i]', '[class*="age-verification" i]',
      '[id*="ageverification" i]', '[class*="ageverification" i]',
      '[id*="age-check" i]', '[class*="age-check" i]',
      '[id*="age_check" i]', '[class*="age_check" i]',
    ];
    let removed = false;
    sels.forEach((s) => document.querySelectorAll(s).forEach((el) => { el.remove(); removed = true; }));
    if (removed) {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
  });

  await page.evaluate(() => {
    // Click cookie accept buttons
    const selectors = [
      '#axeptio_btn_acceptAll', '#axeptio_btn_dismiss',
      '.axeptio_widget button[data-type="accept"]', '[data-axeptio-type="accept"]',
      'button[id*="cookie" i][id*="accept" i]', 'button[id*="cookie" i][id*="agree" i]',
      'button[class*="cookie" i][class*="accept" i]', 'button[class*="cookie" i][class*="agree" i]',
      'a[id*="cookie" i][id*="accept" i]', 'a[class*="cookie" i][class*="accept" i]',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
      '#onetrust-accept-btn-handler', '.cc-btn.cc-allow', '.cc-accept',
      '[data-testid="cookie-accept"]',
      '[aria-label*="cookie" i][aria-label*="accept" i]', '[aria-label*="cookie" i][aria-label*="agree" i]',
      'button[id*="accept" i]', 'button[class*="accept" i]', 'a[class*="accept" i]',
      '.consent-accept', '#consent-accept',
      '[class*="cookie" i] button', '[id*="cookie" i] button',
      '[class*="consent" i] button', '[id*="consent" i] button', '[class*="gdpr" i] button',
      // CookieYes (SaaS) — boutons accepter / fermer
      '.cky-btn-accept', '[data-cky-tag="accept-button"]', '.cky-btn-close',
      // CookieYes plugin WordPress (ancienne version)
      '#cookie_action_close_header', '#cookie_action_close_header_reject', '.cli_action_button',
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel) as HTMLElement | null;
      if (btn && btn.offsetParent !== null) { btn.click(); break; }
    }

    // Text-based fallback
    const allButtons = Array.from(document.querySelectorAll('button, a[role="button"]')) as HTMLElement[];
    const acceptKeywords = ['accept', 'agree', 'allow', 'accepter', 'acceptez', "j'accepte", 'tout accepter', 'ok', 'got it', 'understood'];
    for (const btn of allButtons) {
      const text = (btn.innerText || btn.textContent || '').toLowerCase().trim();
      if (acceptKeywords.some(kw => text.includes(kw)) && btn.offsetParent !== null) {
        const rect = btn.getBoundingClientRect();
        if (rect.width < 400 && rect.width > 20) { btn.click(); break; }
      }
    }

    // Remove Shadow DOM popups (Shopify Forms, etc.)
    document.querySelectorAll('shopify-forms-embed, [id*="shopify-forms"], [id*="klaviyo"], klaviyo-popup').forEach(el => {
      el.remove();
    });

    // Close buttons inside generic modals/popups
    const closeSelectors = [
      '[class*="popup" i] [class*="close" i]', '[class*="popup" i] button[aria-label*="close" i]',
      '[class*="modal" i] [class*="close" i]', '[class*="modal" i] button[aria-label*="close" i]',
      '[class*="newsletter" i] [class*="close" i]', '[class*="newsletter" i] button[aria-label*="close" i]',
      '[class*="signup" i] [class*="close" i]',
      '.privy-dismiss-button', '[class*="privy"] [class*="close"]',
      '[class*="optinmonster"] .om-close', '[class*="optimonk"] [class*="close"]',
      '[class*="wisepops"] [class*="close"]', '[class*="justuno"] [class*="close"]',
    ];
    for (const sel of closeSelectors) {
      document.querySelectorAll(sel).forEach(btn => {
        if (btn instanceof HTMLElement && btn.offsetParent !== null) btn.click();
      });
    }

    // CSS injection to hide overlays
    const overlaySelectors = [
      '[class*="cookie-banner" i]', '[class*="cookie-consent" i]', '[class*="cookie-notice" i]',
      '[class*="cookieConsent" i]', '[id*="cookie-banner" i]', '[id*="cookie-consent" i]',
      '[id*="cookieconsent" i]', '[class*="gdpr" i]', '#CybotCookiebotDialog',
      '#onetrust-banner-sdk', '.cc-window',
      '#axeptio_overlay', '.axeptio_widget', '.axeptio-widget', '[id^="axeptio"]',
      '.agJsWidget', '[id^="agWidget"]',
      '[class*="trustpilot-widget" i]', '[id*="trustpilot" i]',
      '[class*="avis-verifies" i]', '[id*="avis-verifies" i]',
      '[class*="chat-widget" i]', '[class*="chatWidget" i]', '[id*="chat-widget" i]',
      '[id*="intercom" i]', '[id*="crisp" i]', '[id*="hubspot-messages" i]', '[id*="tidio" i]',
      // Zenchef (réservation resto) — widget flottant « Réserver une table ».
      // Deux générations : (1) ancienne iframe SDK (classe au préfixe stable
      // ZC_sdk__, hash variable) ; (2) nouvelle version Panda CSS dont les classes
      // sont génériques (pos_fixed, d_flex, bdr_xl…) — donc PAS de "zenchef" en
      // classe — mais marquée data-testid="zenchef-…". On ne vise QUE les éléments
      // porteurs d'un marqueur zenchef/zc_sdk/zc-widget, jamais les boutons
      // « réserver » du thème (qui n'ont aucun de ces marqueurs).
      '[class*="zc_sdk" i]', '[class*="zc-widget" i]', '[id*="zc-widget" i]',
      '[class*="zenchef" i]', '[id*="zenchef" i]',
      '[data-testid*="zenchef" i]', 'iframe[src*="zenchef" i]',
      // Newsletter / promo popups
      '[class*="popup" i][class*="newsletter" i]', '[id*="popup" i][id*="newsletter" i]',
      '[class*="popup" i][class*="email" i]', '[class*="popup" i][class*="promo" i]',
      '[class*="popup" i][class*="signup" i]', '[class*="popup-overlay" i]',
      '[class*="modal-overlay" i]', '[class*="modalOverlay" i]',
      '.privy-popup', '[class*="privy"]',
      '[class*="klaviyo" i]', '[id*="klaviyo" i]',
      '[class*="optinmonster" i]', '[id*="optinmonster" i]',
      '[class*="optimonk" i]', '[id*="optimonk" i]',
      '[class*="wisepops" i]', '[id*="wisepops" i]',
      '[class*="justuno" i]', '[id*="justuno" i]',
      '[class*="wheelio" i]', '[id*="wheelio" i]',
      '[class*="spin-a-sale" i]', '[id*="spin-a-sale" i]',
      'shopify-forms-embed',
      // CookieYes (SaaS) — overlay, conteneur, modal préférences, bouton revisit.
      // ⚠ Le préfixe "cky-" DOIT matcher un token de classe entier (début ou
      // après une espace) : un `[class*="cky-"]` naïf attrape "stiCKY-md" et
      // toutes les utilitaires "sticky-*" → display:none sur le contenu en
      // position sticky (galerie produit Shopify), d'où des captures blanches.
      '[class^="cky-" i]', '[class*=" cky-" i]', '[id^="cky-" i]', '[data-cky-tag]',
      '.cky-consent-container', '.cky-overlay', '.cky-modal', '.cky-btn-revisit-wrapper',
      '.cky-consent-bar', '.cky-preference-center',
      // CookieYes plugin WordPress (préfixe cli-/cookie-law) — même précaution
      // de token entier pour "cli-" (sinon "client-", "click-"…).
      '#cookie-law-info-bar', '#cookie-law-info-again', '.cli-modal-backdrop',
      '.cli-bar-container', '[class^="cli-" i][class*="bar" i]', '[class*=" cli-" i][class*="bar" i]',
    ];
    const style = document.createElement('style');
    style.innerHTML = overlaySelectors.map(s => `${s} { display: none !important; visibility: hidden !important; opacity: 0 !important; pointer-events: none !important; }`).join('\n');
    document.head.appendChild(style);
  });
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Inject a color emoji font so Chromium headless (Linux server) can render
 * emojis instead of showing tofu rectangles. macOS/Windows ship Apple Color
 * Emoji / Segoe UI Emoji, but Linux/Docker rarely does — we ship Noto Color
 * Emoji via Google Fonts (the only emoji font legally distributable on the
 * web; Apple does not license its emoji set).
 *
 * IMPORTANT : on N'ALIASE PLUS 'Apple Color Emoji' / 'Segoe UI Emoji' /
 * 'Noto Color Emoji' via @font-face. Ces noms figurent dans la pile de polices
 * par défaut de Tailwind (et de beaucoup de sites) ; les rendre résolvables
 * vers une vraie police emoji l'injecte dans le chemin de rendu de TOUT le
 * texte, et Chromium/Linux élargit alors l'avance des espaces (bug connu de
 * Noto Color Emoji CBDT → titres aux mots très espacés). On déclare donc une
 * police sous un nom PRIVÉ ('DAGenEmoji') et on enveloppe UNIQUEMENT les
 * séquences emoji dans un <span> qui l'utilise : lettres et espaces ne croisent
 * jamais la police emoji, la typo du site reste intacte.
 */
async function injectEmojiFont(page: Page) {
  await page.evaluate(() => {
    const fontUrl = 'https://fonts.gstatic.com/s/notocoloremoji/v39/Yq6P-KqIXTD0t4D9z1ESnKM3-HpFab4.ttf';
    const style = document.createElement('style');
    style.setAttribute('data-da-gen-emoji', '');
    // Nom privé : aucun site ne le référence → pas de contamination de la pile
    // héritée. local('Apple Color Emoji') garde des emojis nets en dev macOS.
    style.textContent = `
      @font-face {
        font-family: 'DAGenEmoji';
        src: local('Apple Color Emoji'), url('${fontUrl}') format('truetype');
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    // Détection (non globale) et découpe (globale, inclut les modificateurs :
    // VS16, ZWJ, teintes de peau, drapeaux régionaux, keycaps).
    const detect = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F2FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/u;
    const splitRun = /(?:[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F0FF}\u{1F100}-\u{1F2FF}\u{2300}-\u{23FF}\u{2B00}-\u{2BFF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE0F}\u{200D}\u{1F3FB}-\u{1F3FF}\u{20E3}\u{1F1E6}-\u{1F1FF}])+/gu;

    // On collecte d'abord les nœuds texte (muter le DOM pendant le TreeWalker
    // fausse l'itération), puis on enveloppe chaque séquence emoji.
    const targets: Text[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const t = node.textContent;
      if (t && detect.test(t)) targets.push(node as Text);
    }

    for (const tn of targets) {
      const text = tn.textContent || '';
      splitRun.lastIndex = 0;
      const frag = document.createDocumentFragment();
      let last = 0;
      let m: RegExpExecArray | null;
      while ((m = splitRun.exec(text))) {
        if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const span = document.createElement('span');
        // Police emoji confinée à ce span (que des emojis, jamais d'espace).
        // 'Noto Color Emoji' en dernier recours si la police installée existe :
        // sans espace dans le span, le bug d'avance n'a aucun effet.
        span.style.fontFamily = "'DAGenEmoji', 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";
        span.textContent = m[0];
        frag.appendChild(span);
        last = m.index + m[0].length;
      }
      if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
      tn.parentNode?.replaceChild(frag, tn);
    }
  });
  // Give the font a beat to actually load before we screenshot.
  await page.evaluate(() => (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, 300));
}

/**
 * Stabilise la page pour des captures déterministes : rend visibles les sections
 * masquées par des reveals (Elementor/AOS/wow), rend animations et transitions
 * quasi-instantanées, et force `scroll-behavior: auto` pour que nos scrollTo
 * soient immédiats. Certains sites ont `scroll-behavior: smooth`, ce qui anime
 * le retour en haut et fige le hero plus bas au moment de la capture. Idempotent.
 */
async function stabilizePage(page: Page) {
  await page.evaluate(() => {
    if (document.querySelector('style[data-da-gen-reveal]')) return;
    const style = document.createElement('style');
    style.setAttribute('data-da-gen-reveal', '');
    style.textContent = `
      html, body { scroll-behavior: auto !important; }
      .elementor-invisible { visibility: visible !important; opacity: 1 !important; }
      /* Reveals AOS/WOW : on neutralise l'état "caché" SANS forcer l'opacity en
         !important. Forcer opacity:1 !important écrasait l'opacity:0 que des
         carrousels (ex. testimonials Shopify) posent EN STYLE INLINE sur leurs
         slides non-actives → toutes les slides se superposaient. La visibilité
         finale est rétablie via la classe .aos-animate (cf. revealLazyContent),
         que le style inline d'un slide masqué l'emporte toujours (inline > règle). */
      [data-aos], .wow { transform: none !important; visibility: visible !important; }
      *, *::before, *::after {
        animation-duration: 0.01s !important; animation-delay: 0s !important;
        transition-duration: 0.01s !important; transition-delay: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });
}

/**
 * Déclenche le contenu différé pour les captures BAS de page : images en
 * lazy-load et animations "reveal on scroll" (IntersectionObserver, Elementor,
 * AOS…) qui laissent les sections vides tant qu'on n'a pas scrollé. On stabilise,
 * on déroule toute la page (déclenche observers + chargement des images), on
 * attend que les images finissent (borné), puis on remonte en haut. NB : la
 * capture hero se fait AVANT ce déroulé (cf. captureScreenshots).
 */
async function revealLazyContent(page: Page) {
  await stabilizePage(page);

  // Déroulé complet : déclenche les IntersectionObservers et le chargement
  //    des images lazy. Hauteur recalculée à chaque pas (le contenu grandit),
  //    nombre d'itérations plafonné.
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      const distance = Math.max(400, Math.round(window.innerHeight * 0.85));
      let steps = 0;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        steps++;
        // Hauteur réelle : certains sites scrollent sur <html>, pas <body>.
        const docH = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
        const atBottom = window.scrollY + window.innerHeight >= docH - 2;
        if (atBottom || steps > 60) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });

  // 3) Forcer le chargement des images en lazy-load AVANT d'attendre. Beaucoup
  //    de thèmes (Shopify .image-lazy-load, lazysizes…) affichent un LQIP
  //    minuscule (src ...width=10, très flou) et ne mettent le vrai visuel que
  //    dans data-src/data-srcset, swappé en JS à l'entrée dans le viewport. Le
  //    swap + téléchargement n'est pas toujours fini avant la capture fullpage
  //    desktop → images floues (alors qu'OK en mobile, capturé plus tard). On
  //    promeut donc le vrai src/srcset tout de suite et on passe en eager.
  await page.evaluate(() => {
    document.querySelectorAll('img[data-src], img[data-srcset]').forEach((img) => {
      const el = img as HTMLImageElement;
      const dSrcset = el.getAttribute('data-srcset');
      const dSrc = el.getAttribute('data-src');
      const dSizes = el.getAttribute('data-sizes');
      if (dSrcset) el.setAttribute('srcset', dSrcset);
      if (dSrc) el.setAttribute('src', dSrc);
      if (dSizes && dSizes !== 'auto') el.setAttribute('sizes', dSizes);
      el.setAttribute('loading', 'eager');
      el.removeAttribute('data-srcset');
      el.removeAttribute('data-src');
    });
  });

  // 4) Attendre les images en vol (borné à 6s : certains visuels promus sont de
  //    gros PNG, 3s ne suffisait pas pour les dernières sections).
  await page.evaluate(() => {
    const pending = Array.from(document.images).filter((img) => !img.complete);
    return Promise.race([
      Promise.all(pending.map((img) => new Promise<void>((res) => {
        img.addEventListener('load', () => res());
        img.addEventListener('error', () => res());
      }))),
      new Promise<void>((res) => setTimeout(res, 6000)),
    ]);
  });

  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise((resolve) => setTimeout(resolve, 300));

  await page.evaluate(() => {
    // 1) Filet anti-"revert" : AOS (once:false) et WOW retirent la classe
    //    d'animation quand l'élément ressort du viewport → après le retour en
    //    haut, des sections déjà vues repassent à opacity:0 (fullpage blanche
    //    par endroits). On ré-applique la classe « animée » partout.
    document.querySelectorAll('[data-aos]').forEach((el) => el.classList.add('aos-animate'));
    document.querySelectorAll('.wow').forEach((el) => el.classList.add('animated'));

    // 2) Carrousels empilés sur-révélés : leurs slides occupent la MÊME cellule
    //    (position/grid superposée) et ne sont distinguées qu'en JS (opacity
    //    inline) — JS qui ne tourne pas de façon fiable en headless. Du coup AOS
    //    révèle TOUTES les slides empilées d'un coup → textes superposés (ex.
    //    témoignages Shopify). Heuristique : si des frères [data-aos] se
    //    chevauchent et qu'UN SEUL porte une classe active (is-selected/active/
    //    current/…), on masque les autres. Le chevauchement exclut les
    //    nav/onglets/listes (disposés côte à côte, jamais superposés).
    const ACTIVE = /(?:^|[\s_-])(is[-_]?selected|is[-_]?active|active|selected|current|swiper-slide-active)(?:$|[\s_-])/i;
    const overlap = (a: Element, b: Element) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      if (ra.width < 40 || ra.height < 40) return false;
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      const oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (ox <= 0 || oy <= 0) return false;
      return ox * oy > 0.6 * Math.min(ra.width * ra.height, rb.width * rb.height);
    };
    // Signature de classe « stable » (hors classes d'animation/état) pour
    // distinguer des slides RÉPÉTÉES (même composant) d'un design en calques.
    const sig = (el: Element) => (el.getAttribute('class') || '')
      .replace(/\baos-(init|animate)\b/g, '')
      .replace(/\bis[-_]?(selected|active)\b/gi, '')
      .replace(/\s+/g, ' ').trim();
    const parents = new Set<Element>();
    document.querySelectorAll('[data-aos]').forEach((el) => { if (el.parentElement) parents.add(el.parentElement); });
    parents.forEach((parent) => {
      const slides = Array.from(parent.children).filter((c) => c.hasAttribute('data-aos'));
      if (slides.length < 2 || slides.length > 12) return;
      if (!slides.some((s, i) => slides.some((t, j) => i !== j && overlap(s, t)))) return;
      const active = slides.filter((s) => ACTIVE.test(s.getAttribute('class') || ''));
      // Slide à garder : celle marquée active si elle existe ; sinon, UNIQUEMENT
      // si les slides sont homogènes (même classe = vrai carrousel, ex. la liste
      // d'images synchronisée des témoignages, sans marqueur actif), on garde la
      // première. Si les frères ont des classes différentes (design en calques
      // fond + contenu), on ne touche à rien.
      let keep: Element | null = null;
      if (active.length === 1) keep = active[0];
      else if (active.length === 0 && slides.every((s) => sig(s) === sig(slides[0]))) keep = slides[0];
      if (!keep) return;
      slides.forEach((s) => {
        if (s !== keep) {
          (s as HTMLElement).style.setProperty('opacity', '0', 'important');
          (s as HTMLElement).style.setProperty('visibility', 'hidden', 'important');
        }
      });
    });
  });
}

/**
 * Capture `fullPage` en restant sous la limite de rastérisation de Chromium.
 * Au-delà d'environ **16384 px de HAUTEUR (device)**, une capture fullPage est
 * « tuilée » et le rendu se corrompt : le HAUT de page est dupliqué en bas de
 * l'image (footer recouvert par un fantôme header+hero). Le mobile (dsf 2) y
 * tombe vite : 8200 px CSS × 2 = 16400 px > limite ; le desktop (dsf 1.5) bien
 * plus tard, d'où des desktop souvent OK mais des mobiles cassés.
 *
 * Parade : on réduit la résolution de SORTIE via `clip.scale` (et non via
 * setViewport). C'est crucial — changer le viewport déclenche un `resize` qui
 * réinitialise les animations « au scroll » de certains sites réactifs (le
 * contenu repasse alors à opacity:0 → capture blanche, ex. smarteen.fr).
 * `clip.scale` ne touche pas au layout/au viewport : il rend juste la sortie un
 * peu moins dense sur les pages très longues, mais entière et non corrompue.
 */
async function captureFullPageSafely(
  page: Page,
  vp: { width: number; height: number; deviceScaleFactor: number },
  jpeg: { type: 'jpeg'; quality: number },
) {
  const MAX_DEVICE_PX = 16000;
  const { width: cssW, height: docH } = await page.evaluate(() => ({
    width: Math.max(document.documentElement.clientWidth, document.documentElement.scrollWidth),
    height: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
  }));
  // `clip.scale` est RELATIF au deviceScaleFactor (il se multiplie). La hauteur
  // de sortie ≈ docH × dsf × scale ; on choisit scale pour la plafonner à
  // MAX_DEVICE_PX (et ≤ 1 pour ne pas suréchantillonner). Les pages courtes
  // gardent scale = 1 → pleine densité ; seules les très longues sont réduites.
  const scale = Math.min(1, MAX_DEVICE_PX / Math.max(1, docH * vp.deviceScaleFactor));
  return Buffer.from(await page.screenshot({
    ...jpeg,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: cssW, height: docH, scale },
  }));
}

/** Take desktop (viewport), desktop full page, scroll-position captures, and mobile screenshots */
async function captureScreenshots(page: Page, zoom: number = 1) {
  // JPEG q92 — bon compromis netteté/poids (les screenshots n'ont pas de
  // transparence). q88 laissait des artefacts de compression visibles quand on
  // zoomait sur un asset exporté ; q92 les réduit nettement pour un coût modéré.
  const JPEG = { type: 'jpeg' as const, quality: 92 };
  const dataUrl = (buf: Buffer) => `data:image/jpeg;base64,${buf.toString('base64')}`;

  // Densité des captures desktop : 2× → 2880px de large. À 1.5× (2160px) les
  // screenshots du site pixelisaient quand on zoomait sur un asset exporté ; 2×
  // donne de la marge de zoom. Zoom navigateur : on élargit le viewport de
  // 1/zoom et on réduit le deviceScaleFactor de ×zoom → le site se rend comme à
  // un zoom Chrome de `zoom` (media queries réévaluées) tandis que la largeur de
  // sortie reste 1440·DESKTOP_DSF quel que soit le zoom. Mobile reste en 390px.
  const DESKTOP_DSF = 2;
  const z = zoom > 0 ? zoom : 1;
  const deskW = Math.round(1440 / z);
  const deskH = Math.round(900 / z);

  // Desktop viewport (hero / top of page)
  await page.setViewport({ width: deskW, height: deskH, deviceScaleFactor: DESKTOP_DSF * z });
  // Hero capturé AVANT tout déroulé : on stabilise (anims instantanées, visibilité,
  // scroll-behavior auto) puis on shoote au vrai sommet de page. Sinon, sur les
  // sites où le retour en haut après un scroll programmatique n'est pas immédiat,
  // le hero serait figé plus bas — c'est cette capture viewport qu'utilisent les
  // frames Cover / HeroSimple / etc.
  await stabilizePage(page);
  await new Promise((resolve) => setTimeout(resolve, 200));
  const desktopBuf = Buffer.from(await page.screenshot(JPEG));

  // Déroule ensuite pour charger le lazy-load + déclencher les reveals (utile aux
  // captures fullpage/mid/lower) ; les images chargées persistent pour la suite.
  await revealLazyContent(page);

  // Desktop full page — plafond de hauteur = garde-fou mémoire/stabilité (PAS
  // supprimé : sans lui, une page à rallonge alloue un bitmap géant et peut
  // faire planter Chromium → tout le scrape échoue). 20000px couvre tous les
  // sites réalistes (le footer de chateaujasson ~7250px passe largement) ; on
  // ne tronque que les pages pathologiques (feed infini…), qui de toute façon
  // ne chargent plus de lazy-content au-delà de ~45000px (cf. revealLazyContent).
  await page.evaluate(() => {
    document.body.style.maxHeight = '20000px';
    document.body.style.overflow = 'hidden';
  });
  const desktopFullBuf = await captureFullPageSafely(page, { width: deskW, height: deskH, deviceScaleFactor: DESKTOP_DSF * z }, JPEG);

  // Reset body constraints
  await page.evaluate(() => {
    document.body.style.maxHeight = '';
    document.body.style.overflow = '';
  });

  // Scroll-position captures (for single-URL social frames)
  const totalHeight = await page.evaluate(() =>
    Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
  );
  const viewportH = deskH;

  // Mid-page capture (~40% scroll)
  const scrollMid = Math.min(Math.round(totalHeight * 0.4), totalHeight - viewportH);
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, scrollMid));
  await new Promise(resolve => setTimeout(resolve, 300));
  const desktopMidBuf = Buffer.from(await page.screenshot(JPEG));

  // Lower-page capture (~70% scroll)
  const scrollLower = Math.min(Math.round(totalHeight * 0.7), totalHeight - viewportH);
  await page.evaluate((y) => window.scrollTo(0, y), Math.max(0, scrollLower));
  await new Promise(resolve => setTimeout(resolve, 300));
  const desktopLowerBuf = Buffer.from(await page.screenshot(JPEG));

  // Reset scroll
  await page.evaluate(() => window.scrollTo(0, 0));

  // Mobile full page
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
  await new Promise(resolve => setTimeout(resolve, 500));
  // Re-dérouler au viewport mobile : le thème recharge des images lazy / sources
  // différentes et rejoue les animations d'entrée → sans ça, hero/sections vides.
  await revealLazyContent(page);
  await page.evaluate(() => {
    document.body.style.maxHeight = '20000px';
    document.body.style.overflow = 'hidden';
  });
  const mobileBuf = await captureFullPageSafely(page, { width: 390, height: 844, deviceScaleFactor: 2 }, JPEG);

  // Reset for potential next navigation
  await page.evaluate(() => {
    document.body.style.maxHeight = '';
    document.body.style.overflow = '';
  });

  return {
    desktop: dataUrl(desktopBuf),
    desktopFull: dataUrl(desktopFullBuf),
    desktopMid: dataUrl(desktopMidBuf),
    desktopLower: dataUrl(desktopLowerBuf),
    mobile: dataUrl(mobileBuf),
    desktopBuffer: desktopBuf,
  };
}

/** Navigate to a page, dismiss popups, and capture all screenshots */
async function navigateAndCapture(page: Page, pageUrl: string, delay: number, zoom: number = 1) {
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForNetworkIdle({ idleTime: 1000, timeout: 8000 }).catch(() => {});
  await new Promise(resolve => setTimeout(resolve, Math.min(delay, 3000)));
  await dismissPopups(page);
  await injectEmojiFont(page);
  return captureScreenshots(page, zoom);
}

export async function scrapeSite(url: string, delay: number = 2000, extraPages: ExtraPage[] = [], onLog?: (entry: { time: number; msg: string }) => void, zoom: number = 1) {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  const t0 = Date.now();
  const log = (msg: string) => {
    const entry = { time: Date.now() - t0, msg };
    console.log(`[scraper +${entry.time}ms] ${msg}`);
    onLog?.(entry);
  };

  try {
    log('Launching browser...');
    browser = await puppeteer.launch({
      defaultViewport: { width: 1920, height: 1080 },
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        // Lisse le rendu texte en headless Linux et évite quelques artefacts
        // de subpixel autour des glyphes (utile aussi pour les emojis).
        '--font-render-hinting=none',
      ],
    });
    log('Browser launched');

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

    // Forcer la langue FR : certains sites (ex. captibulle.com) détectent
    // Accept-Language ou navigator.language côté serveur/JS et redirigent vers /en
    // si le navigateur ne déclare pas le français. On override les deux.
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.5',
    });
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'language', { get: () => 'fr-FR' });
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
    });

    page.on('pageerror', (err: unknown) => log(`PAGE ERROR: ${err instanceof Error ? err.message : String(err)}`));
    page.on('requestfailed', (req) => log(`REQUEST FAILED: ${req.url()} — ${req.failure()?.errorText}`));
    page.on('response', (res) => {
      const reqUrl = res.url();
      if (reqUrl.endsWith('.css') || reqUrl.includes('/css')) {
        log(`CSS ${res.status()}: ${reqUrl.slice(0, 120)}`);
      }
    });

    const googleFonts: string[] = [];
    const fontshareFonts: string[] = [];
    const adobeFonts: string[] = [];
    page.on('request', (request) => {
      const reqUrl = request.url();
      if (reqUrl.includes('fonts.googleapis.com/css')) googleFonts.push(reqUrl);
      if (reqUrl.includes('api.fontshare.com')) fontshareFonts.push(reqUrl);
      if (reqUrl.includes('use.typekit.net')) adobeFonts.push(reqUrl);
    });

    log(`Navigating to ${url} (waitUntil: domcontentloaded)...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    log('DOM loaded, waiting for network idle...');
    await page.waitForNetworkIdle({ idleTime: 1000, timeout: 15000 }).catch(() => log('Network idle timeout (15s) — continuing'));
    log(`Waiting ${delay}ms (user delay)...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Check how many stylesheets are loaded
    const styleInfo = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
      return {
        loadedSheets: sheets.length,
        linkTags: links.length,
        sheetsWithRules: sheets.filter(s => { try { return s.cssRules.length > 0; } catch { return false; } }).length,
        failedSheets: links.filter(l => !(l as HTMLLinkElement).sheet).map(l => (l as HTMLLinkElement).href),
      };
    });
    log(`Stylesheets: ${styleInfo.loadedSheets} loaded, ${styleInfo.linkTags} <link> tags, ${styleInfo.sheetsWithRules} with rules`);
    if (styleInfo.failedSheets.length > 0) {
      log(`FAILED stylesheets: ${styleInfo.failedSheets.join(', ')}`);
    }

    await dismissPopups(page);
    log('Popups dismissed');

    await injectEmojiFont(page);
    log('Emoji font injected');

    const title = await page.title();
    const domain = new URL(url).hostname;
    log(`Title: "${title}", Domain: ${domain}`);
    page.setDefaultTimeout(25000);

    // Main page screenshots
    log(`Capturing screenshots (zoom ${Math.round(zoom * 100)}%)...`);
    const mainScreenshots = await captureScreenshots(page, zoom);
    log('Screenshots captured');

    log('Extracting colors...');
    let vibrantColors: Awaited<ReturnType<typeof extractColors>> = [];
    try {
      let timeoutId: ReturnType<typeof setTimeout>;
      vibrantColors = await Promise.race([
        extractColors(mainScreenshots.desktopBuffer),
        new Promise<never>((_, reject) => { timeoutId = setTimeout(() => reject(new Error('timeout')), 10000); }),
      ]);
      clearTimeout(timeoutId!);
      log(`Colors extracted (${vibrantColors.length} swatches)`);
    } catch {
      log('Color extraction failed/timeout — using CSS colors only');
    }

    // Extract logos (multiple candidates)
    log('Extracting logos...');
    const logoCandidates = await page.evaluate(() => {
      const candidates: string[] = [];

      const icon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]') as HTMLLinkElement;
      if (icon) candidates.push(icon.href);

      const selectors = [
        'header img', 'nav img', '.logo img', '[class*="logo"] img',
        'header svg', 'nav svg', '.logo svg', 'a[href="/"] img', 'a[href="/"] svg',
        '[class*="logo"] svg',
      ];

      selectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (el instanceof HTMLImageElement) {
            // currentSrc d'abord : c'est l'image réellement affichée (résolue
            // depuis srcset), donc la vraie résolution — pas le LQIP minuscule
            // (...width=10) parfois laissé dans `src` par le lazy-load.
            const real = el.currentSrc || el.src;
            if (real) candidates.push(real);
          }
          if (el instanceof SVGSVGElement) {
            try {
              const serializer = new XMLSerializer();
              const svgString = serializer.serializeToString(el);
              const encoded = btoa(unescape(encodeURIComponent(svgString)));
              candidates.push(`data:image/svg+xml;base64,${encoded}`);
            } catch {
              // Skip SVGs that can't be serialized
            }
          }
        });
      });

      return Array.from(new Set(candidates)).filter(src => src.startsWith('http') || src.startsWith('data:'));
    });

    log(`Found ${logoCandidates.length} logo candidates`);
    const candidates = logoCandidates.slice(0, 8);
    const httpCandidates = candidates.filter((s) => !s.startsWith('data:'));

    // Récupération PRINCIPALE via fetch() DANS le contexte de la page : profite
    // de la session/des cookies, pas de CORS pour les images same-origin (cas
    // courant, ex. captibulle /cdn/shop/…), et bien plus fiable qu'ouvrir une
    // page par logo — qui échoue par intermittence sur les sites à anti-bot ou
    // quand la page principale est lourde (gotos avortés). Aligné sur httpCandidates.
    const viaFetch = await page.evaluate(async (urls) => {
      const toDataUrl = (blob: Blob) => new Promise<string | null>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(typeof fr.result === 'string' ? fr.result : null);
        fr.onerror = () => resolve(null);
        fr.readAsDataURL(blob);
      });
      const out: (string | null)[] = [];
      for (const u of urls) {
        try {
          const res = await fetch(u, { credentials: 'include' });
          if (!res.ok) { out.push(null); continue; }
          const blob = await res.blob();
          if (!blob.type.startsWith('image') || blob.size === 0 || blob.size > 3_000_000) { out.push(null); continue; }
          out.push(await toDataUrl(blob));
        } catch { out.push(null); }
      }
      return out;
    }, httpCandidates);
    const fetchByUrl = new Map<string, string | null>();
    httpCandidates.forEach((u, i) => fetchByUrl.set(u, viaFetch[i] ?? null));

    const logosBase64: string[] = [];
    for (const src of candidates) {
      if (src.startsWith('data:')) { logosBase64.push(src); continue; }
      const fetched = fetchByUrl.get(src);
      if (fetched) { logosBase64.push(fetched); continue; }
      // Repli : cross-origin sans CORS → fetch() a échoué ; on tente la navigation.
      let logoPage: Page | undefined;
      try {
        logoPage = await browser.newPage();
        const response = await logoPage.goto(src, { timeout: 10000 });
        const buffer = await response?.buffer();
        if (buffer && buffer.length > 0) {
          const contentType = response?.headers()['content-type'] || 'image/png';
          logosBase64.push(`data:${contentType};base64,${buffer.toString('base64')}`);
        }
      } catch { /* skip failed logos */ }
      finally {
        // Always close the tab, even if goto/buffer threw — avoids leaking
        // Chromium pages across the loop.
        if (logoPage) await logoPage.close().catch(() => {});
      }
    }

    log(`Logos fetched: ${logosBase64.length}`);

    // CSS colors (buttons, links, accents)
    log('Extracting CSS colors...');
    const cssColors = await page.evaluate(() => {
      const colors = new Set<string>();
      document.querySelectorAll('button, a, [class*="btn"], [class*="active"], h1, h2').forEach(el => {
        const style = window.getComputedStyle(el);
        [style.backgroundColor, style.color].forEach(c => {
          const rgb = c.match(/\d+/g);
          if (rgb && rgb.length >= 3) {
            const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
            const hex = "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
            const isLight = (r * 299 + g * 587 + b * 114) / 1000 > 128;
            if (hex !== '#FFFFFF' && hex !== '#000000' && hex !== '#0A0A0A') {
              colors.add(JSON.stringify({ hex, isLight, rgb: [r, g, b] }));
            }
          }
        });
      });
      return Array.from(colors).slice(0, 10).map(s => JSON.parse(s));
    });

    // Combine CSS colors (priority) with Vibrant colors, deduplicate
    const combinedColors = [...cssColors, ...vibrantColors];
    const finalColors = Array.from(new Map(combinedColors.map(c => [c.hex, c])).values()).slice(0, 8);

    // Extract fonts
    log('Extracting fonts...');
    const extractedFonts = await page.evaluate(() => {
      const fonts = new Map<string, number>();
      const iconKeywords = ['icon', 'symbol', 'remix', 'lucide', 'awesome', 'fontello', 'glyph', 'material'];
      const systemFonts = ['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-sans-serif', 'ui-serif', 'ui-monospace', '-apple-system', 'blinkmacsystemfont', 'segoe ui', 'roboto', 'helvetica', 'arial', 'times new roman', 'times', 'courier new', 'courier', 'inherit', 'initial', 'unset',
        // Polices emoji — dont 'dagenemoji', notre police injectée pour le rendu
        // des emojis : ne jamais les détecter comme polices du site.
        'dagenemoji', 'apple color emoji', 'segoe ui emoji', 'noto color emoji', 'twemoji mozilla'];

      document.querySelectorAll('h1, h2, h3, h4, p, span, button, a, li, div').forEach(el => {
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

      const fontFaceMap: Record<string, string> = {};
      try {
        for (const sheet of Array.from(document.styleSheets)) {
          try {
            for (const rule of Array.from(sheet.cssRules || [])) {
              if (rule instanceof CSSFontFaceRule) {
                const family = rule.style.getPropertyValue('font-family').replace(/['"]/g, '').trim();
                const src = rule.style.getPropertyValue('src');
                if (family && src) fontFaceMap[family] = src;
              }
            }
          } catch { /* cross-origin stylesheets */ }
        }
      } catch { /* no access */ }

      // Police dominante des titres (h1-h3) vs corps (p/li) → classement
      // Titre/Texte. Même filtrage icônes/polices système que ci-dessus.
      const tally = (selector: string): string => {
        const counts = new Map<string, number>();
        document.querySelectorAll(selector).forEach(el => {
          const fam = window.getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          if (!fam) return;
          const lower = fam.toLowerCase();
          if (iconKeywords.some(kw => lower.includes(kw)) || systemFonts.includes(lower)) return;
          counts.set(fam, (counts.get(fam) || 0) + 1);
        });
        return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([n]) => n)[0] || '';
      };
      const headingFamily = tally('h1, h2, h3');
      const bodyFamily = tally('p, li');

      const sorted = Array.from(fonts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
      return { fontNames: sorted.slice(0, 10), fontFaceMap, headingFamily, bodyFamily };
    });

    const siteBgColor = await page.evaluate(() => {
      const toHex = (rgbStr: string): string | null => {
        const rgb = rgbStr.match(/[\d.]+/g);
        if (!rgb || rgb.length < 3) return null;
        // Check if transparent (alpha = 0 or rgba with 0 alpha)
        const alpha = rgb.length >= 4 ? parseFloat(rgb[3]) : 1;
        if (alpha === 0) return null;
        const r = parseInt(rgb[0]), g = parseInt(rgb[1]), b = parseInt(rgb[2]);
        // Skip black from transparent backgrounds
        if (r === 0 && g === 0 && b === 0 && alpha < 1) return null;
        return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
      };

      // Try body first
      const bodyBg = window.getComputedStyle(document.body).backgroundColor;
      const bodyHex = toHex(bodyBg);
      if (bodyHex) return bodyHex;

      // Try html element
      const htmlBg = window.getComputedStyle(document.documentElement).backgroundColor;
      const htmlHex = toHex(htmlBg);
      if (htmlHex) return htmlHex;

      return "#FFFFFF";
    });

    // Normalize font names: strip build-tool artifacts (Next.js next/font
    // emits family names like "__Satoshi_Variable_e8ce4c"), camelCase, etc.
    const mappedFonts = extractedFonts.fontNames.map(name => {
      const displayName = cleanFontName(name);
      const searchName = displayName.toLowerCase().replace(/ +/g, '+');
      const googleUrl = googleFonts.find(u => u.toLowerCase().includes(searchName));
      const fontshareUrl = fontshareFonts.find(u => u.toLowerCase().includes(searchName));
      const adobeUrl = adobeFonts.length > 0 ? adobeFonts[0] : undefined;
      const hasFontFace = !!extractedFonts.fontFaceMap[name] || !!extractedFonts.fontFaceMap[displayName];
      const fontUrl = googleUrl || fontshareUrl || adobeUrl || undefined;

      return {
        name: displayName,
        isGoogleFont: !!googleUrl,
        url: fontUrl,
        isSelfHosted: hasFontFace && !fontUrl,
      };
    });

    // Deduplicate: distinct weights/styles can collapse to the same family name
    const seenFonts = new Set<string>();
    const fontsWithUrls = mappedFonts.filter(f => {
      const key = f.name.toLowerCase();
      if (!f.name || seenFonts.has(key)) return false;
      seenFonts.add(key);
      return true;
    });

    // Classement Titre/Texte : on retrouve, parmi les polices détectées, celle
    // dominante sur les titres et celle dominante sur le corps de texte.
    const findFont = (raw: string) => {
      const n = cleanFontName(raw || '');
      return n ? fontsWithUrls.find(f => f.name.toLowerCase() === n.toLowerCase()) : undefined;
    };
    const headingFontObj = findFont(extractedFonts.headingFamily);
    const bodyFontObj = findFont(extractedFonts.bodyFamily);

    // Police active par défaut = celle des titres (souvent la police de marque,
    // plus pertinente pour une DA) ; sinon la plus fréquente.
    const primaryFont = headingFontObj || fontsWithUrls[0];

    log('Main page extraction complete');

    // Capture extra pages
    const capturedExtraPages: { label: string; url: string; desktop: string; desktopFull: string; mobile: string }[] = [];
    for (const ep of extraPages) {
      try {
        log(`Capturing extra page: ${ep.label} (${ep.url})`);
        const shots = await navigateAndCapture(page, ep.url, delay, zoom);
        capturedExtraPages.push({
          label: ep.label,
          url: ep.url,
          desktop: shots.desktop,
          desktopFull: shots.desktopFull,
          mobile: shots.mobile,
        });
        log(`Extra page "${ep.label}" captured`);
      } catch (e) {
        log(`Extra page "${ep.label}" FAILED: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return {
      title,
      domain,
      siteUrl: url,
      logos: logosBase64,
      logo: logosBase64[0] || '',
      colors: finalColors,
      siteBgColor,
      fonts: fontsWithUrls,
      headingFont: headingFontObj?.name,
      bodyFont: bodyFontObj?.name,
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
        desktop: mainScreenshots.desktop,
        desktopFull: mainScreenshots.desktopFull,
        desktopMid: mainScreenshots.desktopMid,
        desktopLower: mainScreenshots.desktopLower,
        mobile: mainScreenshots.mobile,
      },
      extraPages: capturedExtraPages,
    };
  } finally {
    if (browser) await browser.close();
  }
}
