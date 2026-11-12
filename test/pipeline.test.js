import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { generateCard } from "../src/pipeline.js";
import { groundCard } from "../src/ground.js";
import { parseProduct, InputError } from "../src/validate.js";
import { charCount } from "../src/text.js";

async function sample(name) {
  return readFile(new URL(`../examples/${name}.json`, import.meta.url), "utf8");
}

test("манометр собирается только из входных характеристик", async () => {
  const result = await generateCard(await sample("manometer"), { generator: "local" });
  assert.deepEqual(
    result.card.characteristics.map((item) => item.value),
    ["0–1,6 МПа", "1,5", "G1/2", "100 мм"]
  );
  assert.ok(charCount(result.card.seoTitle) <= 70);
  const length = charCount(result.card.seoDescription);
  assert.ok(length >= 800 && length <= 1200, `длина описания ${length}`);
  assert.ok(result.card.searchQueries.length >= 3 && result.card.searchQueries.length <= 5);
  assert.match(result.card.seoDescription, /0–1,6 МПа/);
  assert.match(result.card.seoDescription, /G1\/2/);
  assert.match(result.card.seoDescription, /Манотомь/);
  assert.match(result.card.seoDescription, /DM 02/);
  assert.match(result.card.seoTitle, /DM 02/);
  assert.doesNotMatch(result.markdown, /ГОСТ|IP65|нержав|4–20/);
  assert.equal(result.missingFields.length, 0);
  assert.deepEqual(result.warnings, []);
});

test("пустая характеристика термометра помечается как данных нет", async () => {
  const result = await generateCard(await sample("thermometer"), { generator: "local" });
  const protection = result.card.characteristics.find((item) => item.name === "степень защиты");
  assert.equal(protection.value, "данных нет");
  assert.ok(result.missingFields.includes("степень защиты"));
  assert.match(result.card.seoDescription, /данных нет/);
  assert.match(result.card.commercialBlock, /0–120 °C/);
  assert.match(result.card.seoDescription, /ТБ-063/);
  const length = charCount(result.card.seoDescription);
  assert.ok(length >= 800 && length <= 1200, `длина описания ${length}`);
  assert.deepEqual(result.warnings, []);
});

test("некорректный JSON и пустые поля не проходят молча", async () => {
  await assert.rejects(() => generateCard("{"), InputError);
  await assert.rejects(() => generateCard("null"), InputError);
  const result = await generateCard({}, { generator: "local" });
  assert.ok(result.missingFields.includes("name"));
  assert.ok(result.missingFields.includes("specs"));
  assert.equal(result.card.characteristics[0].value, "данных нет");
});

test("выдуманные моделью числа и характеристики отбрасываются", () => {
  const product = parseProduct({
    name: "Манометр показывающий DM 02",
    manufacturer: "Манотомь",
    description: "Прибор предназначен для измерения избыточного давления.",
    specs: {
      "диапазон измерений": "0–1,6 МПа",
      присоединение: "G1/2"
    }
  });
  const warnings = [];
  const card = groundCard(
    {
      seoTitle: "Манометр на 25 МПа",
      seoDescription:
        "Прибор держит 25 МПа и сделан из латуни. Прибор предназначен для измерения избыточного давления.",
      characteristics: [
        { name: "диапазон измерений", value: "0–25 МПа" },
        { name: "материал", value: "латунь" }
      ],
      searchQueries: ["Манометр 25 МПа", "Манотомь манометр"],
      commercialBlock: "Подходит для пара при 400 °C."
    },
    product,
    warnings,
    { fromModel: true }
  );

  assert.equal(card.characteristics[0].value, "0–1,6 МПа");
  assert.equal(
    card.characteristics.some((item) => item.name === "материал"),
    false
  );
  assert.equal(card.seoTitle.includes("25"), false);
  assert.equal(card.seoDescription.includes("25"), false);
  assert.match(card.seoDescription, /избыточного давления/);
  assert.equal(card.commercialBlock.includes("400"), false);
  assert.ok(warnings.some((warning) => warning.includes("материал")));
  assert.ok(warnings.some((warning) => warning.includes("диапазон")));
});
