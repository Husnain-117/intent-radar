import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

export interface Keyword {
  query: string;
  score: number;
  template: string;
  place: string;
}

interface RawRow {
  keyword: string;
  score: string;
  template: string;
  place1: string;
}

// ─── Artifact detection ────────────────────────────────────────────────────────
// Rows 2-6 in the CSV are place-file header lines accidentally included.
// They contain markers like "=====" or start with "-" or include "{place}".
function isArtifact(row: RawRow): boolean {
  return (
    row.place1.startsWith('=') ||
    row.place1.startsWith('-') ||
    row.place1.includes('{') ||
    row.keyword.includes('=====') ||
    row.keyword.includes('{place}')
  );
}

// ─── In-memory cache (valid for the lifetime of the process) ─────────────────
let _cache: Keyword[] | null = null;

export function loadKeywords(): Keyword[] {
  if (_cache) return _cache;

  const csvPath = path.join(process.cwd(), 'keywords', 'generated_keywords.csv');
  const content = fs.readFileSync(csvPath, 'utf-8');

  const rows: RawRow[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  _cache = rows
    .filter((row) => {
      if (isArtifact(row)) return false;
      const score = parseFloat(row.score);
      return row.keyword.length > 0 && !isNaN(score) && score > 0;
    })
    .map((row) => ({
      query: row.keyword,
      score: parseFloat(row.score),
      template: row.template,
      place: row.place1,
    }));

  return _cache;
}

// ─── Weighted sampling without replacement ────────────────────────────────────
// Uses the Efraimidis-Spirakis algorithm: assign priority = -ln(rand) / weight,
// then take the N lowest priorities. This is O(n log n) and provably correct.
export function selectWeighted(pool: Keyword[], count: number): Keyword[] {
  const n = Math.min(count, pool.length);
  if (n <= 0) return [];

  const scored = pool.map((k) => ({
    keyword: k,
    priority: -Math.log(Math.random()) / k.score,
  }));

  scored.sort((a, b) => a.priority - b.priority);

  return scored.slice(0, n).map((s) => s.keyword);
}

// ─── Score-tier breakdown (for logging / dashboard stats) ────────────────────
export function scoreTiers(keywords: Keyword[]): Record<string, number> {
  return keywords.reduce<Record<string, number>>((acc, k) => {
    const tier = String(Math.round(k.score));
    acc[tier] = (acc[tier] ?? 0) + 1;
    return acc;
  }, {});
}

// ─── Main entry point for workers ─────────────────────────────────────────────
// Returns a weighted-random batch of keywords for one fetch run.
// `count` defaults to BATCH_SIZE_KEYWORDS; capped at MAX_KEYWORDS_PER_RUN.
export function getKeywordBatch(count?: number): Keyword[] {
  const BATCH = parseInt(process.env.BATCH_SIZE_KEYWORDS ?? '50', 10);
  const MAX   = parseInt(process.env.MAX_KEYWORDS_PER_RUN ?? '500', 10);
  const size  = Math.min(count ?? BATCH, MAX);

  const all = loadKeywords();
  return selectWeighted(all, size);
}

// ─── Cache control (for tests) ────────────────────────────────────────────────
export function clearKeywordCache(): void {
  _cache = null;
}
