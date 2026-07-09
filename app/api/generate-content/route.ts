import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import {
  DEFAULT_CONTENT_PROMPT,
  DEFAULT_GEMINI_MODEL,
  renderPrompt,
  buildRegenPrompt,
  REGEN_FIELDS,
  type RegenField,
} from '@/lib/defaultPrompt';

// AI generation streams for a while.
export const maxDuration = 120;

const MAX_FILES = 6;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB per file

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const chips = JSON.parse(formData.get('chips') as string || '[]') as string[];
    const siteData = JSON.parse(formData.get('siteData') as string || '{}');
    const clientBrief = (formData.get('clientBrief') as string || '').trim();
    const clientApiKey = (formData.get('apiKey') as string || '').trim();
    const clientPrompt = (formData.get('prompt') as string || '').trim();
    const clientModel = (formData.get('model') as string || '').trim();
    const regenField = (formData.get('regenField') as string || '').trim();
    const sitemapUrls = JSON.parse(formData.get('sitemap') as string || '[]') as string[];
    const files = (formData.getAll('files') as File[])
      .filter((f) => f && f.size > 0 && f.size <= MAX_FILE_SIZE)
      .slice(0, MAX_FILES);

    const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Clé Gemini manquante. Renseignez-la dans Settings ou via GEMINI_API_KEY.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // ─── Mode régénération d'UN SEUL bloc ───────────────────────────────────
    // Déclenché par `regenField` dans le FormData. Réponse JSON simple (pas de
    // streaming) : { value } pour les blocs texte, { caption, hashtags } pour la
    // légende. Le chemin de génération complète (ci-dessous) reste intact.
    if (regenField && (REGEN_FIELDS as readonly string[]).includes(regenField)) {
      const current = JSON.parse((formData.get('currentContent') as string) || '{}');
      const regenPrompt = buildRegenPrompt({
        field: regenField as RegenField,
        siteTitle: siteData.title || siteData.domain || '',
        siteUrl: siteData.siteUrl || '',
        domain: siteData.domain || '',
        chips: chips.length > 0 ? chips.join(' · ') : 'Non précisé',
        brief: clientBrief,
        current: JSON.stringify(current),
      });

      const modelName = clientModel || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: 'application/json' },
      });
      const result = await model.generateContent(regenPrompt);
      const raw = result.response.text().trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim());
      } catch {
        return NextResponse.json({ error: "Réponse de l'IA invalide. Réessayez." }, { status: 502 });
      }

      if (regenField === 'caption') {
        const obj = parsed as { caption?: unknown; hashtags?: unknown };
        const caption = typeof obj.caption === 'string' ? obj.caption.trim() : '';
        const hashtags = Array.isArray(obj.hashtags)
          ? obj.hashtags.filter((h): h is string => typeof h === 'string')
          : [];
        if (!caption) {
          return NextResponse.json({ error: 'Régénération vide. Réessayez.' }, { status: 502 });
        }
        return NextResponse.json({ caption, hashtags });
      }

      const obj = parsed as { value?: unknown };
      const value = typeof obj.value === 'string' ? obj.value.trim() : '';
      if (!value) {
        return NextResponse.json({ error: 'Régénération vide. Réessayez.' }, { status: 502 });
      }
      return NextResponse.json({ value });
    }

    let fileContext = '';
    const pdfParts: Part[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md' || ext === 'html' || ext === 'json') {
        const text = await file.text();
        fileContext += `\n\n--- ${file.name} ---\n${text}`;
      } else if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        pdfParts.push({
          inlineData: { mimeType: 'application/pdf', data: base64 }
        });
      }
    }

    const template = clientPrompt || DEFAULT_CONTENT_PROMPT;
    const prompt = renderPrompt(template, {
      siteTitle: siteData.title || siteData.domain || '',
      siteUrl: siteData.siteUrl || '',
      domain: siteData.domain || '',
      chips: chips.length > 0 ? chips.join(' · ') : 'Non précisé',
      brief: clientBrief ? `## Brief client (fourni par l'agence)\n${clientBrief}` : '',
      fileContext: fileContext ? `## Documents complémentaires\n${fileContext}` : '',
      pdfInfo: pdfParts.length > 0 ? `(${pdfParts.length} fichier(s) PDF joint(s) ci-dessous)` : '',
      sitemap: sitemapUrls.length > 0
        ? `## Sitemap du site client (pages internes disponibles)\nIntègre 2 à 4 de ces URLs comme liens Markdown dans les paragraphes de l'étude de cas (intro / challenge / solution / results). **Ne les utilise pas dans le post social.** Voir règles détaillées plus bas.\n\n${sitemapUrls.slice(0, 80).join('\n')}`
        : '',
    });

    const parts: Part[] = [{ text: prompt }, ...pdfParts];

    const modelName = clientModel || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
    // responseMimeType forces a clean JSON output (no ```json fences / preamble).
    const model = genAI.getGenerativeModel({
      model: modelName,
      generationConfig: { responseMimeType: 'application/json' },
    });
    const result = await model.generateContentStream(parts);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (err) {
    console.error('[generate-content]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lors de la génération.' },
      { status: 500 }
    );
  }
}
