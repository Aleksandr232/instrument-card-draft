export class InputError extends Error {
  constructor(message) {
    super(message);
    this.name = "InputError";
    this.status = 400;
  }
}

function asText(value) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value).trim();
  return "";
}

export function parseProduct(raw) {
  if (raw == null || raw === "") {
    throw new InputError("Пустой запрос: нужен JSON с данными товара.");
  }

  let data = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) throw new InputError("Пустой запрос: нужен JSON с данными товара.");
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new InputError("Некорректный JSON. Проверьте кавычки, запятые и скобки.");
    }
  }

  if (typeof data !== "object" || data == null || Array.isArray(data)) {
    throw new InputError("Ожидается JSON-объект товара, а не массив или строка.");
  }

  if (data.specs != null && (typeof data.specs !== "object" || Array.isArray(data.specs))) {
    throw new InputError("Поле specs должно быть объектом «характеристика: значение».");
  }

  const name = asText(data.name);
  const manufacturer = asText(data.manufacturer);
  const description = asText(data.description);
  const specs = {};
  const missingFields = [];

  if (!name) missingFields.push("name");
  if (!manufacturer) missingFields.push("manufacturer");
  if (!description) missingFields.push("description");

  const sourceSpecs = data.specs ?? {};
  const keys = Object.keys(sourceSpecs);
  if (keys.length === 0) missingFields.push("specs");

  for (const key of keys) {
    const label = asText(key);
    if (!label) continue;
    const value = asText(sourceSpecs[key]);
    specs[label] = value;
    if (!value) missingFields.push(label);
  }

  return { name, manufacturer, description, specs, missingFields };
}
