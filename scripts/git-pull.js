#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * git-pull.js — 一键从 GitHub 拉取最新代码
 *
 * 依赖：项目根目录的 .env（已被 .gitignore 忽略），至少包含：
 *   GITHUB_TOKEN=ghp_xxxx
 *   GITHUB_REPO_URL=https://github.com/<owner>/<repo>.git   # 可选，用于推断 owner
 *   GITHUB_USER=<owner>                                     # 可选，覆盖推断结果
 *
 * 行为：检查工作区 -> git pull --rebase（令牌只随本次命令传入，不写入 git 配置）
 * 用法：node scripts/git-pull.js   或双击 拉取.bat
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_BRANCH = 'main';

// ---------- .env 解析（不依赖 dotenv，保持离线可用） ----------
function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  const content = fs.readFileSync(file, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
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

function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) throw r.error;
  return r.status === 0;
}

function gitQuiet(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'ignore' });
  return r.status === 0;
}

function main() {
  console.log('=== 从 GitHub 拉取 (origin/' + DEFAULT_BRANCH + ') ===');
  console.log('');

  if (!fs.existsSync(path.join(ROOT, '.git'))) {
    console.error('ERROR: 当前目录不是 Git 仓库：' + ROOT);
    process.exit(1);
  }

  const env = loadEnv(path.join(ROOT, '.env'));
  const token = env.GITHUB_TOKEN;
  if (!token) {
    console.error('ERROR: 缺少 GITHUB_TOKEN。');
    console.error('请在项目根目录创建 .env，内容例如：');
    console.error('  GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx');
    console.error('  GITHUB_REPO_URL=https://github.com/RONGLINC93/um-web.git');
    process.exit(1);
  }

  let owner = env.GITHUB_USER || '';
  if (!owner && env.GITHUB_REPO_URL) {
    const m = env.GITHUB_REPO_URL.match(/github\.com[:/]([^/]+)\//i);
    if (m) owner = m[1];
  }
  if (!owner) {
    console.error('ERROR: 无法推断 GitHub 用户名，请在 .env 中设置 GITHUB_USER 或 GITHUB_REPO_URL。');
    process.exit(1);
  }

  // 1) 检查工作区
  console.log('[1/2] 检查本地未提交改动 ...');
  const clean = gitQuiet(['diff', '--quiet']);
  if (clean) {
    console.log('  工作区干净。');
  } else {
    console.log('  警告：检测到未提交的改动（已跟踪文件被修改）。');
    console.log('  建议先运行 推送.bat 提交，避免 rebase 被阻塞。');
  }

  // 2) 拉取
  console.log('');
  console.log('[2/2] 拉取 (git pull --rebase) ...');
  const basic = Buffer.from(owner + ':' + token).toString('base64');
  const ok = git([
    '-c',
    'http.extraHeader=Authorization: Basic ' + basic,
    'pull',
    '--rebase',
    'origin',
    DEFAULT_BRANCH,
  ]);
  if (!ok) {
    console.error('');
    console.error('拉取失败：常见原因是存在冲突。');
    console.error('处理办法：解决冲突后 git rebase --continue，或 git rebase --abort 放弃。');
    process.exit(1);
  }

  console.log('');
  console.log('拉取完成，已是最新代码。');
}

main();
