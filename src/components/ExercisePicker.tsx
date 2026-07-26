import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type LibraryItem = {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
  user_id: string | null;
};

type Props = {
  userId: string;
  // Called once an exercise is chosen (existing) or created (custom).
  onAdd: (name: string, libraryId: string) => void | Promise<void>;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function ExercisePicker({ userId, onAdd }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load the whole library once (catalog + this user's customs via RLS),
  // then filter client-side. ~900 rows is trivial to search in memory.
  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("exercise_library")
        .select("id, name, equipment, primary_muscles, user_id")
        .order("name", { ascending: true });

      if (error) console.error(error);
      else setItems(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.trim().toLowerCase();

  // Rank: exact > starts-with > word-start > contains, then alphabetical.
  const results = items
    .map((it) => {
      const name = it.name.toLowerCase();
      let score = -1;
      if (name === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (name.includes(` ${q}`)) score = 2;
      else if (name.includes(q)) score = 3;
      return { it, score };
    })
    .filter((r) => q === "" || r.score >= 0)
    .sort((a, b) => a.score - b.score || a.it.name.localeCompare(b.it.name))
    .slice(0, 50)
    .map((r) => r.it);

  const hasExact = items.some((it) => it.name.toLowerCase() === q);
  const showCreate = q.length > 0 && !hasExact;

  const reset = () => {
    setQuery("");
    setOpen(false);
    setBusy(false);
  };

  const handleSelect = async (item: LibraryItem) => {
    if (busy) return;
    setBusy(true);
    await onAdd(item.name, item.id);
    reset();
  };

  const handleCreateCustom = async () => {
    const name = query.trim();
    if (!name || busy) return;
    setBusy(true);

    const { data, error } = await supabase
      .from("exercise_library")
      .insert({ user_id: userId, name })
      .select("id, name, equipment, primary_muscles, user_id")
      .single();

    if (error) {
      console.error(error);
      setBusy(false);
      return;
    }

    // Add to the in-memory list so it's searchable immediately.
    setItems((prev) => [...prev, data as LibraryItem]);
    await onAdd(data.name, data.id);
    reset();
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search or add an exercise..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {open && (
        <div className="absolute left-0 right-0 mt-1 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-4 py-3">
                Loading exercises...
              </p>
            ) : results.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 px-4 py-3">
                {q ? "No matches." : "Start typing to search."}
              </p>
            ) : (
              <ul>
                {results.map((item) => {
                  const subtitle = [item.equipment, item.primary_muscles?.[0]]
                    .filter(Boolean)
                    .map((s) => cap(s as string))
                    .join(" · ");
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-sm text-gray-800 dark:text-gray-100">
                            {item.name}
                          </span>
                          {item.user_id && (
                            <span className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded px-1 py-0.5">
                              Custom
                            </span>
                          )}
                        </span>
                        {subtitle && (
                          <span className="block text-xs text-gray-400 dark:text-gray-500">
                            {subtitle}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Persistent add-custom option, pinned below the scroll area */}
          {showCreate && (
            <button
              type="button"
              disabled={busy}
              onClick={handleCreateCustom}
              className="w-full text-left px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-blue-600 dark:text-blue-400 font-medium disabled:opacity-50"
            >
              + Add “{query.trim()}” as a new exercise
            </button>
          )}
        </div>
      )}
    </div>
  );
}
