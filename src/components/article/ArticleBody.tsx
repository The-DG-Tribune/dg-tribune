import { Fragment, type ReactNode } from "react";

/**
 * Turns the plain text of an article into a readable, designed page.
 * Supported (all optional): "# Heading", "## Subheading", "- bullet",
 * "1. numbered", "> pull quote", "---" divider, **bold**, *italic*,
 * [link](https://...), and "![caption](https://image)" for pictures.
 * Plain paragraphs separated by blank lines still work exactly as before.
 * A short line ending in ":" or written in CAPS is treated as a heading,
 * so older articles also get structure.
 */

function inline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${i++}`;
    if (token.startsWith("**")) {
      out.push(<strong key={key} className="font-semibold text-text">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const m = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(token);
      if (m) {
        out.push(
          <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer" className="text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent">
            {m[1]}
          </a>
        );
      }
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

type Block =
  | { type: "h2" | "h3" | "quote" | "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "img"; alt: string; src: string }
  | { type: "hr" };

function parse(body: string): Block[] {
  const lines = body.replace(/\r/g, "").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushPara = () => {
    if (para.length) {
      blocks.push({ type: "p", text: para.join(" ").trim() });
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push(list);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushPara();
      flushList();
      continue;
    }
    let m: RegExpExecArray | null;
    if ((m = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/.exec(line))) {
      flushPara(); flushList();
      blocks.push({ type: "img", alt: m[1], src: m[2] });
    } else if (/^(-{3,}|\*{3,})$/.test(line)) {
      flushPara(); flushList();
      blocks.push({ type: "hr" });
    } else if ((m = /^##\s+(.*)$/.exec(line)) && !line.startsWith("###")) {
      flushPara(); flushList();
      blocks.push({ type: "h2", text: m[1] });
    } else if ((m = /^#{3,}\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      blocks.push({ type: "h3", text: m[1] });
    } else if ((m = /^#\s+(.*)$/.exec(line))) {
      flushPara(); flushList();
      blocks.push({ type: "h2", text: m[1] });
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      flushPara(); flushList();
      blocks.push({ type: "quote", text: m[1] });
    } else if ((m = /^[-*\u2022]\s+(.*)$/.exec(line))) {
      flushPara();
      if (!list || list.type !== "ul") { flushList(); list = { type: "ul", items: [] }; }
      list.items.push(m[1]);
    } else if ((m = /^\d+[.)]\s+(.*)$/.exec(line))) {
      flushPara();
      if (!list || list.type !== "ol") { flushList(); list = { type: "ol", items: [] }; }
      list.items.push(m[1]);
    } else if (line.length <= 70 && /^[A-Z0-9][^.!?]*:$/.test(line)) {
      flushPara(); flushList();
      blocks.push({ type: "h3", text: line.slice(0, -1) });
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();
  return blocks;
}

export function ArticleBody({ body }: { body: string }) {
  const blocks = parse(body ?? "");
  let firstParagraphSeen = false;

  return (
    <div className="mx-auto max-w-[44rem] text-[1.0625rem] leading-[1.85] text-text-secondary sm:text-lg">
      {blocks.map((block, i) => {
        const key = `b${i}`;
        switch (block.type) {
          case "h2":
            return (
              <h2 key={key} className="mb-4 mt-12 flex items-center gap-3 font-heading text-2xl font-bold leading-tight text-text sm:text-3xl">
                <span className="h-7 w-1 shrink-0 rounded-full bg-gradient-to-b from-accent to-accent-secondary" aria-hidden="true" />
                {inline(block.text, key)}
              </h2>
            );
          case "h3":
            return (
              <h3 key={key} className="mb-3 mt-9 font-heading text-xl font-semibold text-text">
                {inline(block.text, key)}
              </h3>
            );
          case "quote":
            return (
              <blockquote key={key} className="my-9 rounded-r-2xl border-l-4 border-accent bg-white/[0.04] px-6 py-5 font-heading text-xl italic leading-snug text-text sm:text-2xl">
                {inline(block.text, key)}
              </blockquote>
            );
          case "ul":
            return (
              <ul key={key} className="my-6 space-y-2.5">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span>{inline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key} className="my-6 space-y-3">
                {block.items.map((item, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/15 font-heading text-sm font-bold text-accent">
                      {j + 1}
                    </span>
                    <span className="pt-0.5">{inline(item, `${key}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            );
          case "img":
            return (
              <figure key={key} className="my-9">
                <img src={block.src} alt={block.alt} loading="lazy" decoding="async" className="w-full rounded-2xl border border-white/10" />
                {block.alt && <figcaption className="mt-2 text-center text-small text-text-secondary">{block.alt}</figcaption>}
              </figure>
            );
          case "hr":
            return <hr key={key} className="my-10 border-white/10" />;
          default: {
            const isLead = !firstParagraphSeen;
            firstParagraphSeen = true;
            return (
              <Fragment key={key}>
                <p
                  className={
                    isLead
                      ? "mb-6 text-xl leading-relaxed text-text first-letter:float-left first-letter:mr-3 first-letter:font-heading first-letter:text-6xl first-letter:font-bold first-letter:leading-[0.9] first-letter:text-accent sm:text-[1.35rem]"
                      : "mb-6"
                  }
                >
                  {inline(block.text, key)}
                </p>
              </Fragment>
            );
          }
        }
      })}
    </div>
  );
}
