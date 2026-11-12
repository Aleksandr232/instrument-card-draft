import { charCount, scrubUnsupportedFacts, sourceBlob, trimToChars } from "./text.js";
import {
  buildQueries,
  characteristicsFrom,
  localCommercial,
  localDescription,
  localTitle
} from "./local.js";

function asString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sameText(left, right) {
  const norm = (value) =>
    String(value ?? "")
      .trim()
      .replace(/[–—−]/g, "-")
      .replace(/\s+/g, " ");
  return norm(left) === norm(right);
}

function extendDescription(modelText, product) {
  const localParagraphs = localDescription(product).split(/\n{2,}/);
  const kept = [modelText.trim()];
  for (const paragraph of localParagraphs) {
    const next = [...kept, paragraph].join("\n\n");
    if (charCount(next) > 1200) continue;
    kept.push(paragraph);
    if (charCount(kept.join("\n\n")) >= 800) break;
  }
  const text = kept.join("\n\n");
  return charCount(text) >= 800 ? text : localDescription(product);
}

export function groundCard(draft, product, warnings, { fromModel = false } = {}) {
  const source = sourceBlob(product);
  const input = draft && typeof draft === "object" ? draft : {};

  if (fromModel && Array.isArray(input.characteristics)) {
    const known = new Set(Object.keys(product.specs));
    for (const item of input.characteristics) {
      const name = asString(item?.name);
      const value = asString(item?.value);
      if (!name) continue;
      if (!known.has(name)) {
        warnings.push(`Модель добавила характеристику «${name}». В результат она не включена.`);
        continue;
      }
      const original = product.specs[name];
      if (original && !sameText(original, value)) {
        warnings.push(`Модель изменила «${name}»: в карточку поставлено исходное значение.`);
      }
    }
    for (const name of known) {
      const returned = input.characteristics.some((item) => asString(item?.name) === name);
      if (!returned) warnings.push(`Модель пропустила характеристику «${name}». Она добавлена из входа.`);
    }
  }

  let seoTitle = scrubUnsupportedFacts(asString(input.seoTitle), source, warnings, "SEO-заголовок");
  let seoDescription = scrubUnsupportedFacts(
    asString(input.seoDescription),
    source,
    warnings,
    "SEO-описание"
  );
  let commercialBlock = scrubUnsupportedFacts(
    asString(input.commercialBlock),
    source,
    warnings,
    "Коммерческий блок"
  );

  if (!seoTitle) {
    seoTitle = localTitle(product);
    if (fromModel) warnings.push("SEO-заголовок заменён на собранный из названия и производителя.");
  }
  if (charCount(seoTitle) > 70) {
    seoTitle = trimToChars(seoTitle, 70);
    warnings.push("SEO-заголовок сокращён до 70 символов.");
  }

  if (charCount(seoDescription) < 80) {
    seoDescription = localDescription(product);
    if (fromModel) {
      warnings.push("SEO-описание модели содержало данные не из входа и заменено черновиком по источнику.");
    }
  } else if (fromModel && charCount(seoDescription) < 800) {
    seoDescription = extendDescription(seoDescription, product);
    warnings.push("Модель написала короткое описание. Объём дополнен только фактами из входа.");
  } else if (charCount(seoDescription) > 1200) {
    seoDescription = trimToChars(seoDescription, 1200);
    warnings.push("SEO-описание сокращено до 1200 символов.");
  }

  if (!commercialBlock) {
    commercialBlock = localCommercial(product);
    if (fromModel) warnings.push("Коммерческий блок заменён на текст только по входным данным.");
  }

  let searchQueries = [];
  if (Array.isArray(input.searchQueries)) {
    for (const query of input.searchQueries) {
      const clean = scrubUnsupportedFacts(asString(query), source, warnings, "Поисковый запрос");
      if (clean && !searchQueries.includes(clean)) searchQueries.push(clean);
    }
  }
  if (searchQueries.length < 3 || searchQueries.length > 5) {
    const fallback = buildQueries(product);
    if (fallback.length >= 3 && (searchQueries.length < 3 || searchQueries.length > 5)) {
      if (fromModel && searchQueries.length < 3) {
        warnings.push("Поисковые запросы собраны из названия и входных характеристик.");
      }
      searchQueries = fallback;
    }
  }
  searchQueries = searchQueries.slice(0, 5);
  if (searchQueries.length < 3) {
    warnings.push("Из входных данных не получилось собрать 3 поисковых запроса.");
  }

  const descriptionLength = charCount(seoDescription);
  if (descriptionLength < 800 || descriptionLength > 1200) {
    warnings.push(`Объём SEO-описания: ${descriptionLength} символов. Ожидается 800–1200.`);
  }

  return {
    seoTitle,
    seoDescription,
    characteristics: characteristicsFrom(product),
    searchQueries,
    commercialBlock
  };
}
