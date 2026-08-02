import { useCallback, useEffect, useState } from "react";

const SEARCH_DELAY_MS = 180;

export interface NotesSearchState {
  readonly query: string;
  readonly debouncedQuery: string;
  readonly isPending: boolean;
  readonly setQuery: (query: string) => void;
  readonly clear: () => void;
}

export function useNotesSearch(): NotesSearchState {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const clear = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
  }, []);

  return {
    query,
    debouncedQuery,
    isPending: query.trim() !== debouncedQuery,
    setQuery,
    clear,
  };
}
