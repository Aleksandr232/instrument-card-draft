function missingLines(product, card) {
  const lines = [];
  if (!product.name) lines.push("название — данных нет");
  if (!product.manufacturer) lines.push("производитель — данных нет");
  if (!product.description) lines.push("описание — данных нет");
  for (const item of card.characteristics) {
    if (item.value === "данных нет") lines.push(`${item.name} — данных нет`);
  }
  if (lines.length === 0) lines.push("Все переданные поля заполнены.");
  return lines;
}

export function toMarkdown(card, product, warnings = []) {
  const specs = card.characteristics
    .map((item) => `| ${item.name} | ${item.value} |`)
    .join("\n");
  const queries = card.searchQueries.map((query) => `- ${query}`).join("\n");
  const gaps = missingLines(product, card).map((line) => `- ${line}`).join("\n");
  const warningBlock = warnings.length
    ? `\n## Предупреждения\n\n${warnings.map((line) => `- ${line}`).join("\n")}\n`
    : "";

  return `# ${card.seoTitle}

${card.seoDescription}

## Характеристики

| Характеристика | Значение |
| --- | --- |
${specs}

## Поисковые запросы

${queries}

## Для менеджера

${card.commercialBlock}

## Что уточнить

${gaps}
${warningBlock}`.trim();
}

export function toPlainText(card, product, warnings = []) {
  const specs = card.characteristics.map((item) => `${item.name}: ${item.value}`).join("\n");
  const queries = card.searchQueries.map((query, index) => `${index + 1}. ${query}`).join("\n");
  const gaps = missingLines(product, card).join("\n");
  const warningBlock = warnings.length ? `\nПредупреждения:\n${warnings.join("\n")}\n` : "";
  return [
    card.seoTitle,
    "",
    card.seoDescription,
    "",
    "Характеристики:",
    specs,
    "",
    "Поисковые запросы:",
    queries,
    "",
    "Для менеджера:",
    card.commercialBlock,
    "",
    "Что уточнить:",
    gaps,
    warningBlock
  ]
    .join("\n")
    .trim();
}
