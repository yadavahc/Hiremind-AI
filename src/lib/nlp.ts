// ============================================================================
// Lightweight, dependency-free NLP layer.
// ----------------------------------------------------------------------------
// The production Python ranker (scripts/rank.py) uses BAAI/bge-large-en-v1.5 +
// FAISS + a cross-encoder. In the browser/Node app we run a fast, deterministic
// proxy of the same hybrid pipeline so the platform works offline with zero
// model downloads: BM25 (lexical) + TF-IDF cosine (dense-retrieval proxy),
// fused into a hybrid retrieval score. This keeps the demo instant while the
// scoring *shape* matches the real system.
// ============================================================================

import { normalize } from "./ontology";

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "at",
  "by", "is", "are", "was", "were", "be", "been", "as", "i", "we", "our", "you",
  "your", "it", "that", "this", "these", "those", "from", "but", "not", "have",
  "has", "had", "they", "their", "them", "he", "she", "his", "her", "my", "me",
  "so", "if", "then", "than", "into", "out", "up", "down", "about", "over",
]);

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
}

export interface BM25Index {
  docs: string[][];
  df: Map<string, number>;
  avgdl: number;
  N: number;
}

export function buildBM25(corpus: string[]): BM25Index {
  const docs = corpus.map(tokenize);
  const df = new Map<string, number>();
  let totalLen = 0;
  for (const doc of docs) {
    totalLen += doc.length;
    for (const term of new Set(doc)) df.set(term, (df.get(term) ?? 0) + 1);
  }
  return { docs, df, avgdl: totalLen / Math.max(1, docs.length), N: docs.length };
}

const K1 = 1.5;
const B = 0.75;

/** BM25 score of a query against document `i` in the index. */
export function bm25Score(index: BM25Index, queryTerms: string[], i: number): number {
  const doc = index.docs[i];
  if (!doc || doc.length === 0) return 0;
  const tf = new Map<string, number>();
  for (const t of doc) tf.set(t, (tf.get(t) ?? 0) + 1);
  const dl = doc.length;
  let score = 0;
  for (const q of queryTerms) {
    const f = tf.get(q);
    if (!f) continue;
    const n = index.df.get(q) ?? 0;
    const idf = Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
    score += idf * ((f * (K1 + 1)) / (f + K1 * (1 - B + B * (dl / index.avgdl))));
  }
  return score;
}

// ---------------------------------------------------------------------------
// TF-IDF cosine — a dense-retrieval proxy
// ---------------------------------------------------------------------------

export type SparseVec = Map<string, number>;

export function tfidfVector(tokens: string[], index: BM25Index): SparseVec {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  const vec: SparseVec = new Map();
  let norm = 0;
  for (const [term, f] of tf) {
    const n = index.df.get(term) ?? 0;
    const idf = Math.log((index.N + 1) / (n + 1)) + 1;
    const w = (f / tokens.length) * idf;
    vec.set(term, w);
    norm += w * w;
  }
  norm = Math.sqrt(norm) || 1;
  for (const [k, v] of vec) vec.set(k, v / norm);
  return vec;
}

export function cosine(a: SparseVec, b: SparseVec): number {
  // iterate the smaller map
  const [small, big] = a.size < b.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [k, v] of small) {
    const w = big.get(k);
    if (w) dot += v * w;
  }
  return dot; // both pre-normalized
}

/** Min-max normalize an array to 0..1 (robust to all-equal). */
export function minMaxNorm(values: number[]): number[] {
  let min = Infinity, max = -Infinity;
  for (const v of values) { if (v < min) min = v; if (v > max) max = v; }
  const range = max - min;
  if (range < 1e-9) return values.map(() => (max > 0 ? 1 : 0));
  return values.map((v) => (v - min) / range);
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
