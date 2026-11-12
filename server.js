// Run:  npm install  &&  node server.js        (optional: ASPECT=1.7778 node server.js)
// Phones -> http://localhost:8080 (put an HTTPS tunnel in front)   TouchDesigner -> ws://localhost:8081
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const D = __dirname, PORT = process.env.PORT || 8080, ASPECT = +process.env.ASPECT || 0;
const types = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
const findRef = () => ['jpg', 'jpeg', 'png', 'webp'].map(e => path.join(D, 'reference.' + e)).find(fs.existsSync);

const server = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/config.json') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ aspect: ASPECT })); }
  if (u === '/reference') {
    const f = findRef();
    if (!f) { res.writeHead(404); return res.end('Put reference.jpg next to server.js'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)], 'Cache-Control': 'no-store' });
    return fs.createReadStream(f).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  fs.createReadStream(path.join(D, u === '/monitor' ? 'monitor.html' : 'index.html')).pipe(res);
}).listen(PORT, () => console.log('web: http://localhost:' + PORT + '   monitor: /monitor   TD: ws://localhost:8081'));

const phones = new WebSocketServer({ noServer: true });
const mon = new WebSocketServer({ noServer: true });
const td = new WebSocketServer({ port: 8081 });
server.on('upgrade', (req, sock, head) => {
  const w = req.url === '/ws' ? phones : req.url === '/monitor' ? mon : null;
  if (!w) return sock.destroy();
  w.handleUpgrade(req, sock, head, ws => w.emit('connection', ws, req));
});
phones.on('connection', ws => ws.on('message', m => {
  const s = m.toString();
  [...td.clients, ...mon.clients].forEach(c => c.readyState === 1 && c.send(s));
}));
