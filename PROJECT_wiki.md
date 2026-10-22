# Pelagica 项目开发 Wiki (PROJECT_wiki.md)

本 Wiki 记录了 `pelagica` 项目的公共结构、核心改动、通用工具类以及分支规范。

---

## 1. Monorepo 体系与核心架构说明

上游近期完成了 Monorepo 模块化重构，代码库分为以下工作区包：

- **`packages/core` (`@pelagica/core`)**: 跨端公用核心库，包含 API、React Query Hooks、状态管理、国际化与工具函数。
  - **[`share.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/packages/core/src/api/share.ts)** [解耦新增]: 自定义媒体分享后端 API 封装，已直接整合进 `@pelagica/core` 统一导出。
- **`frontend` (`pelagica`)**: Web 客户端主项目。
- **`packages/tv-frontend` / `packages/tv-platform`**: 电视端专用前端与平台适配层。
- **`tizen`**: 三星 Tizen 客户端。
- **`webos`**: LG webOS 客户端。

---

## 2. 二开解耦模块与公共组件

- **`/frontend/src/features/player/`**: [解耦模块] 播放器增强手势与交互层
  - **[`usePlayerGestures.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/player/usePlayerGestures.ts)**: 独立封装的长按 3x 快进、左右半屏双击 ±30s 识别、触摸/鼠标状态机与定时器管理。
  - **[`PlayerGestureOverlay.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/player/PlayerGestureOverlay.tsx)**: 独立渲染快进徽章与跳转动画浮层组件。
- **`/frontend/src/features/folder-view/`**: [解耦模块] 媒体库文件夹下钻与智能封面反哺
  - **[`useFolderNavigation.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/folder-view/useFolderNavigation.ts)**: 纯 URL 驱动的文件夹导航路径栈与原子状态切换，消除分页竞态。
  - **[`useFolderCoverFeed.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/folder-view/useFolderCoverFeed.ts)**: 独立提取子视频封面与最短播放进度反哺给物理文件夹卡片。
  - **[`FolderBreadcrumbs.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/folder-view/FolderBreadcrumbs.tsx)**: 独立的面包屑层级导航组件。
  - **[`FolderVisuals.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/features/folder-view/FolderVisuals.tsx)**: 高精圆角黄色文件夹封套与微型指示角标组件。
- **`/frontend/src/components/`**: 基础 UI 组件目录
  - **[`ExternalPlayerButton.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ExternalPlayerButton.tsx)**: 用于唤起本地 Potplayer/VLC/IINA 播放器的通用按钮组件。
  - **[`ShareDialog.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ShareDialog.tsx)**: 媒体分享目标选择与提交弹窗。
  - **[`TopBar.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/TopBar.tsx)**: 顶部水平导航栏，包含“共享库”入口。
- **`/frontend/src/utils/`**: 通用工具函数目录
  - **[`clipboard.ts`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/utils/clipboard.ts)**: **统一剪贴板写入工具 `copyTextToClipboard(text): Promise<CopyOutcome>`**，返回三态 `'ok' | 'unverified' | 'failed'`。降级顺序：桌面端 Wails 原生 `Clipboard.SetText` → 安全上下文 `navigator.clipboard` → `document.execCommand('copy')`。**只有前两条能确认结果（`ok`）；`execCommand` 只能给 `unverified`**——它的返回值只代表「命令已调度」，明文 HTTP 下无法用 `readText()` 回读验证，实测存在返回 true 但系统剪贴板为空的情况。**调用方只有拿到 `ok` 才能弹「已成功复制」**，`unverified`/`failed` 必须走 `ManualCopyDialog`。
    - 明文 HTTP 局域网访问时 `navigator.clipboard` 为 undefined，禁止直接调用，必须走本工具。
    - `textarea` 兜底的三条硬约束：①不能加 `readonly`（iOS/WebView 上 `select()` 失效）；②不能 `display:none`/`visibility:hidden`/`z-index:-1`（会被静默丢弃）；③校验选区必须读 `selectionStart/selectionEnd`，`document.getSelection()` 对表单控件恒为空串。
    - 根治方案：部署 HTTPS 或使用 `localhost` 访问，恢复安全上下文后自动复制才真正可靠。
