const specs = document.querySelector("#specs");
const output = document.querySelector("#output");
const meta = document.querySelector("#meta");
const notice = document.querySelector("#notice");
const formError = document.querySelector("#form-error");
const copyButton = document.querySelector("#copy");
const generateButton = document.querySelector("#generate");
const mode = document.querySelector("#mode");

const views = { markdown: "", text: "", json: "" };
let currentView = "markdown";
let specRows = [];

function field(id) {
  return document.querySelector(id);
}

function showError(message) {
  formError.hidden = !message;
  formError.textContent = message || "";
}

function addSpec(name = "", value = "") {
  specRows.push({ name, value });
  renderSpecs();
}

function renderSpecs() {
  specs.replaceChildren();
  if (specRows.length === 0) {
    const empty = document.createElement("p");
    empty.className = "hint";
    empty.textContent = "Характеристик пока нет. Добавьте поле или загрузите пример.";
    specs.append(empty);
    return;
  }

  specRows.forEach((row, index) => {
    const wrap = document.createElement("div");
    wrap.className = "spec-row";

    const name = document.createElement("input");
    name.value = row.name;
    name.placeholder = "Характеристика";
    name.setAttribute("aria-label", "Название характеристики");
    name.addEventListener("input", () => {
      specRows[index].name = name.value;
    });

    const value = document.createElement("input");
    value.value = row.value;
    value.placeholder = "Значение";
    value.setAttribute("aria-label", "Значение характеристики");
    value.addEventListener("input", () => {
      specRows[index].value = value.value;
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "ghost";
    remove.textContent = "Убрать";
    remove.addEventListener("click", () => {
      specRows.splice(index, 1);
      renderSpecs();
    });

    wrap.append(name, value, remove);
    specs.append(wrap);
  });
}

function fillProduct(product) {
  field("#name").value = product.name || "";
  field("#manufacturer").value = product.manufacturer || "";
  field("#description").value = product.description || "";
  field("#raw-json").value = JSON.stringify(product, null, 2);
  specRows = Object.entries(product.specs || {}).map(([name, value]) => ({
    name,
    value: value == null ? "" : String(value)
  }));
  renderSpecs();
  showError("");
}

function productFromForm() {
  const specsObject = {};
  for (const row of specRows) {
    const name = row.name.trim();
    if (!name) continue;
    specsObject[name] = row.value.trim();
  }
  return {
    name: field("#name").value.trim(),
    manufacturer: field("#manufacturer").value.trim(),
    description: field("#description").value.trim(),
    specs: specsObject
  };
}

function list(title, items) {
  if (!items?.length) return null;
  const wrap = document.createElement("div");
  const heading = document.createElement("p");
  heading.textContent = title;
  wrap.append(heading);
  for (const item of items) {
    const line = document.createElement("p");
    line.textContent = item;
    wrap.append(line);
  }
  return wrap;
}

function showResult(result) {
  views.markdown = result.markdown;
  views.text = result.text;
  views.json = JSON.stringify(result.card, null, 2);
  output.textContent = views[currentView];
  copyButton.disabled = false;

  meta.hidden = false;
  meta.replaceChildren();
  const source = document.createElement("p");
  const length = [...result.card.seoDescription].length;
  const titleLength = [...result.card.seoTitle].length;
  source.textContent = `Источник: ${result.generator === "llm" ? `модель ${result.model}` : "локальный черновик по входным данным"}. Заголовок: ${titleLength} символов. Описание: ${length} символов.`;
  meta.append(source);
  const gaps = list(
    "Нужно уточнить:",
    result.missingFields.map((item) => `${item}: данных нет`)
  );
  if (gaps) meta.append(gaps);

  const notes = [result.notice, ...(result.warnings || [])].filter(Boolean);
  notice.hidden = notes.length === 0;
  notice.replaceChildren();
  for (const warning of notes) {
    const line = document.createElement("p");
    line.textContent = warning;
    notice.append(line);
  }
}

async function loadExample(id) {
  showError("");
  const response = await fetch(`/api/examples/${id}`);
  const payload = await response.json();
  if (!response.ok) {
    showError(payload.error || "Не удалось загрузить пример.");
    return;
  }
  fillProduct(payload);
}

document.querySelector("#load-manometer").addEventListener("click", () => loadExample("manometer"));
document.querySelector("#load-thermometer").addEventListener("click", () => loadExample("thermometer"));
document.querySelector("#add-spec").addEventListener("click", () => addSpec());

document.querySelector("#apply-json").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(field("#raw-json").value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      showError("Ожидается JSON-объект товара.");
      return;
    }
    fillProduct(parsed);
  } catch {
    showError("Некорректный JSON. Проверьте кавычки, запятые и скобки.");
  }
});

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentView = tab.dataset.view;
    document.querySelectorAll(".tab").forEach((item) => item.classList.toggle("active", item === tab));
    output.textContent = views[currentView] || "Сначала соберите черновик.";
  });
});

copyButton.addEventListener("click", async () => {
  const value = views[currentView];
  if (!value) return;
  await navigator.clipboard.writeText(value);
  copyButton.textContent = "Скопировано";
  setTimeout(() => {
    copyButton.textContent = "Копировать";
  }, 1200);
});

document.querySelector("#product-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  showError("");
  generateButton.disabled = true;
  const previous = generateButton.textContent;
  generateButton.textContent = "Собираем…";
  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: productFromForm() })
    });
    const payload = await response.json();
    if (!response.ok) {
      showError(payload.error || "Не удалось собрать черновик.");
      return;
    }
    showResult(payload);
  } catch {
    showError("Сервер не ответил. Проверьте, что он запущен.");
  } finally {
    generateButton.disabled = false;
    generateButton.textContent = previous;
  }
});

fetch("/api/health")
  .then((response) => response.json())
  .then((health) => {
    mode.textContent = health.llm
      ? `Подключена модель ${health.model}. Характеристики всё равно сверяются с входом.`
      : "Ключ API не задан. Черновик собирается локально по входным данным, без выдуманных характеристик.";
  })
  .catch(() => {
    mode.textContent = "Не удалось проверить режим модели.";
  });

renderSpecs();
