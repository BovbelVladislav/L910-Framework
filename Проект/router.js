const Sinema = require("./controllers/Sinema");

function methodNotAllowed(res, method) {
  res.writeHead(405, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: `Метод ${method} не разрешён` }));
}

function router(req, res) {
  const { method, url } = req;

  // Корневой маршрут
  if (method === "GET" && url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("OK: сервер работает");
  }

  // Маршруты для Sinema (фильмы и аниме)
  if (url.startsWith("/sinema/films") || url.startsWith("/sinema/anime")) {
    switch (method) {
      case "GET": return Sinema.get(req, res);
      case "POST": return Sinema.post(req, res);
      case "PUT": return Sinema.put(req, res);
      case "PATCH": return Sinema.patch(req, res);
      case "DELETE": return Sinema.delete(req, res);
      default: return methodNotAllowed(res, method);
    }
  }

  // Если маршрут не найден
  res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Маршрут не найден" }));
}

module.exports = { router };
