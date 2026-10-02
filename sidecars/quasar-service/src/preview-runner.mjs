// Runs outside the generated project. Next 16.3's custom next() API adds an
// upgrade listener lazily; initialize the handlers directly so every transport
// crosses this gate, including upgrades after the first authenticated request.
import http from 'node:http';
import { createRequire } from 'node:module';
import { timingSafeEqual } from 'node:crypto';
import path from 'node:path';
const secret = process.env.QUASAR_CHILD_SECRET;
delete process.env.QUASAR_CHILD_SECRET;
if (!secret) throw new Error('Missing preview transport credential');
const port = Number(process.env.QUASAR_CHILD_PORT);
const basePath = process.env.QUASAR_PREVIEW_BASE_PATH;
const require = createRequire(path.join(process.cwd(), 'package.json'));
const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');
const config = await require('next/dist/server/config').default(PHASE_DEVELOPMENT_SERVER, process.cwd());
if (config.basePath !== basePath || (config.assetPrefix && config.assetPrefix !== basePath))
  throw new Error('Preview config must retain QUASAR_PREVIEW_BASE_PATH for basePath and assetPrefix');
process.env.__NEXT_DEV_SERVER = '1';
const { getRequestHandlers } = require('next/dist/server/lib/start-server');
const handlers = await getRequestHandlers({ dir: process.cwd(), port, isDev: true, hostname: '127.0.0.1' });
function authorized(req) {
  const value = req.headers['x-quasar-preview'];
  return typeof value === 'string' && Buffer.byteLength(value) === Buffer.byteLength(secret) && timingSafeEqual(Buffer.from(value), Buffer.from(secret));
}
const server = http.createServer((req, res) => {
  if (!authorized(req)) { res.writeHead(401); res.end('Unauthorized'); return; }
  delete req.headers['x-quasar-preview'];
  if (req.url === '/__quasar_health') { res.writeHead(200); res.end('ok'); return; }
  void handlers.requestHandler(req, res);
});
server.on('upgrade', (req, socket, head) => {
  if (!authorized(req)) { socket.end('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n'); return; }
  delete req.headers['x-quasar-preview'];
  void handlers.upgradeHandler(req, socket, head);
});
server.listen(port, '127.0.0.1');
