const fs = require("fs");
const path = require("path");
const { readJsonBody } = require("../utils/body");
const { appEvents } = require("../utils/events");

// ----- helpers: io -----
function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function getFilePath(type) {
  const allowed = ["films", "anime"];
  if (!allowed.includes(type)) return null;
  return path.join(__dirname, "..", "data", "Sinema", `${type[0].toUpperCase() + type.slice(1)}.json`);
}

function ensureFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, "[]", "utf8");
}

function readData(filePath) {
  ensureFile(filePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Файл данных должен содержать массив []");
  return data;
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function parseUrl(url) {
  const parts = url.split("/").filter(Boolean);
  return {
    type: parts[1]?.toLowerCase(),
    id: parts[2] ? Number(parts[2]) : null
  };
}

function randomDate(yearMin = 1980, yearMax = 2026) {
  const y = Math.floor(Math.random() * (yearMax - yearMin + 1)) + yearMin;
  const m = String(Math.floor(Math.random() * 12) + 1).padStart(2, "0");
  const d = String(Math.floor(Math.random() * 28) + 1).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ----- Film -----
function buildFilmDefaults() {
  const titles = ["Интерстеллар", "Начало", "Матрица", "Титаник", "Побег из Шоушенка"];
  const genres = ["Драма", "Комедия", "Фантастика", "Боевик", "Триллер"];
  const actors = ["Леонардо Ди Каприо", "Киану Ривз", "Мэттью МакКонахи", "Скарлетт Йоханссон", "Том Хэнкс"];
  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    genre: genres[Math.floor(Math.random() * genres.length)],
    duration: Math.floor(Math.random() * 61) + 90,
    is3D: Math.random() < 0.3,
    releaseDate: randomDate(1980, 2026),
    actors: [
      actors[Math.floor(Math.random() * actors.length)],
      actors[Math.floor(Math.random() * actors.length)]
    ]
  };
}

function normalizeFilm(body = {}, existing = {}) {
  const base = buildFilmDefaults();
  const src = { ...existing, ...body };

  return {
    title: typeof src.title === "string" && src.title.trim() ? src.title : base.title,
    genre: typeof src.genre === "string" && src.genre.trim() ? src.genre : base.genre,
    duration: Number.isFinite(Number(src.duration)) ? Number(src.duration) : base.duration,
    is3D: typeof src.is3D === "boolean" ? src.is3D : base.is3D,
    releaseDate: typeof src.releaseDate === "string" && src.releaseDate.trim() ? src.releaseDate : base.releaseDate,
    actors: Array.isArray(src.actors) && src.actors.length > 0 ? src.actors.map(String) : base.actors
  };
}

// ----- Anime -----
function buildAnimeDefaults() {
  const titles = ["Naruto", "One Piece", "Attack on Titan", "Death Note", "My Hero Academia"];
  const genres = ["Сёнэн", "Сёдзё", "Фэнтези", "Приключения", "Меха", "Триллер"];
  const studios = ["Studio Ghibli", "Bones", "MAPPA", "Toei Animation", "Sunrise", "Madhouse"];
  return {
    title: titles[Math.floor(Math.random() * titles.length)],
    genre: genres[Math.floor(Math.random() * genres.length)],
    episodes: Math.floor(Math.random() * 51) + 12,
    studio: studios[Math.floor(Math.random() * studios.length)],
    releaseDate: randomDate(1990, 2026),
    format: Math.random() < 0.7 ? "TV" : "OVA"
  };
}

function normalizeAnime(body = {}, existing = {}) {
  const base = buildAnimeDefaults();
  const src = { ...existing, ...body };

  return {
    title: typeof src.title === "string" && src.title.trim() ? src.title : base.title,
    genre: typeof src.genre === "string" && src.genre.trim() ? src.genre : base.genre,
    episodes: Number.isFinite(Number(src.episodes)) ? Number(src.episodes) : base.episodes,
    studio: typeof src.studio === "string" && src.studio.trim() ? src.studio : base.studio,
    releaseDate: typeof src.releaseDate === "string" && src.releaseDate.trim() ? src.releaseDate : base.releaseDate,
    format: typeof src.format === "string" && src.format.trim() ? src.format : base.format
  };
}

function nextId(arr) {
  if (!arr.length) return 1;
  return Math.max(...arr.map(i => Number(i.id) || 0)) + 1;
}

// ----- controller core -----
async function handle(req, res, method) {
  const { type, id } = parseUrl(req.url);
  const filePath = getFilePath(type);
  if (!filePath) return sendJson(res, 404, { error: "Тип данных не найден" });

  try {
    const data = readData(filePath);

    switch (method) {
      case "GET": {
        if (id) {
          const item = data.find(i => i.id === id);
          return item ? sendJson(res, 200, item) : sendJson(res, 404, { error: "Элемент не найден" });
        }
        return sendJson(res, 200, data);
      }

      case "POST": {
        const body = await readJsonBody(req);
        const cleanBody = { ...body };
        delete cleanBody.id;

        const newId = nextId(data);

        let item;
        if (Object.keys(cleanBody).length === 0) {
          // тело пустое — генерируем дефолт напрямую
          item = type === "films"
            ? { id: newId, ...buildFilmDefaults() }
            : { id: newId, ...buildAnimeDefaults() };
        } else {
          // тело есть — нормализуем
          item = type === "films"
            ? { id: newId, ...normalizeFilm(cleanBody, {}) }
            : { id: newId, ...normalizeAnime(cleanBody, {}) };
        }

        // Проверка на дубликат по title + releaseDate
        const exists = data.some(entry =>
          entry.title === item.title && entry.releaseDate === item.releaseDate
        );
        if (exists) {
          return sendJson(res, 409, { error: "Такой объект уже существует" });
        }

        data.push(item);
        writeData(filePath, data);
        appEvents.emit("log", { type: "CREATE", id: newId, category: type });
        return sendJson(res, 201, item);
      }

      case "PUT": {
        if (!id) return sendJson(res, 400, { error: "id обязателен в URL" });
        const idx = data.findIndex(i => i.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "Элемент не найден" });

        const body = await readJsonBody(req);
        const updated =
          type === "films"
            ? { id, ...normalizeFilm(body, {}) }
            : { id, ...normalizeAnime(body, {}) };

        data[idx] = updated;
        writeData(filePath, data);
        appEvents.emit("log", { type: "UPDATE", id, category: type });
        return sendJson(res, 200, updated);
      }
      case "PATCH": {
        if (!id) return sendJson(res, 400, { error: "id обязателен в URL" });
        const idx = data.findIndex(i => i.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "Элемент не найден" });

        const body = await readJsonBody(req);
        const existing = data[idx];

        // Частичное обновление: накладываем изменения и нормализуем к полной схеме
        const patched =
          type === "films"
            ? { id, ...normalizeFilm(body, existing) }
            : { id, ...normalizeAnime(body, existing) };

        // Проверка на дубликат по title + releaseDate
        const exists = data.some(entry =>
          entry.id !== id &&
          entry.title === patched.title &&
          entry.releaseDate === patched.releaseDate
        );
        if (exists) {
          return sendJson(res, 409, { error: "Такой объект уже существует" });
        }

        data[idx] = patched;
        writeData(filePath, data);
        appEvents.emit("log", { type: "PATCH", id, category: type });
        return sendJson(res, 200, patched);
      }

      case "DELETE": {
        if (!id) return sendJson(res, 400, { error: "id обязателен в URL" });
        const idx = data.findIndex(i => i.id === id);
        if (idx === -1) return sendJson(res, 404, { error: "Элемент не найден" });

        const [removed] = data.splice(idx, 1);
        writeData(filePath, data);
        appEvents.emit("log", { type: "DELETE", id: removed.id, category: type });
        return sendJson(res, 200, { deleted: removed.id });
      }

      default:
        return sendJson(res, 405, { error: `Метод ${method} не разрешён` });
    }
  } catch (err) {
    return sendJson(res, 500, { error: "Ошибка обработки", details: err.message });
  }
}

module.exports = {
  get: (req, res) => handle(req, res, "GET"),
  post: (req, res) => handle(req, res, "POST"),
  put: (req, res) => handle(req, res, "PUT"),
  patch: (req, res) => handle(req, res, "PATCH"),
  delete: (req, res) => handle(req, res, "DELETE")
};
