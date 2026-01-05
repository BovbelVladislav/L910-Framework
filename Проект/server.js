const http = require("http");
const { router } = require("./router");
const { appEvents } = require("./utils/events");
const { use, applyMiddleware, enhance } = require("./middleware");
use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

function startServer(port) {
  const server = http.createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      return res.end();
    }

    enhance(req, res); // расширяем объекты

    applyMiddleware(req, res, () => {
      router(req, res); // вызываем роутер после middleware
    });
  }); 

  appEvents.on("log", (evt) => console.log("[EVENT]", evt));

  server.listen(port, () => {
    console.log(`Сервер запущен на порту ${port}`);
  });
}

const cliPort = Number(process.argv[2]) || 3000;
startServer(cliPort);
  