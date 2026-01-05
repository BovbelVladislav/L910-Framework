const http = require("http");
const { enhance } = require("./middleware");
const { applyMiddleware, use } = require("./middleware");

const routes = {
  GET: {},
  POST: {},
  PUT: {},
  DELETE: {},
  PATCH: {}
};

function get(path, handler) {
  routes.GET[path] = handler;
}
function post(path, handler) {
  routes.POST[path] = handler;
}
function put(path, handler) {
  routes.PUT[path] = handler;
}
function del(path, handler) {
  routes.DELETE[path] = handler;
}
function patch(path, handler) {
  routes.PATCH[path] = handler;
}

function listen(port, callback) {
  const server = http.createServer(async (req, res) => {
    await enhance(req, res);

    applyMiddleware(req, res, () => {
      const methodRoutes = routes[req.method];
      const handler = methodRoutes?.[new URL(req.url, `http://${req.headers.host}`).pathname];

      if (handler) {
        try {
          handler(req, res);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      } else {
        res.status(404).json({ error: "Маршрут не найден" });
      }
    });
  });

  server.listen(port, callback);
}

module.exports = { get, post, put, del, patch, listen, use };
