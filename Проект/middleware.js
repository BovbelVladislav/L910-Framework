const { readJsonBody } = require("./utils/body");

const middlewares = [];
function use(fn) {
  middlewares.push(fn);
}
function applyMiddleware(req, res, finalHandler) {
  let i = 0;
  function next(err) {
    if (err) {
      res.status(500).json({ error: err.message || "Internal Server Error" });
      return;
    }
    const fn = middlewares[i++];
    
    if (fn) {
      fn(req, res, next);
    } else {
      finalHandler();
    }
  }

  next();
}

async function enhance(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host}`);

  req.query = Object.fromEntries(urlObj.searchParams.entries());

  req.params = {};
  const parts = urlObj.pathname.split("/").filter(Boolean);
  if (parts.length >= 2) {
    req.params.id = parts[1];
  }

  // Чтение JSON тела запроса
  try {
    req.body = await readJsonBody(req);
  } catch {
    req.body = null;
  }

  // Методы ответа
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };

  res.send = function (data) {
    const isJson = typeof data === "object";
    this.writeHead(this.statusCode || 200, {
      "Content-Type": isJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8"
    });
    this.end(isJson ? JSON.stringify(data) : String(data));
  };

  res.json = function (obj) {
    this.writeHead(this.statusCode || 200, {
      "Content-Type": "application/json; charset=utf-8"
    });
    this.end(JSON.stringify(obj));
  };
}

module.exports = { use, applyMiddleware, enhance };