- **[`ManualCopyDialog.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/components/ManualCopyDialog.tsx)**: 自动复制失败时的兜底弹窗（展示原文 + 自动全选，用户 Ctrl/⌘+C 即可）。任何「复制到剪贴板」功能都应对接它，而不是只弹 `toast.error`。
- **`/frontend/src/pages/`**: 视图页面组件目录
  - **[`App.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/App.tsx)**: 根应用组件，已挂载 `/shared-library` 路由。
  - **[`SharedLibrary/SharedLibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/SharedLibrary/SharedLibraryPage.tsx)**: 共享库主管理页面，包括共享给我的、我分享的列表及分页管理。
  - **[`Library/LibraryPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Library/LibraryPage.tsx)** & **[`LibraryItem.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Library/LibraryItem.tsx)**: 支持海报/横幅/列表/文件夹 4 种视图切换及文件夹穿透下钻；内建**文件夹智能封面反哺**（自动拉取目录内视频的精美封面与最短进度作为文件夹封面，并悬浮微型角标）。
  - **[`Item/BaseMediaPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/BaseMediaPage.tsx)** / **[`MoviePage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/MoviePage.tsx)** / **[`EpisodePage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/EpisodePage.tsx)**: 详情页支持内嵌行内视频播放（Inline Video Player）与清晰度选择。
  - **[`Item/SeriesPage.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Item/SeriesPage.tsx)**: 兼容上游 `showSeasonsView` 与自定义剧季快速下拉筛选。
  - **[`Player/PlayerControls.tsx`](file:///Users/qian/Documents/code/emby2openlist/pelagica/frontend/src/pages/Player/PlayerControls.tsx)**: 零侵入主干结构，通过装配 `usePlayerGestures` 与 `PlayerGestureOverlay` 实现手势交互。

### 国际化（i18n）双层架构

上游自 4.12.0 起把全部翻译迁到独立 npm 包 **`@pelagica/i18n`**，并删除了仓库内的 `packages/core/src/i18n/locales/**`。
我们必须采用「**共享包打底 + 本地覆盖**」，不要再整份复制 13 种语言（那样每次合并都要手工解冲突）。

- **`packages/core/src/i18n/index.ts`**: 初始化入口。先取 `i18nextOptions`，再用 `deepMergeResources` 把本地覆盖层合并进去。
- **`packages/core/src/i18n/mergeResources.ts`**: 通用工具 `deepMergeResources(base, override)`。纯对象递归合并，叶子值后者整体替换，不修改入参。
- **`packages/core/src/i18n/overrides.ts`**: 覆盖层加载器，用 `import.meta.glob('./overrides/*/*.json', { eager: true })` 在构建期静态收集，运行时零请求。
- **`packages/core/src/i18n/overrides/<语言>/<命名空间>.json`**: 覆盖文件目录。约定：
  - `zh/**`：**中文精翻全量**（上游的中文是机翻，质量不可接受，所以整份保留我们的版本）。
  - `en/**`：**只放共享包缺失的 key**（二开功能文案 + 上游遗漏），其余跟随共享包，避免覆盖上游最新英文。
  - 其他 11 种语言（de/es/fr/it/ja/pl/pt/ro/sv/tr/vi）：**不本地维护**，完全跟随共享包。

**复数规则（i18next v4）**：新格式是 `key_one` / `key_other`，已废弃 `key_plural`。
覆盖层里凡是历史遗留的 `xxx_plural`，都额外补了一份 `xxx_other` 别名，两者并存不冲突。

**新增二开文案的流程**：往 `overrides/zh/<ns>.json` 和 `overrides/en/<ns>.json` 各加一条即可，不要动 `node_modules` 里的共享包。

---

## 3. 核心定制数据结构

### 共享记录数据模型 (ShareItem)

定义于 `packages/core/src/api/share.ts`：

```typescript
export interface ShareItem {
  id: string; // 共享记录大数 ID，前端必须作为 string 处理防精度溢出
  media_id: string; // 共享影片 ID
  media_name: string; // 共享影片名称
  owner_user_id: string; // 共享发起人 ID
  owner_username: string; // 共享发起人用户名
  target_user_id: string; // 共享接收人 ID
  target_username: string; // 共享接收人用户名
  created_at: string; // 分享时间 (YYYY-MM-DD HH:mm:ss)
  expire_at: string | null; // 过期时间
  status: number; // 状态码
}
```

---

## 4. 防丢失合并规范 (Merge Guide)

每次与上游合并后，请务必执行以下核对流程：

1. 运行 `pnpm -r build` 确保多包编译与类型检查 100% 通过。
2. 逐一验证二开核心功能点：
   - **手势交互**：长按 3x 快速播放、双击左右半屏 ±30s 动画指示。
   - **行内播放**：电影/单集详情页顶部无缝渲染内嵌播放器。
   - **共享系统**：顶栏「共享库」入口、分享弹窗创建及删除功能。
   - **外部播放器**：详情页「外部播放器」按钮（Potplayer/VLC/IINA 调用）、「复制播放直链」（走 `utils/clipboard.ts`，勿回退成裸 `navigator.clipboard`）。
   - **媒体库视图**：列表视图、网格视图与文件夹穿透下钻。
3. **合并后必须做 i18n 体检**（最容易静默失效的地方）：
   - `packages/core/src/i18n/locales/**` **不应再出现**。若合并后它又冒出来（modify/delete 冲突被误判为「保留」），说明覆盖层没生效，中文会整体回落成上游机翻。
   - 检查 `@pelagica/i18n` 的版本是否被上游 bump（`packages/core/package.json`），大版本变化可能调整命名空间或 key 名。
   - 合并后跑一次 key 审计：扫描源码里所有 `t('...')`，比对「共享包 + overrides」的合集，缺的补进 `overrides/en` 和 `overrides/zh`。上游改 key 名不会报编译错误，只会在界面上显示裸 key。
4. 依赖坑：升级 `jassub` 后必须实测 ASS 字幕与中文字体动态加载（见 `VideoPlayer.tsx` + `useJellyfinFallbackFont.ts`）。
5. 构建用的包管理器是 **pnpm**，仓库里不允许存在 `frontend/package-lock.json`。

---

## 4.1 本地开发常见故障

### `pnpm dev` 后页面全白 / 控制台全是模块加载报错，日志出现 `ENOENT ... .pnpm/@jellyfin+sdk@1.0.0_axios@1.19.0_.../lib/index.js`
**原因**：`pnpm install` 改动过 peer 依赖版本（本次是 axios 1.19 → 1.20），`@jellyfin/sdk` 在虚拟目录里的路径 hash 随之改变，但 Vite 的依赖预构建缓存 `frontend/node_modules/.vite` 仍指向旧路径，导致所有 import 链断裂。

**修复**（不用重装依赖）：
```bash
rm -rf frontend/node_modules/.vite node_modules/.vite
pnpm dev   # 或 frontend 目录下 npx vite
```
只要动过 `pnpm-lock.yaml`，删缓存是标准动作。

### 在当前沙箱环境跑 `pnpm install` 报 `EEXIST: symlink ... pnpm/store/v11/projects` 被拒
文件系统 shim 拦截了 pnpm 的项目注册软链。用 `env -u NODE_OPTIONS pnpm install` 绕过（需要提权）。

---

## 5. 最近同步记录

### 2026-10-22: 同步官方 upstream/develop (4.11.0 → 4.14.0)

- **合并范围**: dev 领先 19 提交 / 上游领先 60 提交，合并基点 `bdb3d99f`
- **备份分支**: `backup/dev-before-sync-20261022`（合并前状态）
- **文本冲突（仅 4 处）**:
  - `PlayerControls.tsx`：上游把顶部返回栏抽出并新增 `playerControlsLogoSize` 三档 Logo 尺寸。解法 = 保留我们的手势层（`PlayerGestureOverlay` + `gestureHandlers` 挂到全屏点击层），同时采用上游 `cn()` 版本的 Logo 尺寸逻辑；返回栏仍受 `!showInlineControls` 控制，行内播放不显示。
  - `i18n/supportedLanguages.ts`：直接取上游（已内置中文国旗 + 从共享包读语言表）。
  - `i18n/locales/en/{item,library}.json`：modify/delete，接受删除，key 迁入 `overrides/en`。
  - `pnpm-lock.yaml`：`pnpm install` 重新生成。
- **i18n 架构迁移（本次核心）**: 上游 `c77cdf70` 把翻译迁到 `@pelagica/i18n`，且 `i18n/index.ts` 与基点相同 → git 不报冲突但会静默丢中文。已落地「共享包打底 + `overrides/` 覆盖」两层方案，删除本地 `locales/` 全部副本，中文精翻与二开 key 全部迁入 `overrides/`。
- **顺手修复**: 删除误入的 `frontend/package-lock.json`（6332 行，仓库用 pnpm）；`.workbuddy/` 加入 `.gitignore`。
- **上游新功能**: 登录页二维码快速连接、播放器控制栏 Logo 尺寸、继续观看可用剧集缩略图、tizen/webos 兼容老 TV、jassub 2.5.7 → 2.5.21。
- **验证**: `tsc -b` 通过、`vite build` 通过、覆盖层文案确认已进入构建产物（`外部播放` / `共享库` 命中 i18n chunk）。
- **遗留**: `PlayerControls.tsx` 存在历史 ESLint 报错 `react-hooks/immutability`（`setIsPiP` 在 `useEffect` 中先于 `useState` 声明被引用，合并前即存在，不影响构建），待专门修。

### 2026-09-20: 同步官方 upstream/develop

- **合并提交**: `3a35c9a7`

- **二开保留与融合**:
  - 保留 `ItemPage.tsx` 智能上一级兜底路由导航 `handleBack`。
  - 保留 `VideoPlayer.tsx` 动态全屏 opacity 防黑屏逻辑与洋红描边字幕样式。
  - 保留并完成 `folder-view` 模块解耦重构，全工程通过 `pnpm -r build` 构建验证。
