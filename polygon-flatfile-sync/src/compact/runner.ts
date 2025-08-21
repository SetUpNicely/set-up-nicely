// src/compact/runner.ts
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { compactDailyToMonthly } from "./compactDailyToMonthly";
import { compactMonthlyToYearly } from "./compactMonthlyToYearly"; // optional, still exported
import { buildAllTailSnapshots } from "./buildTailSnapshot";
import {
  listSymbolsFromAllowed,
  monthsBetween,
} from "./gcs";
import type { TF, Session } from "./parquetSchema";

const DEFAULT_TFS: TF[] = ["1m","5m","15m","30m","1h","4h","1d"];
const DEFAULT_SESSIONS: Session[] = ["RTH","EXTENDED"];

const OUT_BUCKET = process.env.OUT_BUCKET || process.env.GCS_BUCKET_PARQUET || "set-up-nicely-agg";
const RAW_BUCKET = process.env.RAW_BUCKET || "set-up-nicely-flatfiles";

// Default allowlist locations (resolved at runtime if user doesn’t pass --allowedUri)
const DEFAULT_ALLOWED_RAW = `gs://${RAW_BUCKET}/allowed/allowedTickers.json`;
const DEFAULT_ALLOWED_OUT = `gs://${OUT_BUCKET}/allowed/allowedTickers.json`;

/** small helper */
function parseCsv<T extends string>(s: string): T[] {
  return s.split(",").map(x => x.trim()).filter(Boolean) as T[];
}

/** Resolve allowlist source in this order:
 *   1) --allowedUri (CLI) or ALLOWED_URI (env)
 *   2) gs://$RAW_BUCKET/allowed/allowedTickers.json
 *   3) gs://$OUT_BUCKET/allowed/allowedTickers.json
 * Hard-fails if symbol count is 0.
 */
async function resolveAllowlist(explicitUri?: string): Promise<{ uri: string; symbols: string[] }> {
  const candidates = [
    explicitUri?.trim(),
    (process.env.ALLOWED_URI || "").trim() || undefined,
    DEFAULT_ALLOWED_RAW,
    DEFAULT_ALLOWED_OUT,
  ].filter(Boolean) as string[];

  for (const uri of candidates) {
    try {
      const symbols = await listSymbolsFromAllowed(uri);
      if (symbols && symbols.length) {
        console.log(`🪪 allowlist: ${uri} (n=${symbols.length})`);
        return { uri, symbols: symbols.map(s => String(s).toUpperCase()) };
      }
    } catch (e: any) {
      if (process.env.VERBOSE === "true") {
        console.warn(`allowlist probe failed for ${uri}: ${e?.message || e}`);
      }
    }
  }
  throw new Error(
    `Could not resolve allowlist. Pass --allowedUri gs://... or set ALLOWED_URI, ` +
    `or place allowed/allowedTickers.json in RAW_BUCKET or OUT_BUCKET. Tried: ` +
    candidates.join(" , ")
  );
}
yargs(hideBin(process.argv))
  // ---------- compact-month ----------
  .command("compact-month", "merge daily → monthly", (y) => y
    .option("year",        { type: "number", demandOption: true })
    .option("month",       { type: "number", demandOption: true })
    .option("tfs",         { type: "string", default: DEFAULT_TFS.join(",") })
    .option("sessions",    { type: "string", default: DEFAULT_SESSIONS.join(",") })
    .option("allowedUri",  { type: "string", describe: "gs://...allowedTickers.json (overrides defaults)" })
    .option("symbolsFrom", { type: "string", describe: "(deprecated) alias of --allowedUri" })
    .option("only",        { type: "string" })
    .option("failOnMixed", { type: "boolean", default: false })
  , async (argv: any) => {
    const bucket = OUT_BUCKET;
    const tfs = parseCsv<TF>(argv.tfs);
    const sessions = parseCsv<Session>(argv.sessions);

    // Support both --allowedUri and legacy --symbolsFrom
    const allowArg = (argv.allowedUri as string) || (argv.symbolsFrom as string);
    const { symbols } = await resolveAllowlist(allowArg);

    let target = symbols;
    if (argv.only) {
      const want = new Set(parseCsv<string>(argv.only).map(s => s.toUpperCase()));
      target = symbols.filter(s => want.has(s));
      if (target.length === 0) {
        throw new Error("No symbols remain after applying --only filter.");
      }
    }

    if (!target.length) {
      throw new Error("Resolved allowlist has zero symbols; aborting.");
    }

    for (const symbol of target) {
      for (const session of sessions) {
        for (const tf of tfs) {
          try {
            await compactDailyToMonthly({
              bucket,
              tf,
              session,
              symbol,
              year: argv.year as number,
              month: argv.month as number,
              failOnMixed: !!argv.failOnMixed,
            });
          } catch (e: any) {
            console.error(`[monthly] fail ${symbol} ${tf} ${session}:`, e?.message ?? e);
          }
        }
      }
    }
  })
