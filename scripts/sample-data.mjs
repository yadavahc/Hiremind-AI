// Streams the 100K candidate pool and writes a representative sample for the
// HireMind AI demo app. Picks an even spread across the file plus all
// detected honeypots and keyword-stuffer/plain-language edge cases, so the
// ranking engine has interesting material to reason about.
import fs from "node:fs";
import readline from "node:readline";
import path from "node:path";

const SRC = path.resolve(
  "[PUB] India_runs_data_and_ai_challenge/India_runs_data_and_ai_challenge/candidates.jsonl"
);
const OUT_DIR = path.resolve("data");
const OUT = path.join(OUT_DIR, "candidates.sample.json");
const TARGET = 800; // spread sample size
const TOTAL = 100000;
const STEP = Math.floor(TOTAL / TARGET);

const AI_CORE = [
  "embedding", "embeddings", "retrieval", "rag", "vector", "faiss", "pinecone",
  "weaviate", "qdrant", "milvus", "elasticsearch", "opensearch", "ranking",
  "learning to rank", "recommendation", "recommender", "ndcg", "sentence-transformers",
  "bge", "llm", "fine-tuning", "fine tuning", "lora", "qlora", "peft", "transformers",
  "nlp", "information retrieval", "semantic search", "bm25", "cross-encoder",
];

function txt(c) {
  const p = c.profile || {};
  const skills = (c.skills || []).map((s) => s.name).join(" ");
  const hist = (c.career_history || []).map((h) => `${h.title} ${h.description}`).join(" ");
  return `${p.headline} ${p.summary} ${skills} ${hist}`.toLowerCase();
}

function aiCoreCount(c) {
  const t = txt(c);
  return AI_CORE.filter((k) => t.includes(k)).length;
}

// Heuristic honeypot detection: subtly-impossible profiles.
function isHoneypot(c) {
  const skills = c.skills || [];
  // "expert proficiency in N skills with 0 months used"
  const zeroDurExpert = skills.filter(
    (s) => (s.proficiency === "expert" || s.proficiency === "advanced") &&
      (s.duration_months === 0)
  ).length;
  if (zeroDurExpert >= 3) return true;

  // tenure at a single role exceeding total career by a wide margin
  const totalRoleMonths = (c.career_history || []).reduce(
    (a, h) => a + (h.duration_months || 0), 0
  );
  const yoeMonths = (c.profile?.years_of_experience || 0) * 12;
  if (yoeMonths > 0 && totalRoleMonths > yoeMonths * 2.2) return true;

  // role starting before the candidate could plausibly have worked
  for (const h of c.career_history || []) {
    if (!h.start_date) continue;
    const start = new Date(h.start_date).getFullYear();
    const dur = h.duration_months || 0;
    // a role with huge duration but recent start (e.g. 120 months since 2023)
    if (start >= 2021 && dur >= 96) return true;
  }

  // skill duration longer than entire career
  for (const s of skills) {
    if ((s.duration_months || 0) > yoeMonths + 24 && yoeMonths > 0) return true;
  }
  return false;
}

const spread = [];
const honeypots = [];
const stuffers = []; // many AI keywords but non-engineering title
let i = 0;

const rl = readline.createInterface({
  input: fs.createReadStream(SRC, { encoding: "utf-8" }),
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  if (!line.trim()) return;
  let c;
  try { c = JSON.parse(line); } catch { return; }
  const idx = i++;

  const hp = isHoneypot(c);
  if (hp && honeypots.length < 40) {
    c.__honeypot = true;
    honeypots.push(c);
  }

  const title = (c.profile?.current_title || "").toLowerCase();
  const nonEng = !/(engineer|scientist|developer|ml|ai|data|architect|research)/.test(title);
  if (nonEng && aiCoreCount(c) >= 7 && stuffers.length < 60) {
    stuffers.push(c);
  }

  if (idx % STEP === 0 && spread.length < TARGET) {
    spread.push(c);
  }
});

rl.on("close", () => {
  // Merge, de-dup by candidate_id, keep honeypots + stuffers guaranteed.
  const byId = new Map();
  for (const c of [...spread, ...stuffers, ...honeypots]) {
    if (!byId.has(c.candidate_id)) byId.set(c.candidate_id, c);
  }
  const out = [...byId.values()];
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out));
  const hpCount = out.filter((c) => c.__honeypot).length;
  console.log(
    `Sampled ${out.length} candidates -> ${path.relative(process.cwd(), OUT)} ` +
    `(${hpCount} honeypots, ${stuffers.length} keyword-stuffers scanned ${i} rows)`
  );
});
