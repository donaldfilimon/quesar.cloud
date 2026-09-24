import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { resolve, extname, sep } from "node:path";

const root = resolve(process.env.E2E_STATIC_ROOT ?? "docs");
const types: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".mp4": "video/mp4",
  ".vtt": "text/vtt",
  ".woff2": "font/woff2",
  ".xml": "application/xml",
  ".pdf": "application/pdf",
};
createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
    let file = resolve(root, "." + pathname);
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    if (statSync(file).isDirectory()) file = resolve(file, "index.html");
    const size = statSync(file).size;
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      res.writeHead(416).end();
      return;
    }
    res.writeHead(range ? 206 : 200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Content-Length": end - start + 1,
      "Accept-Ranges": "bytes",
      ...(range ? { "Content-Range": `bytes ${start}-${end}/${size}` } : {}),
    });
    if (req.method === "HEAD") res.end();
    else createReadStream(file, { start, end }).pipe(res);
  } catch {
    res.writeHead(404).end("Not found");
  }
}).listen(Number(process.env.E2E_PORT ?? 4197), "127.0.0.1");
