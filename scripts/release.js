#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * release.js — 在 GitHub 上发布版本并上传附件
 *
 * 依赖：项目根目录的 .env（已被 .gitignore 忽略）
 *   GITHUB_TOKEN=ghp_xxxx
 *   GITHUB_REPO_URL=https://github.com/<owner>/<repo>.git   # 用于推断 owner/repo
 *   GITHUB_USER=<owner>                                     # 可选
 *   GITHUB_REPO=<repo>                                      # 可选
 *
 * 行为：
 *   1. 读取 package.json 版本号，以 v<version> 作为 tag 与 Release 标题
 *   2. 若 win-zip 压缩包不存在，先调用 scripts/build-win-zip.js 生成
 *   3. 已存在同名 Release 则复用，否则创建
 *   4. 上传附件：Windows zip（必须）、fnOS fpk（若 fpk/ 下存在）
 *
 * 说明：仅使用 Node 内置模块与系统 git，不引入新依赖。
 * 用法：node scripts/release.js   或双击 发布.bat
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ---------- .env 解析 ----------
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let value = m[2].trim();
    if (value.length >= 2 && ((value[0] === '"' && value.endsWith('"')) || (value[0] === "'" && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    env[m[1]] = value;
  }
  return env;
}

// ---------- GitHub API（仅用内置 https） ----------
function makeClient(token) {
  function request(method, host, urlPath, headers, body) {
    return new Promise((resolve, reject) => {
      const req = https.request(
        { host, path: urlPath, method, headers: Object.assign({ Authorization: 'token ' + token, 'User-Agent': 'um-web-release' }, headers || {}) },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            let json = null;
            try {
              json = JSON.parse(buf.toString('utf8'));
            } catch (e) {
              /* 非 JSON 响应 */
            }
            resolve({ status: res.statusCode, json, text: buf.toString('utf8') });
          });
        },
      );
      req.on('error', reject);
      if (body) req.write(body);
      req.end();
    });
  }

  return {
    api(method, urlPath, payload) {
      const data = payload === undefined ? null : Buffer.from(JSON.stringify(payload), 'utf8');
      const headers = { Accept: 'application/vnd.github+json' };
      if (data) {
        headers['Content-Type'] = 'application/json';
        headers['Content-Length'] = data.length;
      }
      return request(method, 'api.github.com', urlPath, headers, data);
    },
    upload(urlPath, headers, stream) {
      return new Promise((resolve, reject) => {
        const req = https.request(
          { host: 'uploads.github.com', path: urlPath, method: 'POST', headers: Object.assign({ Authorization: 'token ' + token, 'User-Agent': 'um-web-release' }, headers) },
          (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
              const buf = Buffer.concat(chunks);
              let json = null;
              try {
                json = JSON.parse(buf.toString('utf8'));
              } catch (e) {
                /* 非 JSON 响应 */
              }
              resolve({ status: res.statusCode, json, text: buf.toString('utf8') });
            });
          },
        );
        req.on('error', reject);
        stream.pipe(req);
      });
    },
  };
}

function contentTypeOf(file) {
  return file.toLowerCase().endsWith('.zip') ? 'application/zip' : 'application/octet-stream';
}

