  async function readJsonBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];

      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        if (chunks.length === 0) return resolve(null);
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          resolve(json);
        } catch {
          reject(new Error("Некорректный JSON в теле запроса"));
        }
      });

      req.on("error", reject);
    });
  }

  module.exports = { readJsonBody };
