// Builds public/sitemap.xml before every deploy so Google can find every
// article, player, team, league and quiz. It NEVER stops the build: if
// anything goes wrong it keeps the existing sitemap and moves on.
import { readFileSync, writeFileSync } from "node:fs";

const SITE = "https://dg-tribune.vercel.app";
const project = process.env.VITE_FIREBASE_PROJECT_ID;
const apiKey = process.env.VITE_FIREBASE_API_KEY;

const STATIC = [
  ["/", "daily", "1.0"],
  ["/football", "daily", "0.9"],
  ["/players", "weekly", "0.8"],
  ["/teams", "weekly", "0.8"],
  ["/leagues", "weekly", "0.7"],
  ["/tools", "weekly", "0.8"],
  ["/quizzes", "weekly", "0.8"],
  ["/wallpapers", "daily", "0.8"],
  ["/hot-takes", "daily", "0.7"],
  ["/search", "monthly", "0.3"],
  ["/contact", "yearly", "0.3"],
  ["/privacy", "yearly", "0.2"],
  ["/terms", "yearly", "0.2"],
  ["/disclaimer", "yearly", "0.2"],
];

const COLLECTIONS = [
  { name: "articles", path: "article", published: true, freq: "weekly", prio: "0.8" },
  { name: "players", path: "player", published: false, freq: "monthly", prio: "0.6" },
  { name: "teams", path: "team", published: false, freq: "monthly", prio: "0.6" },
  { name: "leagues", path: "league", published: false, freq: "monthly", prio: "0.6" },
  { name: "quizzes", path: "quiz", published: true, freq: "monthly", prio: "0.6" },
];

function field(name, value) {
  return { fieldFilter: { field: { fieldPath: name }, op: "EQUAL", value } };
}

async function fetchSlugs(col) {
  const filters = [field("isDeleted", { booleanValue: false })];
  if (col.published) filters.push(field("status", { stringValue: "published" }));
  const url = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: col.name }],
        where: { compositeFilter: { op: "AND", filters } },
        limit: 2000,
      },
    }),
  });
  if (!res.ok) throw new Error(`${col.name}: HTTP ${res.status}`);
  const rows = await res.json();
  const out = [];
  for (const row of rows) {
    const f = row.document?.fields;
    const slug = f?.slug?.stringValue;
    if (!slug) continue;
    const updated = Number(f?.updatedAt?.integerValue ?? f?.updatedAt?.doubleValue ?? 0);
    out.push({ slug, updated });
  }
  return out;
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function main() {
  if (!project || !apiKey) {
    console.log("[sitemap] Firebase env vars missing, keeping existing sitemap.xml");
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const urls = STATIC.map(([p, f, pr]) => ({ loc: SITE + p, freq: f, prio: pr, last: today }));
  let dynamic = 0;
  for (const col of COLLECTIONS) {
    try {
      const rows = await fetchSlugs(col);
      for (const r of rows) {
        urls.push({
          loc: `${SITE}/${col.path}/${encodeURIComponent(r.slug)}`,
          freq: col.freq,
          prio: col.prio,
          last: r.updated ? new Date(r.updated).toISOString().slice(0, 10) : today,
        });
        dynamic += 1;
      }
    } catch (err) {
      console.log(`[sitemap] skipped ${col.name}: ${err.message}`);
    }
  }
  if (dynamic === 0) {
    console.log("[sitemap] no dynamic pages found, keeping existing sitemap.xml");
    return;
  }
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.last}</lastmod><changefreq>${u.freq}</changefreq><priority>${u.prio}</priority></url>`
      )
      .join("\n") +
    `\n</urlset>\n`;
  writeFileSync(new URL("../public/sitemap.xml", import.meta.url), xml);
  console.log(`[sitemap] wrote ${urls.length} urls (${dynamic} dynamic)`);
}

main().catch((err) => console.log("[sitemap] failed, keeping existing file:", err.message));
void readFileSync;
