const UNIT = "МПа|кПа|мм|см|°C|°С|мА|бар|Па|%|кг";
const FRACTION = /\d+\/\d+/g;
const UNIT_PHRASE = new RegExp(
  String.raw`\d+(?:[.,]\d+)?\s?(?:${UNIT})(?![\p{L}\p{N}])`,
  "giu"
);
const BARE_NUMBER = /\d+(?:[.,]\d+)?/g;

export function charCount(value) {
  return [...String(value ?? "")].length;
}

export function trimToChars(value, max) {
  const chars = [...String(value ?? "")];
  if (chars.length <= max) return chars.join("");
  const sliced = chars.slice(0, max).join("");
  const boundary = sliced.replace(/\s+\S*$/, "").trim();
  return boundary || sliced.trim();
}

export function normalizePhrase(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/,/g, ".")
    .replace(/°с/g, "°c");
}

export function numericFacts(text) {
  const fractions = new Set();
  const units = new Set();
  const bare = new Set();
  let masked = String(text ?? "").replace(FRACTION, (match) => {
    fractions.add(match);
    return " ".repeat(match.length);
  });
  masked = masked.replace(UNIT_PHRASE, (match) => {
    units.add(normalizePhrase(match));
    return " ".repeat(match.length);
  });
  for (const match of masked.matchAll(BARE_NUMBER)) {
    bare.add(normalizePhrase(match[0]));
  }
  return { fractions, units, bare };
}

export function sourceBlob(product) {
  return [
    product.name,
    product.manufacturer,
    product.description,
    ...Object.entries(product.specs || {}).flatMap(([key, value]) => [key, value])
  ]
    .filter(Boolean)
    .join("\n");
}

function sentenceHasForeignFacts(sentence, allowed) {
  const facts = numericFacts(sentence);
  for (const fraction of facts.fractions) {
    if (!allowed.fractions.has(fraction)) return fraction;
  }
  for (const unit of facts.units) {
    if (!allowed.units.has(unit)) return unit;
  }
  for (const number of facts.bare) {
    if (!allowed.bare.has(number)) return number;
  }
  return "";
}

export function scrubUnsupportedFacts(text, sourceText, warnings, label) {
  const source = String(text ?? "").trim();
  if (!source) return "";
  const allowed = numericFacts(sourceText);
  const paragraphs = source.split(/\n{2,}/);
  const keptParagraphs = [];

  for (const paragraph of paragraphs) {
    const parts = paragraph
      .replace(/[ \t]*\n[ \t]*/g, " ")
      .replace(/[ \t]{2,}/g, " ")
      .trim()
      .split(/(?<=[.!?])\s+/)
      .filter(Boolean);
    const kept = [];
    for (const part of parts) {
      const foreign = sentenceHasForeignFacts(part, allowed);
      if (foreign) {
        warnings.push(`${label}: убрано предложение с данными не из входа (${foreign}).`);
        continue;
      }
      kept.push(part);
    }
    if (kept.length) keptParagraphs.push(kept.join(" "));
  }

  return keptParagraphs.join("\n\n");
}
