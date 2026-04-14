# Contexte du Projet : DA Generator (Générateur d'Identité Visuelle)

Ce fichier sert de mémoire technique pour les futures sessions avec Gemini CLI. Il définit l'architecture, les choix technologiques et les règles de design du projet.

## 🎯 Objectif du Projet
Une application web (SaaS) permettant aux agences d'entrer l'URL d'un client. L'outil scrape le site (Puppeteer) pour extraire l'ADN visuel (couleurs, typographie, logos, screenshots) et génère automatiquement 3 "Frames" de présentation (Identité, Mockup, Cover) exportables en haute résolution dans un fichier ZIP.

## 🏗️ Stack Technique
- **Framework** : Next.js 16 (App Router)
- **Langage** : TypeScript (strict)
- **Styling** : Tailwind CSS v4 (Variables CSS basées sur HEX pour compatibilité)
- **État Global** : Zustand (`store/daStore.ts`)
- **Scraping** : `puppeteer` (Chromium bundlé téléchargé au `npm install`) — déploiement self-hosted sur Coolify
- **Extraction Couleurs** : `node-vibrant` (et analyse CSS personnalisée)
- **Export** : `html-to-image` + `jszip` + `file-saver`
- **IA** : `@google/generative-ai` (Gemini Flash, streaming)
- **Icônes** : `lucide-react`
- **UI** : Inspiré de shadcn/ui (Radix UI), notifications via `sonner`

## 🎨 Design System & UX (Règles strictes)
- **Minimalisme** : Style très épuré, typique des SaaS/Fintech modernes. Pas de bordures épaisses ni d'ombres excessives.
- **Typographie Unique** : Utilisation **exclusive** de la police `Satoshi`. Pas de polices Serif.
- **Graisses** : Légères (400, 500 pour le texte, 700 max pour les titres). Pas de 900.
- **Casse** : Utilisation du "Sentence case" (Première lettre en majuscule, le reste en minuscules) pour les labels de l'interface. Pas de TOUT EN MAJUSCULES (sauf pour les badges ou indicateurs spécifiques).
- **Thème** : Gestion du Dark/Light mode via l'attribut `data-theme="dark"` sur la balise `<html>`.
- **Composants** : Sidebar avec des sections rétractables (Accordions) pour garder une vue claire.

## ⚠️ Contraintes Techniques Critiques
1. **Export html2canvas** : `html2canvas` ne supporte pas les nouvelles fonctions de couleur CSS modernes comme `oklch` ou `oklab`. Toutes les couleurs appliquées dans les frames (ou dans les variables globales) doivent être en format **HEX**.
2. **Résolution des Frames** : L'export cible des frames cachées dans le DOM (`.frames-offscreen`) qui ont une taille stricte et fixée en pixels (2373x1473px). Cela évite les bugs liés à la capture de conteneurs utilisant le CSS `transform: scale()`.
3. **Puppeteer Screenshots** : Les screenshots utilisent un `deviceScaleFactor` (x2 ou x3) pour être nets (Retina) lorsqu'ils sont intégrés dans les frames géantes.

## 🚀 Fonctionnalités Clés
- Extraction intelligente des couleurs (priorité au CSS des boutons/liens plutôt qu'au background).
- Détection des polices avec fallback dynamique et option d'upload de fichiers locaux (`.ttf`, `.otf`).
- Sélecteur d'arrondi (border-radius) s'appliquant aux frames et à la preview.
- Choix de logo parmi plusieurs candidats scrapés (navbar, favicon) + Logo de l'agence (upload).
- Export en un clic générant un fichier `.zip` contenant les 3 frames.
