"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Search, X } from "lucide-react";

type DictionaryEntry = {
  word: string;
  meanings: {
    partOfSpeech?: string;
    definitions: { definition: string; example?: string }[];
  }[];
};

async function fetchDefinition(word: string): Promise<DictionaryEntry | null> {
  const res = await fetch(
    `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`
  );
  if (!res.ok) return null;
  const data = (await res.json()) as DictionaryEntry[];
  return data[0] ?? null;
}

function getSelectedWord(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  const text = sel.toString().trim();
  if (!text || /\s/.test(text)) return null;
  return text.replace(/[^a-zA-Z'-]/g, "");
}

export function DictionaryPopover() {
  const [word, setWord] = useState<string | null>(null);
  const [entry, setEntry] = useState<DictionaryEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (w: string) => {
    setWord(w);
    setLoading(true);
    setError(null);
    setEntry(null);
    try {
      const result = await fetchDefinition(w.toLowerCase());
      if (!result) {
        setError("Definition unavailable for this word.");
      } else {
        setEntry(result);
      }
    } catch {
      setError("Could not reach the dictionary service.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const onMouseUp = () => {
      const selected = getSelectedWord();
      if (selected && selected.length >= 2) {
        lookup(selected);
      }
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [lookup]);

  const dismiss = () => {
    setWord(null);
    setEntry(null);
    setError(null);
  };

  if (!word) return null;

  return (
    <div
      className="fixed bottom-20 right-4 z-[10055] w-[min(320px,calc(100vw-2rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-xl"
      role="dialog"
      aria-label="Dictionary"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-semibold capitalize">{word}</span>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={dismiss}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close dictionary</span>
        </Button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Looking up definition…
        </div>
      ) : error ? (
        <p className="text-sm text-muted-foreground">{error}</p>
      ) : entry ? (
        <div className="max-h-48 space-y-3 overflow-y-auto text-sm">
          {entry.meanings.slice(0, 3).map((meaning, i) => (
            <div key={i}>
              {meaning.partOfSpeech ? (
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {meaning.partOfSpeech}
                </span>
              ) : null}
              <ul className="mt-1 list-disc space-y-1 pl-4">
                {meaning.definitions.slice(0, 2).map((def, j) => (
                  <li key={j}>
                    {def.definition}
                    {def.example ? (
                      <span className="mt-0.5 block text-xs italic text-muted-foreground">
                        &ldquo;{def.example}&rdquo;
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