async function main() {
  console.log('=== 发布 GitHub Release ===');
  console.log('');

  const env = loadEnv(path.join(ROOT, '.env'));
  const token = env.GITHUB_TOKEN;
  if (!token) {
    console.error('ERROR: 缺少 GITHUB_TOKEN，请在项目根目录 .env 中配置。');
    process.exit(1);
  }

  let owner = env.GITHUB_USER || '';
  let repo = env.GITHUB_REPO || '';
  if (env.GITHUB_REPO_URL) {
    const m = env.GITHUB_REPO_URL.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
    if (m) {
      if (!owner) owner = m[1];
      if (!repo) repo = m[2];
    }
  }
  if (!owner || !repo) {
    console.error('ERROR: 无法推断仓库，请在 .env 中设置 GITHUB_REPO_URL 或 GITHUB_USER + GITHUB_REPO。');
    process.exit(1);
  }
  console.log('仓库: ' + owner + '/' + repo);

  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const version = pkg.version || '0.0.0';
  const tag = 'v' + version;
  console.log('版本: ' + tag);
  console.log('');

  // 1) 确保 Windows zip 已生成
  //    按“目录扫描 + 版本号匹配”定位，不依赖具体文件名（文件名可能被改成 umweb- 等）
  const zipDir = path.join(ROOT, 'win-zip');
  const findZip = () => {
    if (!fs.existsSync(zipDir)) return null;
    const zips = fs.readdirSync(zipDir).filter((f) => f.toLowerCase().endsWith('.zip'));
    if (!zips.length) return null;
    const matched = zips.find((f) => f.includes(version)) || zips.sort().pop();
    return path.join(zipDir, matched);
  };

  let zipPath = findZip();
  if (!zipPath) {
    console.log('[1/4] 未找到 Windows 压缩包，先生成 ...');
    const r = spawnSync(process.execPath, [path.join(__dirname, 'build-win-zip.js')], { cwd: ROOT, stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('ERROR: 生成压缩包失败。');
      process.exit(1);
    }
    zipPath = findZip();
  } else {
    console.log('[1/4] 已存在 Windows 压缩包: ' + path.basename(zipPath));
  }

  // 2) 收集附件
  console.log('[2/4] 收集附件 ...');
  const assets = [];
  if (zipPath && fs.existsSync(zipPath)) assets.push(zipPath);
  else console.log('  警告：未找到可上传的 Windows 压缩包。');
  const fpkDir = path.join(ROOT, 'fpk');
  if (fs.existsSync(fpkDir)) {
    const fpk = fs.readdirSync(fpkDir).filter((f) => f.toLowerCase().endsWith('.fpk'));
    // 取与当前版本匹配的那一个，否则取最新一个
    const matched = fpk.find((f) => f.includes(version)) || fpk.sort().pop();
    if (matched) assets.push(path.join(fpkDir, matched));
  }
  if (!assets.length) {
    console.error('ERROR: 没有可上传的附件。');
    process.exit(1);
  }
  assets.forEach((a) => console.log('  - ' + path.basename(a)));

  const gh = makeClient(token);

  // 3) 获取或创建 Release
  console.log('');
  console.log('[3/4] 准备 Release ...');
  let releaseId = null;
  let htmlUrl = '';
  let existingAssets = [];

  const found = await gh.api('GET', '/repos/' + owner + '/' + repo + '/releases/tags/' + encodeURIComponent(tag));
  if (found.status === 200 && found.json && found.json.id) {
    releaseId = found.json.id;
    htmlUrl = found.json.html_url;
    existingAssets = found.json.assets || [];
    console.log('  已存在该版本的 Release，复用之（ID ' + releaseId + '）。');
  } else {
    const body = [
      '## 音乐解锁 ' + version,
      '',
      '基于 Unlock Music 上游项目的二次开发版本（界面为格式工厂风格）。',
      '上游作者：MengYX（MIT 许可协议）；修改维护：RONGLINC93。',
      '',
      '### 下载说明',
      '- `音乐解锁-' + version + '-win.zip`：Windows 本地版，解压后双击 `运行.bat` 即可使用（需 Node.js）。',
      '- `*.fpk`：fnOS 应用包，在飞牛应用中心上传安装。',
      '',
      '### 支持格式',
      '网易云(ncm) · QQ音乐(qmc / mflac / mgg) · 酷狗(kgm) · 虾米(xm) · 酷我(kwm)',
      '',
      '> 所有解密运算都在本机浏览器内完成，文件不会上传。',
    ].join('\n');

    const created = await gh.api('POST', '/repos/' + owner + '/' + repo + '/releases', {
      tag_name: tag,
      name: version,
      body,
      draft: false,
      prerelease: false,
    });
    if (created.status !== 201 || !created.json || !created.json.id) {
      console.error('ERROR: 创建 Release 失败（HTTP ' + created.status + '）：' + created.text);
      process.exit(1);
    }
    releaseId = created.json.id;
    htmlUrl = created.json.html_url;
    console.log('  已创建 Release（ID ' + releaseId + '）。');
  }

  // 4) 上传附件（同名先删除，避免 422）
  console.log('');
  console.log('[4/4] 上传附件 ...');
  for (const file of assets) {
    const name = path.basename(file);
    const dup = existingAssets.find((a) => a && a.name === name);
    if (dup) {
      const del = await gh.api('DELETE', '/repos/' + owner + '/' + repo + '/releases/assets/' + dup.id);
      console.log('  已删除同名旧附件: ' + name + ' (HTTP ' + del.status + ')');
    }
    const stat = fs.statSync(file);
    const res = await gh.upload(
      '/repos/' + owner + '/' + repo + '/releases/' + releaseId + '/assets?name=' + encodeURIComponent(name),
      { 'Content-Type': contentTypeOf(file), 'Content-Length': stat.size },
      fs.createReadStream(file),
    );
    if (res.status >= 300 || !res.json || !res.json.id) {
      console.error('  上传失败: ' + name + ' (HTTP ' + res.status + ') ' + res.text);
      process.exit(1);
    }
    console.log('  已上传: ' + name + ' (' + (stat.size / 1024 / 1024).toFixed(2) + ' MB)');
  }

  console.log('');
  console.log('发布完成: ' + (htmlUrl || 'https://github.com/' + owner + '/' + repo + '/releases/tag/' + tag));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
