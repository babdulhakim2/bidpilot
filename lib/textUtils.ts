/**
 * Normalize text that may be in ALL CAPS to Title Case
 * Preserves already mixed-case text
 */
export function normalizeText(text: string): string {
  if (!text) return text;
  
  // Check if text is mostly uppercase (>70% caps)
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const isAllCaps = letters.length > 0 && (upperCount / letters.length) > 0.7;
  
  if (!isAllCaps) return text;
  
  // Convert to title case
  return text
    .toLowerCase()
    .replace(/(?:^|\s|[-/])\w/g, (match) => match.toUpperCase())
    // Keep common acronyms uppercase
    .replace(/\b(Ngn|Usd|Lga|Fct|Ppp|Ltd|Plc|Ngo|Mdas|Bpp|Pdf|Id)\b/gi, (m) => m.toUpperCase());
}

/**
 * Normalize text to sentence case (first letter cap, rest lower)
 * Good for descriptions
 */
export function toSentenceCase(text: string): string {
  if (!text) return text;
  
  const letters = text.replace(/[^a-zA-Z]/g, '');
  const upperCount = (text.match(/[A-Z]/g) || []).length;
  const isAllCaps = letters.length > 0 && (upperCount / letters.length) > 0.7;
  
  if (!isAllCaps) return text;
  
  return text
    .toLowerCase()
    .replace(/(^\w|[.!?]\s+\w)/g, (match) => match.toUpperCase());
}