.command("compact-recent", "compact the last N months (default 2)", (y) => y
  .option("months",      { type: "number", default: 2 })      // previous full month + current
  .option("tfs",         { type: "string", default: DEFAULT_TFS.join(",") })
  .option("sessions",    { type: "string", default: DEFAULT_SESSIONS.join(",") })
  .option("allowedUri",  { type: "string" })
  .option("only",        { type: "string" })
  .option("failOnMixed", { type: "boolean", default: false })
  .option("concurrency", { type: "number",  default: 8 })
, async (argv: any) => {
  const monthsBack = Math.max(1, Number(argv.months) || 2);

  const today = new Date();
  const firstOfThis = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const start = new Date(firstOfThis); start.setUTCMonth(firstOfThis.getUTCMonth() - (monthsBack - 1), 1);
  const end   = new Date(firstOfThis); end.setUTCMonth(firstOfThis.getUTCMonth() + 1, 1); // next month (exclusive)

  const fmt = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-01`;

  await (yargs() as any).parseAsync([
    "compact-range",
    "--start", fmt(start),
    "--end",   fmt(end),
    "--tfs", argv.tfs,
    "--sessions", argv.sessions,
    ...(argv.allowedUri ? ["--allowedUri", argv.allowedUri] : []),
    ...(argv.only ? ["--only", argv.only] : []),
    ...(argv.failOnMixed ? ["--failOnMixed"] : []),
    "--concurrency", String(argv.concurrency)
  ]);
})
  // ---------- compact-range (concurrent) ----------
.command("compact-range", "compact all months in [start,end]", (y) => y
  .option("start",       { type: "string", demandOption: true }) // YYYY-MM-DD
  .option("end",         { type: "string", demandOption: true }) // YYYY-MM-DD (exclusive)
  .option("tfs",         { type: "string", default: DEFAULT_TFS.join(",") })
  .option("sessions",    { type: "string", default: DEFAULT_SESSIONS.join(",") })
  .option("allowedUri",  { type: "string", describe: "gs://...allowedTickers.json (overrides defaults)" })
  .option("symbolsFrom", { type: "string", describe: "(deprecated) alias of --allowedUri" })
  .option("only",        { type: "string" })
  .option("failOnMixed", { type: "boolean", default: false })
  .option("concurrency", { type: "number",  default: 8 }) // 🔥 new
  .option("dryRun",      { type: "boolean", default: false })
, async (argv: any) => {
  // Resolve allowlist once
  const allowArg = (argv.allowedUri as string) || (argv.symbolsFrom as string);
  const { symbols } = await resolveAllowlist(allowArg);

  // Filter if --only provided
  let target: string[] = symbols.map(s => s.toUpperCase());
  if (argv.only) {
    const want = new Set(
      String(argv.only).split(/[,\s]+/).map((s: string) => s.trim().toUpperCase()).filter(Boolean)
    );
    target = target.filter(s => want.has(s));
    if (!target.length) throw new Error("No symbols remain after applying --only filter.");
  }

  const tfs      = String(argv.tfs).split(",").map((s: string) => s.trim()).filter(Boolean) as TF[];
  const sessions = String(argv.sessions).split(",").map((s: string) => s.trim()).filter(Boolean) as Session[];

  // Build month list (end-exclusive)
  const months = (function monthsBetween(startISO: string, endISO: string): Array<{year:number; month:number}> {
    const s = new Date(startISO + "T00:00:00Z");
    const e = new Date(endISO   + "T00:00:00Z"); // exclusive
    const cur = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), 1));
    const end = new Date(Date.UTC(e.getUTCFullYear(), e.getUTCMonth(), 1));
    const out: Array<{year:number; month:number}> = [];
    while (cur < end) {
      out.push({ year: cur.getUTCFullYear(), month: cur.getUTCMonth() + 1 });
      cur.setUTCMonth(cur.getUTCMonth() + 1, 1);
      cur.setUTCHours(0,0,0,0);
    }
    return out;
  })(argv.start as string, argv.end as string);

  if (!months.length) {
    console.log(`🛑 No months to process for range ${argv.start} → ${argv.end} (end-exclusive).`);
    return;
  }

  console.log(`🗓️  months=${months.map(m => `${m.year}-${String(m.month).padStart(2,"0")}`).join(", ")}`);
  console.log(`🎯 symbols=${target.length}, tfs=${tfs.join(",")}, sessions=${sessions.join(",")}, ` +
              `failOnMixed=${!!argv.failOnMixed}, concurrency=${argv.concurrency}, dryRun=${!!argv.dryRun}`);

  if (argv.dryRun) {
    console.log("💡 Dry run only. No writes will be performed.");
    return;
  }

  const bucket = OUT_BUCKET;

  // Minimal promise pool (no deps)
  async function runPool<T>(items: T[], limit: number, worker: (item: T, idx: number) => Promise<void>) {
    let i = 0;
    const workers = Array.from({ length: Math.max(1, limit) }, async () => {
      while (true) {
        const idx = i++;
        if (idx >= items.length) break;
        await worker(items[idx], idx);
      }
    });
    await Promise.all(workers);
  }

  // Flatten work into tasks for the pool
  type Task = { year: number; month: number; symbol: string; session: Session; tf: TF };
  const tasks: Task[] = [];
  for (const { year, month } of months) {
    for (const symbol of target) {
      for (const session of sessions) {
        for (const tf of tfs) {
          tasks.push({ year, month, symbol, session, tf });
        }
      }
    }
  }

  const conc = Math.max(1, Number(argv.concurrency) || 8);

  await runPool(tasks, conc, async (t, idx) => {
    try {
      if (process.env.VERBOSE === "true") {
        console.log(`⏩ [${idx+1}/${tasks.length}] ${t.symbol} ${t.tf} ${t.session} ${t.year}-${String(t.month).padStart(2,"0")}`);
      }
      await compactDailyToMonthly({
        bucket,
        tf: t.tf,
        session: t.session,
        symbol: t.symbol,
        year: t.year,
        month: t.month,
        failOnMixed: !!argv.failOnMixed,
      });
    } catch (e: any) {
      console.error(`[monthly] fail ${t.symbol} ${t.tf} ${t.session} ${t.year}-${String(t.month).padStart(2,"0")}:`, e?.message ?? e);
    }
  });

  console.log("✅ compact-range complete.");
})

  // ---------- build-tails ----------
  .command("build-tails", "write lastN parquet per (tf,session,symbol)", (y) => y
    .option("tfs",          { type: "string", default: ["1m","5m","15m","30m","1h","4h"].join(",") })
    .option("sessions",     { type: "string", default: DEFAULT_SESSIONS.join(",") })
    .option("lastN",        { type: "number", default: 300 })
    .option("includeDaily", { type: "boolean", default: false })
    .option("allowedUri",   { type: "string", describe: "gs://...allowedTickers.json (overrides defaults)" })
    .option("symbolsFrom",  { type: "string", describe: "(deprecated) alias of --allowedUri" })
    .option("only",         { type: "string" })
  , async (argv: any) => {
    const bucket = OUT_BUCKET;

    const allowArg = (argv.allowedUri as string) || (argv.symbolsFrom as string);
    const { symbols } = await resolveAllowlist(allowArg);

    let target = symbols;
    if (argv.only) {
      const want = new Set(parseCsv<string>(argv.only).map(s => s.toUpperCase()));
      target = symbols.filter(s => want.has(s));
      if (target.length === 0) {
        throw new Error("No symbols remain after applying --only filter.");
      }
    }

    if (!target.length) {
      throw new Error("Resolved allowlist has zero symbols; aborting.");
    }

    const tfs = parseCsv<TF>(argv.tfs);
    const sessions = parseCsv<Session>(argv.sessions);

    await buildAllTailSnapshots({
      bucket,
      symbols: target,
      tfs,
      sessions,
      lastN: argv.lastN as number,
      includeDaily: !!argv.includeDaily,
    });
  })

  .demandCommand(1)
  .strict()
  .parse();
