#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * build-win-zip.js — 生成 Windows 本地版分发压缩包
 *
 * 产物：<项目根>/win-zip/音乐解锁-<version>-win.zip
 * 包内结构：
 *   音乐解锁-<version>-win/
 *     dist/           构建后的静态页面
 *     serve-dist.js   纯 Node 静态服务器（无第三方依赖）
 *     运行.bat        双击启动本地服务并打开浏览器
 *     使用说明.txt
 *     LICENSE
 *
 * 说明：
 *   - 若 dist/index.html 不存在，会自动执行一次离线构建（npm run build，需 node_modules 已就绪）。
 *   - 打包使用项目已有的 jszip 依赖，不引入新依赖，可离线运行。
 *
 * 用法：node scripts/build-win-zip.js   或双击 打包win-zip.bat
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const JSZip = require('jszip');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT_DIR = path.join(ROOT, 'win-zip');

function walk(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (entry.isFile()) {
      results.push(full);
    }
  }
  return results;
}

function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version || '0.0.0';
  const folderName = 'umweb-' + version + '-win';
  const outFile = path.join(OUT_DIR, folderName + '.zip');

  console.log('=== 打包 Windows 本地版：音乐解锁 ' + version + ' ===');
  console.log('');

  // 1) 确保 dist 已构建
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.log('[1/4] dist 不存在，执行离线构建 (npm run build) ...');
    const r = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: true });
    if (r.status !== 0) {
      console.error('ERROR: 构建失败。');
      process.exit(1);
    }
  } else {
    console.log('[1/4] 使用已有 dist（如需重新构建请先运行 编译.bat）。');
  }
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('ERROR: 未找到 dist/index.html。');
    process.exit(1);
  }

  // 2) 收集 dist 文件
  console.log('[2/4] 收集静态文件 ...');
  const files = walk(DIST);
  console.log('  文件数: ' + files.length);

  // 3) 组装 zip
  console.log('[3/4] 生成压缩包 ...');
  const zip = new JSZip();
  const rootFolder = zip.folder(folderName);

  for (const file of files) {
    const rel = path.relative(DIST, file).split(path.sep).join('/');
    rootFolder.file('dist/' + rel, fs.readFileSync(file));
  }

  // 运行所需脚本（直接复用项目根目录版本，保证行为一致）
  rootFolder.file('serve-dist.js', fs.readFileSync(path.join(ROOT, 'serve-dist.js')));
  rootFolder.file('运行.bat', fs.readFileSync(path.join(ROOT, '运行.bat')));
  if (fs.existsSync(path.join(ROOT, 'LICENSE'))) {
    rootFolder.file('LICENSE', fs.readFileSync(path.join(ROOT, 'LICENSE')));
  }

  const readme = [
    '音乐解锁 ' + version + '（Windows 本地版）',
    '',
    '基于 Unlock Music 上游项目的二次开发版本，界面改为格式工厂风格。',
    '上游作者：MengYX（MIT 许可协议）；修改维护：RONGLINC93。',
    '',
    '【使用方法】',
    '1. 解压本压缩包到任意目录。',
    '2. 确认已安装 Node.js（建议 v16 及以上，命令行执行 node -v 可检查）。',
    '3. 双击 运行.bat，会自动启动本地服务并打开浏览器。',
    '4. 默认地址：http://localhost:9520 ，关闭命令行窗口或按 Ctrl+C 停止服务。',
    '5. 若 9520 端口被占用，修改 运行.bat 里的 set "PORT=9520" 换成其它端口。',
    '',
    '【目录说明】',
    '  dist/          网页本体（解密在本地浏览器完成，文件不会上传）',
    '  serve-dist.js  本地静态服务器（仅用 Node 内置模块）',
    '  运行.bat       一键启动脚本',
    '',
    '【注意事项】',
    '- 通过 http://localhost 访问时可启用 Web Worker 多线程，解密更快；',
    '  直接双击 dist/index.html 以 file:// 打开也能用，但只能单线程，且部分浏览器会限制功能。',
    '- 所有解密运算都在本机浏览器内完成，不会上传到任何服务器。',
    '',
    '【支持格式】',
    '网易云(ncm) · QQ音乐(qmc / mflac / mgg) · 酷狗(kgm) · 虾米(xm) · 酷我(kwm)',
  ].join('\r\n');
  rootFolder.file('使用说明.txt', Buffer.from('\uFEFF' + readme, 'utf8')); // BOM 便于记事本正确显示中文

  // 4) 写出
  console.log('[4/4] 写出压缩包 ...');
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  zip
    .generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 9 } })
    .then((buf) => {
      fs.writeFileSync(outFile, buf);
      const sizeMB = (buf.length / 1024 / 1024).toFixed(2);
      console.log('');
      console.log('完成: ' + outFile);
      console.log('大小: ' + sizeMB + ' MB');
      console.log('');
      console.log('提示：把 zip 拷贝到其它 Windows 电脑解压，双击 运行.bat 即可使用。');
    })
    .catch((e) => {
      console.error('ERROR: 生成压缩包失败：' + (e && e.message));
      process.exit(1);
    });
}

main();
