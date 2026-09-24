export type RawChunk = { content: string; page: number; section: string | null; index: number };

function clean(text: string) {
  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const CHUNK_SIZE = 1200;
const OVERLAP = 200;

/** Split page texts into overlapping chunks, preserving page metadata. */
export function chunkPages(pages: string[]): RawChunk[] {
  const chunks: RawChunk[] = [];
  let index = 0;

  pages.forEach((raw, p) => {
    const text = clean(raw);
    if (!text) return;
    const heading = text.split("\n").find((l) => l.trim().length > 3 && l.trim().length < 80) ?? null;

    let start = 0;
    while (start < text.length) {
      let end = Math.min(start + CHUNK_SIZE, text.length);
      if (end < text.length) {
        const breakAt = text.lastIndexOf(". ", end);
        if (breakAt > start + CHUNK_SIZE * 0.5) end = breakAt + 1;
      }
      const content = text.slice(start, end).trim();
      if (content.length > 40) {
        chunks.push({ content, page: p + 1, section: heading, index: index++ });
      }
      if (end >= text.length) break;
      start = end - OVERLAP;
    }
  });

  return chunks;
}
