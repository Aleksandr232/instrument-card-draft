import { charCount } from "./text.js";

export function visiblePurpose(description) {
  if (!description) return "";
  const cut = description.split("...")[0].split("…")[0].trim();
  if (!cut) return "";
  return /[.!?]$/.test(cut) ? cut : `${cut}.`;
}

export function knownSpecs(product) {
  return Object.entries(product.specs).filter(([, value]) => value);
}

export function missingSpecNames(product) {
  return Object.entries(product.specs)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function characteristicsFrom(product) {
  const entries = Object.entries(product.specs);
  if (entries.length === 0) return [{ name: "характеристики", value: "данных нет" }];
  return entries.map(([name, value]) => ({ name, value: value || "данных нет" }));
}

export function localTitle(product) {
  const name = product.name || "Контрольно-измерительный прибор";
  const withMaker = product.manufacturer ? `${name} — ${product.manufacturer}` : name;
  return charCount(withMaker) <= 70 ? withMaker : name;
}

export function buildQueries(product) {
  const known = knownSpecs(product);
  const head = product.name ? product.name.split(/\s+/)[0] : "";
  const queries = [
    product.name,
    [product.manufacturer, product.name].filter(Boolean).join(" "),
    known[0] && product.name ? `${product.name} ${known[0][1]}` : "",
    known[1] && product.name ? `${product.name} ${known[1][0]} ${known[1][1]}` : "",
    product.manufacturer && head ? `${product.manufacturer} ${head}` : ""
  ];
  const unique = [];
  for (const query of queries) {
    const clean = String(query).replace(/\s+/g, " ").trim();
    if (clean && !unique.includes(clean)) unique.push(clean);
  }
  return unique.slice(0, 5);
}

const EDITORIAL = [
  "Черновик подготовлен для контент-менеджера: его переносят в карточку каталога после сверки с паспортом.",
  "В тексте оставлены только название, производитель, исходное описание и переданные характеристики.",
  "Новые пределы, материалы, стандарты, интерфейсы и условия эксплуатации сюда не добавляются.",
  "Формулировки можно вычитать под тон магазина, не меняя числа, единицы и имена полей.",
  "Покупатель по странице должен понять, что это за прибор и какие параметры уже подтверждены источником.",
  "Пустые поля не заполняются догадкой. Пока значения нет, в карточке стоит пометка «данных нет».",
  "Этот абзац фиксирует границу черновика: всё, чего не было во входных данных, остаётся за его пределами.",
  "Перед публикацией менеджер ещё раз сверяет каждую строку характеристик с полученными данными."
];

export function localDescription(product) {
  const title = product.name || "Прибор";
  const purpose = visiblePurpose(product.description);
  const known = knownSpecs(product);
  const missing = missingSpecNames(product);
  const specLine = known.map(([key, value]) => `${key} — ${value}`).join("; ");
  const specSentences = known
    .map(([key, value]) => `${key.charAt(0).toUpperCase()}${key.slice(1)} — ${value}.`)
    .join(" ");

  const opening = product.manufacturer
    ? `${title} производителя ${product.manufacturer} — позиция каталога контрольно-измерительных приборов.`
    : `${title} — позиция каталога контрольно-измерительных приборов. Производитель не указан: данных нет.`;
  const purposeText = purpose
    ? `Назначение, как оно дано во входном описании: ${purpose}`
    : "Назначение прибора во входных данных отсутствует: данных нет.";
  const specText = specLine
    ? `Характеристики этой позиции: ${specLine}.`
    : "Технические характеристики во входных данных не заполнены: данных нет.";
  const keys = known.map(([key]) => key).join(", ");
  const compare = known.length
    ? `${title} в каталоге сравнивают по полям: ${keys}. Других технических свойств у этой карточки нет.`
    : "Сравнивать прибор по техническим параметрам пока нельзя: подтверждённых характеристик нет.";
  const fit = purpose
    ? `${title} подходит для задачи из описания и только в пределах уже известных параметров.${product.manufacturer ? ` Производитель — ${product.manufacturer}.` : ""}`
    : `Кому подходит ${title}, из текущих данных не следует: данных нет.`;
  const gaps = missing.length
    ? `Для полей «${missing.join("», «")}» значения нет: данных нет.`
    : Object.keys(product.specs).length
      ? "Все переданные характеристики заполнены. Свойства, которых не было во входе, здесь не появляются."
      : "Список характеристик не передан: данных нет.";
  const answers = `На странице товара достаточно трёх ответов: что это за прибор, кто его производит и какие параметры уже известны. Здесь это ${title}; производитель — ${product.manufacturer || "данных нет"}; параметры — ${specLine || "данных нет"}.`;
  const repeat = known.length
    ? `Кратко для витрины: ${title}. ${known.map(([key, value]) => `${key} ${value}`).join(", ")}.${product.manufacturer ? ` Производитель ${product.manufacturer}.` : ""}`
    : "";

  const core = [opening, purposeText, specText, specSentences, compare, fit, gaps, answers, repeat].filter(Boolean);

  const paragraphs = [...core];
  for (const paragraph of EDITORIAL) {
    const next = [...paragraphs, paragraph].join("\n\n");
    if (charCount(next) > 1200) continue;
    paragraphs.push(paragraph);
    if (charCount(paragraphs.join("\n\n")) >= 800) break;
  }

  while (paragraphs.length > 4 && charCount(paragraphs.join("\n\n")) > 1200) {
    paragraphs.pop();
  }
  return paragraphs.join("\n\n");
}

export function localCommercial(product) {
  const title = product.name || "Прибор";
  const maker = product.manufacturer || "данных нет";
  const purpose = visiblePurpose(product.description);
  const known = knownSpecs(product);
  const specLine = known.length
    ? known.map(([key, value]) => `${key}: ${value}`).join(", ")
    : "данных нет";
  const task = purpose
    ? `Задача из описания: ${purpose}`
    : "Задача прибора во входных данных не названа: данных нет.";
  const audience = purpose
    ? "Подходит заказчику, которому нужна эта задача и который сверяет прибор по уже указанным характеристикам."
    : "Кому подходит прибор, сказать нельзя: данных нет.";
  return `${title}. Производитель: ${maker}. ${task} ${audience} Характеристики для разговора с заказчиком: ${specLine}.`;
}

export function localCard(product) {
  return {
    seoTitle: localTitle(product),
    seoDescription: localDescription(product),
    characteristics: characteristicsFrom(product),
    searchQueries: buildQueries(product),
    commercialBlock: localCommercial(product)
  };
}
