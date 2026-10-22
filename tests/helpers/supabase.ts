import { vi } from "vitest";

/**
 * An in-memory stand-in for the supabase client. Components build queries
 * exactly as they do in production (`from().select().eq()...`); each query is
 * recorded when awaited and answered by whichever handler matches it.
 *
 * Wire it up in a test file with:
 *   vi.mock("../../src/lib/supabaseClient", async () => (await import("./supabase")).supabaseModule);
 */

export type Op = "select" | "insert" | "update" | "delete";
export type Filter = [method: string, ...args: unknown[]];

export type Query = {
  table: string;
  op: Op;
  columns?: string;
  payload?: unknown;
  filters: Filter[];
  single: boolean;
};

export type Response = { data: unknown; error: unknown };
type Reply = Partial<Response> | Promise<Partial<Response>>;
type Handler = {
  table: string;
  op: Op;
  respond: (q: Query) => Promise<Response>;
};

let handlers: Handler[] = [];
export let queries: Query[] = [];

/**
 * Answer every `op` query against `table`. Later registrations win, so a test
 * can override a default set up in beforeEach. Pass a function to answer
 * differently depending on the query's filters or payload, or to return a
 * promise the test resolves later (see `deferred`).
 */
export function on(table: string, op: Op, response: Reply | ((q: Query) => Reply)) {
  handlers.unshift({
    table,
    op,
    respond: async (q) => {
      const r = await (typeof response === "function" ? response(q) : response);
      return { data: null, error: null, ...r };
    },
  });
}

/** A promise plus its resolver, for holding a query in flight. */
export function deferred<T = Partial<Response>>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

/** All recorded queries matching table and op, in the order they ran. */
export const queriesFor = (table: string, op?: Op) =>
  queries.filter((q) => q.table === table && (!op || q.op === op));

/** The value passed to the first `.eq/.in/...(column, value)` of that method. */
export const filterValue = (q: Query, method: string, column: string) =>
  q.filters.find(([m, c]) => m === method && c === column)?.[2];

async function respond(q: Query): Promise<Response> {
  const h = handlers.find((h) => h.table === q.table && h.op === q.op);
  if (h) return h.respond(q);
  // Unhandled selects return no rows; unhandled writes succeed with no data.
  return { data: q.op === "select" && !q.single ? [] : null, error: null };
}

function from(table: string) {
  const q: Query = { table, op: "select", filters: [], single: false };
  let opChosen = false;
  const builder = {
    select(columns?: string) {
      if (!opChosen) {
        q.op = "select";
        q.columns = columns;
        opChosen = true;
      }
      return builder;
    },
    insert(payload: unknown) {
      q.op = "insert";
      q.payload = payload;
      opChosen = true;
      return builder;
    },
    update(payload: unknown) {
      q.op = "update";
      q.payload = payload;
      opChosen = true;
      return builder;
    },
    delete() {
      q.op = "delete";
      opChosen = true;
      return builder;
    },
    eq: (...args: unknown[]) => filter("eq", args),
    in: (...args: unknown[]) => filter("in", args),
    order: (...args: unknown[]) => filter("order", args),
    limit: (...args: unknown[]) => filter("limit", args),
    single() {
      q.single = true;
      return builder;
    },
    then<T>(onFulfilled: (r: Response) => T, onRejected?: (e: unknown) => T) {
      queries.push(q);
      return respond(q).then(onFulfilled, onRejected);
    },
  };
  function filter(method: string, args: unknown[]) {
    q.filters.push([method, ...args]);
    return builder;
  }
  return builder;
}

/* ── auth ─────────────────────────────────────────────────────────── */

type AuthCallback = (event: string, session: unknown) => void;
let authCallbacks: AuthCallback[] = [];
let currentSession: unknown = null;

export const auth = {
  getSession: vi.fn(async () => ({ data: { session: currentSession } })),
  onAuthStateChange: vi.fn((cb: AuthCallback) => {
    authCallbacks.push(cb);
    return {
      data: {
        subscription: {
          unsubscribe: vi.fn(() => {
            authCallbacks = authCallbacks.filter((c) => c !== cb);
          }),
        },
      },
    };
  }),
  signOut: vi.fn(async () => ({ error: null })),
};

/** The session getSession() will resolve with. */
export function setSession(session: unknown) {
  currentSession = session;
}

/** Fire onAuthStateChange listeners, as supabase does on sign-in/out. */
export function emitAuthChange(event: string, session: unknown) {
  currentSession = session;
  for (const cb of [...authCallbacks]) cb(event, session);
}

export const authListenerCount = () => authCallbacks.length;

export function makeSession(userId = "user-1") {
  return { user: { id: userId, email: "lifter@example.com" } };
}

/* ── module ───────────────────────────────────────────────────────── */

export const supabase = { from: vi.fn(from), auth };
export const supabaseModule = { supabase };

/** Clear handlers, recorded queries, auth state and spies. */
export function resetSupabase() {
  handlers = [];
  queries = [];
  authCallbacks = [];
  currentSession = null;
  supabase.from.mockClear();
  auth.getSession.mockClear();
  auth.onAuthStateChange.mockClear();
  auth.signOut.mockClear();
}
