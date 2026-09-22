'use strict';
// 音乐解锁 (um-web legacy) —— 纯 Node.js 静态文件服务
// 仅使用 Node 内置模块，无需任何运行时依赖。
// 服务目录：本文件同级 ../web （即 app/web，由打包脚本从项目根目录复制而来）。
const http = require('http');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '..', 'web');
const PORT = parseInt(process.env.PORT, 10) || 9520;
// 监听所有网络接口（IPv4 + IPv6 双栈）。
// 注意：显式绑定 '0.0.0.0' 只会监听 IPv4，会导致通过 IPv6 地址无法访问；
// 不传 host 时 Node 监听 :: 并开启双栈，IPv4 与 IPv6 均可访问。可用 HOST 环境变量覆盖。
const HOST = process.env.HOST || undefined;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.normalize(path.join(WEB_DIR, urlPath));
  // 阻止路径穿越
  if (filePath !== WEB_DIR && !filePath.startsWith(WEB_DIR + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    let target = filePath;
    if (!err && stat.isDirectory()) target = path.join(filePath, 'index.html');

    fs.readFile(target, (readErr, data) => {
      if (readErr) {
        // SPA / PWA 兜底：无扩展名的路径回退到 index.html
        const seg = urlPath.split('/').pop();
        if (!seg.includes('.')) {
          fs.readFile(path.join(WEB_DIR, 'index.html'), (e2, d2) => {
            if (e2) {
              res.writeHead(404);
              res.end('Not Found');
              return;
            }
            res.writeHead(200, { 'Content-Type': MIME['.html'] });
            res.end(d2);
          });
          return;
        }
        res.writeHead(404);
        res.end('Not Found');
        return;
      }
      const ext = path.extname(target).toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'application/octet-stream',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
});

server.on('error', (err) => {
  console.error('[um-web] server failed to listen on ' + (HOST || '0.0.0.0') + ':' + PORT +
    ' (' + (err && err.code) + '): ' + (err && err.message));
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log('[um-web] static server listening on http://' + (HOST || '0.0.0.0') + ':' + PORT);
});
