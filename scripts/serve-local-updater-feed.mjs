import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..");
const feedDir = path.join(ROOT, "desktop", "dev-updater");
const port = Number(process.env.DESKTOP_UPDATER_FEED_PORT ?? "8765");

const contentTypes = new Map([
  [".json", "application/json; charset=utf-8"],
  [".exe", "application/vnd.microsoft.portable-executable"],
  [".msi", "application/x-msi"],
  [".zip", "application/zip"],
  [".sig", "text/plain; charset=utf-8"],
  [".txt", "text/plain; charset=utf-8"],
]);

const server = http.createServer((request, response) => {
  const requestPath = new URL(request.url ?? "/", `http://127.0.0.1:${port}`).pathname;
  const relativePath = requestPath === "/" ? "/latest.json" : requestPath;
  let decodedRelativePath;
  try {
    decodedRelativePath = decodeURIComponent(relativePath);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }
  const resolvedPath = path.join(feedDir, decodedRelativePath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(path.normalize(feedDir))) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  if (!fs.existsSync(normalizedPath) || fs.statSync(normalizedPath).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const ext = path.extname(normalizedPath).toLowerCase();
  response.writeHead(200, {
    "Content-Type": contentTypes.get(ext) ?? "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(normalizedPath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(
    `[serve-local-updater-feed] Serving desktop/dev-updater at http://127.0.0.1:${port}/latest.json`,
  );
});
