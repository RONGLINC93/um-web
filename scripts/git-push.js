#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * git-push.js — 一键提交并推送到 GitHub
 *
 * 依赖：项目根目录的 .env（已被 .gitignore 忽略），至少包含：
 *   GITHUB_TOKEN=ghp_xxxx
 *   GITHUB_REPO_URL=https://github.com/<owner>/<repo>.git   # 可选，用于推断 owner
 *   GITHUB_USER=<owner>                                     # 可选，覆盖推断结果
 *
 * 行为：git add -A -> 询问提交说明 -> git commit -> 带令牌推送（不写入 git 配置）
 * 用法：node scripts/git-push.js   或双击 推送.bat
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const readline = require('readline');

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

// ---------- 执行 git 命令 ----------
function git(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'inherit' });
  if (r.error) throw r.error;
  return r.status === 0;
}

function gitQuiet(args) {
  const r = spawnSync('git', args, { cwd: ROOT, stdio: 'ignore' });
  return r.status === 0;
}

// ---------- 交互式输入（非交互环境直接返回默认值） ----------
function ask(question, fallback) {
  return new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(fallback);
      return;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve((answer || '').trim() || fallback);
    });
    rl.on('close', () => {
      if (!answered) resolve(fallback);
    });
  });
}

async function main() {
  console.log('=== 推送到 GitHub (origin/' + DEFAULT_BRANCH + ') ===');
  console.log('');

  // 前置检查
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

  // 推断仓库 owner（Basic 认证需要用户名 + 令牌）
  let owner = env.GITHUB_USER || '';
  if (!owner && env.GITHUB_REPO_URL) {
    const m = env.GITHUB_REPO_URL.match(/github\.com[:/]([^/]+)\//i);
    if (m) owner = m[1];
  }
  if (!owner) {
    console.error('ERROR: 无法推断 GitHub 用户名，请在 .env 中设置 GITHUB_USER 或 GITHUB_REPO_URL。');
    process.exit(1);
  }

  // 1) 暂存
  console.log('[1/3] 暂存更改 (git add -A) ...');
  if (!git(['add', '-A'])) {
    console.error('ERROR: git add 失败。');
    process.exit(1);
  }

  // 2) 提交（无改动则跳过）
  console.log('[2/3] 提交 ...');
  const hasStaged = !gitQuiet(['diff', '--cached', '--quiet']);
  if (hasStaged) {
    const fallback = 'chore: 更新代码 ' + new Date().toISOString().slice(0, 19).replace('T', ' ');
    const message = await ask('提交说明（直接回车使用默认）: ', fallback);
    if (!git(['commit', '-m', message])) {
      console.error('ERROR: git commit 失败。');
      process.exit(1);
    }
    console.log('  已提交: ' + message);
  } else {
    console.log('  没有需要提交的更改，跳过提交。');
  }

  // 3) 推送（令牌只随本次命令传入，不写入 git 配置）
  console.log('[3/3] 推送 ...');
  const basic = Buffer.from(owner + ':' + token).toString('base64');
  const ok = git([
    '-c',
    'http.extraHeader=Authorization: Basic ' + basic,
    'push',
    'origin',
    DEFAULT_BRANCH,
  ]);
  if (!ok) {
    console.error('');
    console.error('推送失败：可能是令牌失效或无权限，或远端有新提交（先运行 拉取.bat）。');
    process.exit(1);
  }

  console.log('');
  console.log('推送完成。');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
