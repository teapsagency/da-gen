import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurée dans .env.local' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const formData = await request.formData();
    const chips = JSON.parse(formData.get('chips') as string || '[]') as string[];
    const siteData = JSON.parse(formData.get('siteData') as string || '{}');
    const clientBrief = (formData.get('clientBrief') as string || '').trim();
    const files = formData.getAll('files') as File[];

    // Build parts array for Gemini (text + optional inline PDF)
    const parts: Part[] = [];

    // Text context from uploaded files
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

    const chipsText = chips.length > 0 ? chips.join(' · ') : 'Non précisé';

    const prompt = `Tu es rédacteur pour TEAPS, agence digitale basée à Toulon. Tu écris de manière simple, claire et professionnelle. Pas de formules grandiloquentes, pas de "mission acceptée", pas de ton publicitaire. Juste un style fluide, factuel et humain. On parle au "nous", on nomme le client, on décrit ce qu'on a fait concrètement.

## Infos du site analysé
- Nom / Titre : ${siteData.title || siteData.domain}
- URL : ${siteData.siteUrl || ''}
- Domaine : ${siteData.domain || ''}

## Type de projet
${chipsText}

${clientBrief ? `## Brief client (fourni par l'agence)\n${clientBrief}` : ''}
${fileContext ? `## Documents complémentaires\n${fileContext}` : ''}
${pdfParts.length > 0 ? `(${pdfParts.length} fichier(s) PDF joint(s) ci-dessous)` : ''}

## Style d'écriture

### Ce qu'on veut
- Phrases simples et directes, vocabulaire courant
- Ton posé, professionnel, sans en faire trop
- Descriptions concrètes de ce qui a été fait
- Écrire au "nous" pour l'agence, nommer le client naturellement

### Ce qu'on ne veut PAS
- Exclamations forcées ("Mission acceptée !", "L'aventure est lancée !")
- Vocabulaire marketing creux ("disruptif", "game-changer", "révolutionner")
- Phrases à rallonge avec des adjectifs empilés
- Ton commercial ou publicitaire

### Exemple de style attendu (cas réel TEAPS)
Intro : "Litière Tranquille est une marque de Terdis, PME française située au cœur de La Manche. Installée à Saint Lô depuis sa création, l'entreprise a choisi en 2018 de réhabiliter l'ancienne laiterie Claudel, comme site de conception et de production des litières Tranquille, participant ainsi à la dynamique de l'économie locale."
Solution : "Nous avons créé un site Shopify moderne et ergonomique, parfaitement adapté à la vente en ligne de produits pour chats. Litière Tranquille dispose désormais d'une boutique en ligne efficace, esthétique et facile à naviguer, offrant à ses clients une expérience d'achat optimisée."

### Structure du cas client
- title : "[Nom du client]" ou "[Nom] – [accroche courte]"
- tagline : Phrase d'accroche simple et directe (12-18 mots)
- intro : Présenter le client, son activité, son histoire, ce qui le rend intéressant. Style narratif simple. (1 paragraphe, 60-100 mots)
- challenge : Pourquoi le client a fait appel à nous, ses besoins concrets, le contexte. (1 paragraphe, 50-80 mots)
- solution : Ce qu'on a conçu : technologie, design, fonctionnalités, choix techniques. Factuel et concret. (1 paragraphe, 60-100 mots)
- results : Impact concret + 2-3 métriques hypothétiques crédibles si pas de données réelles. (1 paragraphe, 50-80 mots)

### Post LinkedIn/Instagram
Rédige un post naturel et varié. Ne suis PAS toujours la même structure mécanique. Adapte le format au projet : parfois commencer par une question, parfois par une anecdote, parfois par le résultat. Sois créatif dans l'amorce.

Éléments à inclure (dans l'ordre que tu veux, avec des lignes vides entre les blocs) :
- TOUJOURS commencer par une phrase courte annonçant le type de projet pour le client, par exemple : "Nouvelle réalisation pour [Nom] !", "Refonte du site de [Nom] !", "On vous présente le nouveau site de [Nom] !", "Création du site e-commerce de [Nom] !" — varie la formulation à chaque fois
- Une accroche qui donne envie de lire
- Le contexte du projet et du client
- Ce qu'on a réalisé (utiliser 💻 pour introduire le travail de TEAPS)
- Le lien vers le site sous la forme : Découvrez ${siteData.title || siteData.domain} : ${siteData.siteUrl || siteData.domain}
- Un appel à l'action vers TEAPS : "Vous aussi vous souhaitez votre site web ? 👉 https://teaps.fr/"

Emojis : 2-3 max par post, en fin de phrase, palette : 💻 🚀 🌐 ✨
Varie le ton et la structure d'un post à l'autre. Évite les formules répétitives.

### Hashtags (6 max)
Toujours inclure : #marketing #marketingdigital #digital + 3 pertinents au projet.

## Sortie
JSON strictement valide uniquement, sans markdown, sans texte autour :

{
  "caseStudy": {
    "title": "Nom ou Nom – accroche courte",
    "tagline": "Phrase simple et directe (12-18 mots)",
    "intro": "Paragraphe narratif (60-100 mots). Qui est le client, son histoire, son activité.",
    "challenge": "Paragraphe (50-80 mots). Besoins concrets, contexte, pourquoi nous.",
    "solution": "Paragraphe (60-100 mots). Ce qu'on a fait concrètement : techno, design, fonctionnalités.",
    "results": "Paragraphe (50-80 mots). Impact + métriques crédibles.",
    "services": ["Service 1", "Service 2", "Service 3"],
    "platform": "Technologie / CMS utilisé"
  },
  "socialPost": {
    "caption": "Post complet avec les 6 blocs séparés par \\n\\n",
    "hashtags": ["#marketing", "#marketingdigital", "#digital", "#hashtag4", "#hashtag5", "#hashtag6"]
  }
}`;

    parts.push({ text: prompt });
    // Add PDF files after the text prompt
    parts.push(...pdfParts);

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    // Stream the response
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
