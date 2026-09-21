# Unlock Music 音乐解锁

[![Build Status](https://git.unlock-music.dev/um/web/actions/workflows/build.yml/badge.svg)][ci]

- 在浏览器中解锁加密的音乐文件。 Unlock encrypted music file in the browser.
- Unlock Music 项目是以学习和技术研究的初衷创建的，修改、再分发时请遵循[授权协议]。
- Unlock Music 的 CLI 版本可以在 [unlock-music/cli] 找到，大批量转换建议使用 CLI 版本。
- 我们新建了 Telegram 群组 [`@unlock_music_chat`] ，欢迎加入！
- CI 自动构建已经部署，可以在 [Actions][ci] 下载

> **关于本仓库**
> 本仓库是在 Unlock Music 上游项目基础上做的**二次开发与打包版本**，由 **RONGLINC93** 维护。
> 主要增加了 **fnOS 应用（`.fpk`）离线封装**，并将界面重做为「格式工厂」风格。
> 上游作者版权与 MIT 许可协议保持不变：`Copyright © 2019 - 2026 MengYX`。

> **WARNING**
> 在本站 fork 不会起到备份的作用，只会浪费服务器储存空间。如无必要请勿 fork 该仓库。

[授权协议]: https://git.unlock-music.dev/um/web/src/branch/main/LICENSE
[unlock-music/cli]: https://git.unlock-music.dev/um/cli
[`@unlock_music_chat`]: https://t.me/unlock_music_chat
[ci]: https://git.unlock-music.dev/um/web/actions?workflow=build.yml

---

## 二次开发修改说明

> 维护者：**RONGLINC93** ｜ 上游：Unlock Music（[MIT 许可协议][授权协议]）｜ 上游作者版权：MengYX

本分支在保留上游解密能力（各音乐平台加密格式处理逻辑未改动）的前提下，做了**应用封装**与**界面重构**两类改动。

### 一、总体改动一览

| 类别 | 说明 |
| --- | --- |
| 应用封装 | 新增 fnOS 应用 `.fpk` 离线封装（Windows 一键打包脚本），内置 Node 静态服务器 |
| 界面重构 | 界面改为「格式工厂」风格：左侧格式导航树 + 顶部工具栏 + 任务列表 + 底部状态栏 |
| 界面细节 | 列表紧凑化、封面缩小、列表限高（内部滚动+表头吸顶）、右下角悬浮播放器 |
| 交互增强 | 任务区支持拖拽添加文件（与左侧拖拽区走同一解密队列） |
| 功能入口调整 | 「命名格式」移入设置弹窗；新增「关于」弹窗；移除启动通知与页面底部信息栏 |
| 问题修复 | Element UI 组件注册缺失、本地依赖目录为空、进程组被杀导致服务静默、加载提示误显示 |

### 二、fnOS 应用（fpk）打包说明

相关文件：

| 文件 | 作用 |
| --- | --- |
| `打包fpk.bat` | 一键打包：构建 web → 复制 dist → 同步 manifest 版本 → 换行符归一(LF) → `fnpack build` → 输出 `fpk\umweb-<版本号>.fpk` |
| `运行.bat` | 本机以 `PORT` 环境变量（默认 8080）启动 `serve-dist.js` 预览 dist |
| `serve-dist.js` | 纯 Node 内置模块实现的静态服务器，供本地预览 |
| `fnos/umweb/manifest` | fnOS 应用清单，版本号由脚本从 `package.json` 自动同步 |
| `fnos/umweb/cmd/main` | 生命周期脚本，通过 `setsid` 启动 Node 服务，避免脚本退出时进程被误杀 |
| `fnos/umweb/app/server/server.js` | 应用内静态服务器，监听 `0.0.0.0:9520`，提供 `app/web`（即 dist） |
| `fnos/umweb/app/ui/config` | 桌面入口，指向 `http://127.0.0.1:9520/` |

关键行为：

- **离线打包**：`打包fpk.bat` 不做 `npm install`；若 `node_modules` 缺失会直接报错退出（提示先在联网环境 `npm install`），其余步骤（构建、`fnpack`、复制、换行符处理）全部为本地文件操作。
- **安装期依赖**：`manifest` 中声明 `install_dep_apps = nodejs_v20`，Node 运行时由应用中心提供，因此安装时需能访问应用中心。
- **产物**：`fpk\umweb-<version>.fpk`（版本号取自 `package.json`）。安装方式：在 fnOS 应用中心上传，或 SSH 下执行 `appcenter-cli install-fpk <路径>`。
- **端口**：本地预览端口在 `运行.bat` 的 `set "PORT=..."`；fnOS 应用内端口为 `9520`（`server.js` 中定义）。

### 三、界面改动清单

- **左侧导航树**：音频（MP3 / 原始格式）、工具（解密设定）、系统（设置 / 关于）；底部为紧凑拖拽添加区与「文件不上传」提示。点击格式项即切换输出格式，当前项高亮。
- **顶部工具栏**：全部下载 / 下载选中 / 删除选中 / 清空 / 立即保存。
- **任务区**：空列表占位；有文件时显示列表（勾选、下载、编辑、试听）；**整个任务区支持拖入文件**，复用左侧 `FileSelector` 的解密队列，拖拽时显示蓝色虚线与提示。
- **列表**：封面 100×100 → 48×48、操作按钮改 mini 并保持一行、单元格内边距收紧、文字过长显示省略号并支持悬停提示；`max-height=440px`，超出后内部滚动且表头吸顶。
- **播放器**：由「列表下方整条」改为**右下角悬浮面板**，默认收起为圆形按钮，点击列表的播放按钮时自动展开；使用 `v-show` 隐藏以保证收起时播放不中断。
- **设置弹窗**：包含「命名格式」；入口在左侧导航「系统 → 设置」。
- **关于弹窗**：展示版本、支持格式、相关链接、**原作者 MengYX** 与**修改维护 RONGLINC93**、MIT 许可协议。入口在左侧导航「系统 → 关于」。
- **布局**：`#app` 保留 30px 四周留白，`#app .el-main` 去掉默认内边距，`.ff` 铺满剩余区域（保留圆角与细边框）。

### 四、代码层面修复记录

1. **Element UI 组件注册缺失**：`src/main.ts` 为按需注册，原先只注册了 `Radio`。而 `RadioGroup` / `RadioButton` 是独立模块，导致「输出格式」控件渲染为不可点击的死文本（旧版使用未注册的 `el-select` 亦然）。已追加 `RadioGroup`、`RadioButton` 的注册。
2. **本地依赖目录为空**：`node_modules/@unlock-music/joox-crypto` 偶发为空目录导致构建失败，可将 `vendor/joox-crypto/` 的 `index.js`、`package.json` 复制进去修复（纯本地操作，无需联网）。
3. **服务被误杀**：fnOS 生命周期脚本退出时会回收进程组，Node 服务随之静默退出导致界面白屏。`cmd/main` 改用 `setsid` 启动、`server.js` 增加 `listening`/`error` 日志，便于失败时定位。
4. **多余提示**：`public/index.html` 中的「请勿直接运行源代码！」改为默认隐藏，仅在以 `file://` 直接打开时由 `public/loader.js` 显示；同时移除启动时的更新检查弹窗与其联网请求。

### 五、已知事项 / 注意事项

- **PWA 缓存**：项目启用 Service Worker，重装后若界面未变化，清一次该应用缓存或重装后刷新即可（构建产物文件名带新 hash，正常情况下会自动更新）。
- **按需注册约束**：新增 Element UI 组件时必须在 `src/main.ts` 显式注册，否则会渲染成不可交互的普通标签。例如未注册 `Slider`，故播放器的进度条使用原生 `<input type="range">` 自绘样式实现。
- **播放器自定义控件**：已移除 `<audio controls>` 原生控件（浏览器样式无法覆盖），改为自绘的播放/暂停、进度、时间显示。
- **构建警告**：`caniuse-lite is outdated` 与 bundle 体积提示不影响产物，可忽略；如需更新须联网执行 `npx browserslist@latest --update-db`。
- **离线构建前提**：`node_modules` 必须已存在（先在联网环境执行一次 `npm install`），之后断网打包即可。

---

## 特性

### 支持的格式

- [x] QQ 音乐 (.qmc0/.qmc2/.qmc3/.qmcflac/.qmcogg/.tkm)
- [x] Moo 音乐格式 (.bkcmp3/.bkcflac/...)
- [x] QQ 音乐 Tm 格式 (.tm0/.tm2/.tm3/.tm6)
- [x] QQ 音乐新格式 (.mflac/.mgg/.mflac0/.mgg1/.mggl)
- [x] <ruby>QQ 音乐海外版<rt>JOOX Music</rt></ruby> (.ofl_en)
- [x] 网易云音乐格式 (.ncm)
- [x] 虾米音乐格式 (.xm)
- [x] 酷我音乐格式 (.kwm)
- [x] 酷狗音乐格式 (.kgm/.vpr)
- [x] Android 版喜马拉雅文件格式 (.x2m/.x3m)
- [x] 咪咕音乐格式 (.mg3d)

### 其他特性

- [x] 在浏览器中解锁
- [x] 拖放文件
- [x] 批量解锁
- [x] 渐进式 Web 应用 (PWA)
- [x] 多线程
- [x] 写入和编辑元信息与专辑封面

## 使用方法

### 使用预构建版本

- 从 [Release] 或 [CI 构建][ci] 下载预构建的版本
  - :warning: 本地使用请下载`legacy版本`（`modern版本`只能通过 **http(s)协议** 访问）
- 解压缩后即可部署或本地使用（**请勿直接运行源代码**）

[release]: https://git.unlock-music.dev/um/web/releases/latest

### 自行构建

- 环境要求
  - nodejs (v22.x)
  - npm

1. 获取项目源代码后安装相关依赖：

   ```sh
   npm install
   npm ci
   ```

2. 然后进行构建：

   ```sh
   npm run build
   ```

   - 构建后的产物可以在 `dist` 目录找到。
   - 如果是用于开发，可以执行 `npm run serve`。

3. 如需构建浏览器扩展，构建成功后还需要执行：

   ```sh
   npm run make-extension
   ```
