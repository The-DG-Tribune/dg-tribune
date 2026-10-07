/** Characters with no Unicode decomposition (NFD won't strip these to a
 * base ASCII letter), so they're mapped explicitly before normalizing. */
const SPECIAL_CHAR_MAP: Record<string, string> = {
  Ø: "O",
  ø: "o",
  Æ: "AE",
  æ: "ae",
  Ð: "D",
  ð: "d",
  Þ: "Th",
  þ: "th",
  Ł: "L",
  ł: "l",
  İ: "I",
  ı: "i",
  ẞ: "SS",
  ß: "ss",
};

/** Converts a title into a URL-safe slug. e.g. "Messi Signs New Deal!" -> "messi-signs-new-deal"
 * Accented/special characters are transliterated to their closest ASCII
 * equivalent (e.g. "Mbappé" -> "mbappe", "Ødegaard" -> "odegaard") rather
 * than being silently dropped. */
export function slugify(input: string): string {
  const withMappedSpecials = input.replace(
    /[ØøÆæÐðÞþŁłİıẞß]/g,
    (ch) => SPECIAL_CHAR_MAP[ch] ?? ch
  );
  return withMappedSpecials
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
