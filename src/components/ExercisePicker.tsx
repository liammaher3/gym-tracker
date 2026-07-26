import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { Icon } from "./ui/Icons";

type LibraryItem = {
  id: string;
  name: string;
  equipment: string | null;
  primary_muscles: string[];
  user_id: string | null;
};

type Props = {
  userId: string;
  onAdd: (name: string, libraryId: string) => void | Promise<void>;
  onCancel: () => void;
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const GROUPS = ["All", "Chest", "Back", "Legs", "Arms", "Shoulders", "Core"];

/**
 * Full-screen picker (was an inline dropdown). Same client-side ranking as
 * before — exact > starts-with > word-start > contains — but the whole library
 * gets the screen, so the list is scannable at arm's length in a gym.
 */
export default function ExercisePicker({ userId, onAdd, onCancel }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("All");
  const [busy, setBusy] = useState(false);

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

  const q = query.trim().toLowerCase();

  const results = items
    .filter(
      (it) =>
        group === "All" ||
        (it.primary_muscles ?? []).some((m) =>
          m.toLowerCase().includes(group.toLowerCase()),
        ),
    )
    .map((it) => {
      const name = it.name.toLowerCase();
      let score = -1;
      if (name === q) score = 0;
      else if (name.startsWith(q)) score = 1;
      else if (name.includes(" " + q)) score = 2;
      else if (name.includes(q)) score = 3;
      return { it, score };
    })
    .filter((r) => q === "" || r.score >= 0)
    .sort((a, b) => a.score - b.score || a.it.name.localeCompare(b.it.name))
    .slice(0, 50)
    .map((r) => r.it);

  const hasExact = items.some((it) => it.name.toLowerCase() === q);
  const showCreate = q.length > 0 && !hasExact;

  const select = async (item: LibraryItem) => {
    if (busy) return;
    setBusy(true);
    await onAdd(item.name, item.id);
    setBusy(false);
  };

  const createCustom = async () => {
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
    setItems((prev) => [...prev, data as LibraryItem]);
    await onAdd(data.name, data.id);
    setBusy(false);
  };

  return (
    <div className="grid-backdrop relative flex min-h-screen flex-col bg-ground text-ink">
      <div className="relative flex-none px-[22px] pb-4 pt-2">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-head text-[26px] uppercase leading-none tracking-[.04em]">
            Add exercise
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 font-body text-[11px] uppercase tracking-[.16em] text-dim hover:text-ink"
          >
            Cancel
          </button>
        </div>

        <div className="flex h-[46px] items-center gap-2.5 border border-accent bg-accent-soft px-3.5">
          <Icon.Search size={16} className="text-accent" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the library"
            className="w-full bg-transparent font-body text-[15px] text-ink placeholder:text-dim focus:outline-none"
          />
        </div>

        <div className="mt-3 flex gap-[7px] overflow-x-auto">
          {GROUPS.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGroup(g)}
              className={[
                "flex-none border px-[11px] py-1.5 font-body text-[10px] uppercase tracking-[.14em]",
                g === group
                  ? "border-accent bg-accent text-on-accent"
                  : "border-line text-dim hover:border-accent hover:text-accent",
              ].join(" ")}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 overflow-auto px-[22px]">
        <div className="border-t border-line py-2.5 font-body text-[9px] uppercase leading-none tracking-[.22em] text-dim">
          {loading ? "Loading library" : results.length + " matches"}
        </div>
        {results.map((item) => {
          const subtitle = [item.equipment, item.primary_muscles?.[0]]
            .filter(Boolean)
            .map((s) => cap(s as string))
            .join(" · ");
          return (
            <button
              key={item.id}
              type="button"
              disabled={busy}
              onClick={() => select(item)}
              className="flex w-full items-center gap-3.5 border-b border-line px-0.5 py-[13px] text-left hover:bg-slab disabled:opacity-45"
            >
              <span className="flex-1">
                <span className="flex items-center gap-2">
                  <span className="font-body text-[15px] leading-tight">
                    {item.name}
                  </span>
                  {item.user_id ? (
                    <span className="border border-accent px-1.5 py-[2px] font-body text-[8.5px] uppercase leading-[1.3] tracking-[.14em] text-accent">
                      Custom
                    </span>
                  ) : null}
                </span>
                {subtitle ? (
                  <span className="mt-[5px] block font-body text-[10.5px] uppercase leading-none tracking-[.1em] text-dim">
                    {subtitle}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
        {!loading && results.length === 0 ? (
          <p className="py-8 text-center font-body text-[13px] text-dim">
            {q ? "No matches." : "Start typing to search."}
          </p>
        ) : null}
      </div>

      {showCreate ? (
        <div className="relative flex-none border-t border-line px-[22px] pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-3.5">
          <button
            type="button"
            disabled={busy}
            onClick={createCustom}
            className="flex h-[48px] w-full items-center justify-center gap-2 border border-dashed border-accent font-body text-[12px] font-semibold uppercase tracking-[.16em] text-accent hover:border-solid hover:bg-accent-soft disabled:opacity-45"
          >
            <Icon.Plus size={15} />
            Create “{query.trim()}”
          </button>
        </div>
      ) : null}
    </div>
  );
}
