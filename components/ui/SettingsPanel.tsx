"use client";

import React from "react";
import { useDAStore } from "@/store/daStore";
import { DEFAULT_CONTENT_PROMPT, DEFAULT_GEMINI_MODEL } from "@/lib/defaultPrompt";
import {
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  KeyRound,
  Sparkles,
  MessageSquareText,
  Check,
  ChevronDown,
  Pencil,
  Trash2,
  Plus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import type { GeminiApiKey } from "@/types";

const MODEL_SUGGESTIONS = [
  "gemini-3-flash-preview",
  "gemini-2.5-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

const PLACEHOLDERS = [
  { key: "{{siteTitle}}", desc: "Titre du site" },
  { key: "{{siteUrl}}", desc: "URL complète" },
  { key: "{{domain}}", desc: "Nom de domaine" },
  { key: "{{chips}}", desc: "Tags sélectionnés" },
  { key: "{{brief}}", desc: "Brief client" },
  { key: "{{fileContext}}", desc: "Docs texte joints" },
  { key: "{{pdfInfo}}", desc: "Mention PDF joints" },
];

function GoogleLogo({ size = 14 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-google.svg"
      alt="G"
      width={size}
      height={size}
      style={{ flexShrink: 0 }}
    />
  );
}

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 10) return "•".repeat(k.length);
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

function newKeyId(): string {
  return `key_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ---------- Model dropdown ---------- */

function ModelDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const displayValue = value || DEFAULT_GEMINI_MODEL;
  const isInList = MODEL_SUGGESTIONS.includes(displayValue);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3.5 bg-card border border-border rounded-lg text-[12.5px] font-mono flex items-center justify-between gap-3 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          <GoogleLogo size={13} />
          <span className="truncate text-foreground">{displayValue}</span>
          {!isInList && (
            <span className="text-[9px] font-sans font-semibold uppercase tracking-wider text-foreground/40 px-1.5 py-0.5 bg-foreground/5 rounded">
              custom
            </span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-foreground/40 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+6px)] left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden py-1 origin-top"
          style={{
            animation: "dropdownOpen 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {MODEL_SUGGESTIONS.map((m, i) => {
            const selected = m === value;
            return (
              <button
                key={m}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(m);
                  setOpen(false);
                }}
                style={{
                  animation: `dropdownItemIn 280ms cubic-bezier(0.16, 1, 0.3, 1) ${80 + i * 35}ms both`,
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-mono cursor-pointer transition-colors ${
                  selected
                    ? "bg-foreground/[0.06] text-foreground"
                    : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground"
                }`}
              >
                <GoogleLogo size={13} />
                <span className="flex-1 text-left truncate">{m}</span>
                {selected && <Check className="w-3.5 h-3.5 text-foreground" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------- API keys manager ---------- */

type EditState =
  | { mode: "list" }
  | { mode: "edit"; id: string | null; label: string; key: string };

function ApiKeysManager({
  keys,
  activeId,
  onKeysChange,
  onActiveChange,
}: {
  keys: GeminiApiKey[];
  activeId: string | null;
  onKeysChange: (keys: GeminiApiKey[]) => void;
  onActiveChange: (id: string | null) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [editState, setEditState] = React.useState<EditState>({ mode: "list" });
  const [showKey, setShowKey] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setEditState({ mode: "list" });
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editState.mode === "edit") setEditState({ mode: "list" });
        else setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [open, editState.mode]);

  const active = keys.find((k) => k.id === activeId) || keys[0] || null;

  const startAdd = () => {
    setShowKey(false);
    setEditState({ mode: "edit", id: null, label: "", key: "" });
  };

  const startEdit = (k: GeminiApiKey) => {
    setShowKey(false);
    setEditState({ mode: "edit", id: k.id, label: k.label, key: k.key });
  };

  const saveEdit = () => {
    if (editState.mode !== "edit") return;
    const label = editState.label.trim() || "Sans nom";
    const key = editState.key.trim();
    if (!key) {
      toast.error("La clé ne peut pas être vide");
      return;
    }

    if (editState.id === null) {
      const id = newKeyId();
      onKeysChange([...keys, { id, label, key }]);
      onActiveChange(id);
      toast.success("Clé ajoutée");
    } else {
      onKeysChange(
        keys.map((k) => (k.id === editState.id ? { ...k, label, key } : k))
      );
      toast.success("Clé modifiée");
    }
    setEditState({ mode: "list" });
  };

  const deleteKey = (id: string) => {
    const next = keys.filter((k) => k.id !== id);
    onKeysChange(next);
    if (activeId === id) {
      onActiveChange(next[0]?.id ?? null);
    }
    toast.success("Clé supprimée");
  };

  const selectKey = (id: string) => {
    onActiveChange(id);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full h-10 px-3.5 bg-card border border-border rounded-lg text-[12.5px] flex items-center justify-between gap-3 hover:border-foreground/20 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 min-w-0 flex-1">
          <KeyRound className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
          {active ? (
            <>
              <span className="font-semibold text-foreground truncate">
                {active.label}
              </span>
              <span className="text-foreground/30">·</span>
              <code className="font-mono text-[11.5px] text-foreground/50 truncate">
                {maskKey(active.key)}
              </code>
            </>
          ) : (
            <span className="text-foreground/40 italic">Aucune clé configurée</span>
          )}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-foreground/40 transition-transform shrink-0 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-[calc(100%+6px)] left-0 right-0 z-20 bg-card border border-border rounded-lg shadow-xl overflow-hidden origin-top"
          style={{
            animation: "dropdownOpen 180ms cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {editState.mode === "edit" ? (
            /* Edit form */
            <div className="p-3 flex flex-col gap-2.5">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                  {editState.id === null ? "Nouvelle clé" : "Modifier la clé"}
                </span>
                <button
                  type="button"
                  onClick={() => setEditState({ mode: "list" })}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-foreground/40 hover:text-foreground hover:bg-foreground/5 cursor-pointer transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                type="text"
                value={editState.label}
                onChange={(e) =>
                  setEditState({ ...editState, label: e.target.value })
                }
                placeholder="Nom de la clé (ex: Compte TEAPS)"
                maxLength={40}
                autoFocus
                className="w-full h-9 px-3 bg-background border border-border rounded-md text-[12px] focus:outline-none focus:border-foreground/30 transition-colors"
              />
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={editState.key}
                  onChange={(e) =>
                    setEditState({ ...editState, key: e.target.value })
                  }
                  placeholder="AIza..."
                  className="w-full h-9 px-3 pr-9 bg-background border border-border rounded-md text-[12px] font-mono focus:outline-none focus:border-foreground/30 transition-colors"
                  autoComplete="off"
                  spellCheck={false}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveEdit();
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowKey((v) => !v)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-foreground/40 hover:text-foreground cursor-pointer"
                >
                  {showKey ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={saveEdit}
                  className="h-8 px-3 text-[11.5px] font-semibold rounded-md bg-foreground text-background cursor-pointer flex items-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <Save className="w-3.5 h-3.5" />
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => setEditState({ mode: "list" })}
                  className="h-8 px-3 text-[11.5px] font-semibold rounded-md border border-border text-foreground/70 hover:bg-foreground/5 cursor-pointer transition-all"
                >
                  Annuler
                </button>
                {editState.id !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm("Supprimer cette clé ?")) {
                        deleteKey(editState.id!);
                        setEditState({ mode: "list" });
                      }
                    }}
                    className="ml-auto h-8 w-8 rounded-md flex items-center justify-center text-red-500/80 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-all"
                    aria-label="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* List */
            <div className="py-1">
              {keys.length === 0 && (
                <div className="px-3 py-3 text-[11.5px] text-foreground/40 italic">
                  Aucune clé. Ajoute-en une ci-dessous.
                </div>
              )}
              {keys.map((k, i) => {
                const selected = k.id === active?.id;
                return (
                  <div
                    key={k.id}
                    role="option"
                    aria-selected={selected}
                    style={{
                      animation: `dropdownItemIn 280ms cubic-bezier(0.16, 1, 0.3, 1) ${80 + i * 35}ms both`,
                    }}
                    className={`group flex items-center gap-2 px-3 py-2 text-[12px] transition-colors ${
                      selected
                        ? "bg-foreground/[0.06]"
                        : "hover:bg-foreground/[0.04]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => selectKey(k.id)}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <KeyRound
                        className={`w-3.5 h-3.5 shrink-0 ${
                          selected ? "text-foreground" : "text-foreground/50"
                        }`}
                      />
                      <span
                        className={`font-semibold truncate ${
                          selected ? "text-foreground" : "text-foreground/80"
                        }`}
                      >
                        {k.label}
                      </span>
                      <span className="text-foreground/25">·</span>
                      <code className="font-mono text-[11px] text-foreground/40 truncate">
                        {maskKey(k.key)}
                      </code>
                      {selected && (
                        <Check className="w-3.5 h-3.5 text-foreground shrink-0 ml-auto" />
                      )}
                    </button>
                    <div
                      className={`flex items-center gap-0.5 shrink-0 ${
                        selected ? "" : "opacity-0 group-hover:opacity-100"
                      } transition-opacity`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startEdit(k);
                        }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/50 hover:text-foreground hover:bg-foreground/10 cursor-pointer transition-all"
                        aria-label="Modifier"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer "${k.label}" ?`)) deleteKey(k.id);
                        }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/50 hover:text-red-500 hover:bg-red-500/10 cursor-pointer transition-all"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  type="button"
                  onClick={startAdd}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] font-semibold text-foreground/70 hover:text-foreground hover:bg-foreground/[0.04] cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Ajouter une clé
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Section header / reset ---------- */

function SectionHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-foreground/[0.06] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-foreground/70" />
        </div>
        <div className="flex flex-col">
          <h3 className="text-[13px] font-semibold text-foreground leading-tight">
            {title}
          </h3>
          <p className="text-[11px] text-foreground/40 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-[10px] font-medium text-foreground/40 hover:text-foreground/80 cursor-pointer shrink-0 px-2 py-1 rounded-md hover:bg-foreground/5 transition-all"
    >
      <RotateCcw className="w-3 h-3" /> Défaut
    </button>
  );
}

/* ---------- Main panel ---------- */

export function SettingsPanel() {
  const storedKeys = useDAStore((s) => s.geminiApiKeys);
  const storedActiveId = useDAStore((s) => s.activeApiKeyId);
  const storedModel = useDAStore((s) => s.geminiModel);
  const storedPrompt = useDAStore((s) => s.contentPrompt);
  const setGeminiApiKeys = useDAStore((s) => s.setGeminiApiKeys);
  const setActiveApiKeyId = useDAStore((s) => s.setActiveApiKeyId);
  const setGeminiModel = useDAStore((s) => s.setGeminiModel);
  const setContentPrompt = useDAStore((s) => s.setContentPrompt);

  const [model, setModel] = React.useState(storedModel);
  const [prompt, setPrompt] = React.useState(storedPrompt);

  React.useEffect(() => setModel(storedModel), [storedModel]);
  React.useEffect(() => setPrompt(storedPrompt), [storedPrompt]);

  const isDirty = model !== storedModel || prompt !== storedPrompt;

  const handleSave = () => {
    setGeminiModel(model || DEFAULT_GEMINI_MODEL);
    setContentPrompt(prompt);
    toast.success("Paramètres sauvegardés");
  };

  const handleDiscard = () => {
    setModel(storedModel);
    setPrompt(storedPrompt);
  };

  const promptLines = prompt.split("\n").length;
  const promptChars = prompt.length;

  return (
    <div className="flex flex-col">
      <div className="p-6 flex flex-col gap-5">
        {/* API Keys */}
        <div className="rounded-xl border border-border bg-background/40 p-5">
          <SectionHeader
            icon={KeyRound}
            title="Clés personnalisées"
            description="Ajoute tes propres clés API Gemini et bascule d'un compte à l'autre. Stockage local uniquement."
          />
          <ApiKeysManager
            keys={storedKeys}
            activeId={storedActiveId}
            onKeysChange={setGeminiApiKeys}
            onActiveChange={setActiveApiKeyId}
          />
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-foreground/40">
              Fallback si aucune clé active :
            </span>
            <code className="text-[10px] px-1.5 py-0.5 bg-foreground/5 text-foreground/60 rounded font-mono">
              GEMINI_API_KEY
            </code>
          </div>
        </div>

        {/* Model */}
        <div className="rounded-xl border border-border bg-background/40 p-5">
          <SectionHeader
            icon={Sparkles}
            title="Modèle Gemini"
            description="Choisis le modèle Google à utiliser pour la génération."
            action={<ResetButton onClick={() => setModel(DEFAULT_GEMINI_MODEL)} />}
          />
          <ModelDropdown value={model} onChange={setModel} />
          <div className="flex items-center gap-1.5 mt-3">
            <span className="text-[10px] text-foreground/40">Fallback :</span>
            <code className="text-[10px] px-1.5 py-0.5 bg-foreground/5 text-foreground/60 rounded font-mono">
              GEMINI_MODEL
            </code>
          </div>
        </div>

        {/* Prompt */}
        <div className="rounded-xl border border-border bg-background/40 p-5">
          <SectionHeader
            icon={MessageSquareText}
            title="Prompt de génération"
            description="Template utilisé pour générer l'étude de cas et le post social. Les placeholders sont remplacés à chaque génération."
            action={<ResetButton onClick={() => setPrompt(DEFAULT_CONTENT_PROMPT)} />}
          />
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={20}
            className="w-full px-3.5 py-3 bg-card border border-border rounded-lg text-[11.5px] font-mono leading-[1.65] focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/30 transition-all resize-y min-h-[320px]"
            spellCheck={false}
          />
          <div className="flex items-center justify-between mt-2 text-[10px] text-foreground/40 font-mono">
            <span>{promptLines} lignes</span>
            <span>{promptChars.toLocaleString("fr-FR")} caractères</span>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">
              Placeholders
            </span>
            <div className="grid grid-cols-2 gap-1.5 mt-2.5">
              {PLACEHOLDERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(p.key);
                    toast.success(`${p.key} copié`);
                  }}
                  className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-foreground/[0.03] hover:bg-foreground/[0.07] border border-transparent hover:border-border cursor-pointer transition-all text-left group"
                  title={`Copier ${p.key}`}
                >
                  <code className="text-[10.5px] font-mono text-foreground/80 group-hover:text-foreground">
                    {p.key}
                  </code>
                  <span className="text-[10px] text-foreground/35 truncate">
                    {p.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky save bar (model + prompt only; keys commit immediately) */}
      <div className="sticky bottom-0 bg-card/95 backdrop-blur-md border-t border-border px-6 py-3.5 flex items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-2">
          <span
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              isDirty ? "bg-amber-500" : "bg-green-500/60"
            }`}
          />
          <span className="text-[11.5px] text-foreground/60 font-medium">
            {isDirty
              ? "Modifications non sauvegardées"
              : "Modèle et prompt à jour"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={!isDirty}
            className="h-8 px-3 text-[11.5px] font-semibold rounded-lg border border-border text-foreground/70 hover:bg-foreground/5 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty}
            className="h-8 px-3.5 text-[11.5px] font-semibold rounded-lg bg-foreground text-background disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.2)] active:scale-[0.97]"
          >
            <Save className="w-3.5 h-3.5" />
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}
