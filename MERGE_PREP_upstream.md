# 上游合并准备报告（upstream/develop @ 4.14.0）

> 生成时间：2026-10-22　分支：`dev`（HEAD `646a5dd4`）  
> 结论：**可以合并，文本冲突只有 4 个文件，但 i18n 架构发生了"静默破坏"，必须先做迁移，否则中文界面整体失效且 git 不会报错。**

---

## 1. 分叉现状

| 项        | 值                                                     |
| -------- | ----------------------------------------------------- |
| 合并基点     | `bdb3d99f`（upstream 更名 `Version bump` 前，版本 4.11.0 时代） |
| 我们独有提交   | 19 个（`dev ^upstream/develop`）                         |
| 上游新增提交   | 60 个（`upstream/develop ^dev`）                         |
| 上游当前版本   | **4.14.0**（原 4.11.0）                                  |
| 改动规模（上游） | 186 文件，+482 / −6830（大量删除来自 i18n 目录迁出）                 |
| 改动规模（我们） | 83 文件，+18297 / −618                                   |

### 上游值得注意的新增能力

- `Add QR code quick connect to web ui` + `Fix quick connect not correctly resetting`（登录页二维码快速连接，新依赖 `react-qr-code`）
- `Add adjustable player logo size`（`playerControlsLogoSize` 配置项）
- `Add option to use series thumbnail in continue watching`
- `update jassub`（2.5.7 → **2.5.21**）+ `Add adjustable player logo size` 同批次
- `Set tizen and webos target to support older TVs`（TV 端兼容性下调）
- **`Move localization to shared i18n repo`（破坏性：i18n 迁到 `@pelagica/i18n` npm 包）**
- 一大批 dependabot 依赖升级（axios 1.20、tanstack-query 5.104.2、dompurify 3.4.16、shadcn 4.21.4、prettier 3.9.10 等）

---

## 2. 真实冲突（git 会报的，只有 4 个）

| # | 文件                                               | 类型            | 处理方式                                                                                           |
| - | ------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------- |
| 1 | `frontend/src/pages/Player/PlayerControls.tsx`   | 内容冲突          | 以我们的控制栏为准，补入上游的 `import { cn } from '../../lib/utils'` 与 `playerControlsLogoSize` 三档 logo 尺寸逻辑 |
| 2 | `packages/core/src/i18n/locales/en/library.json` | modify/delete | **接受删除**，其中我们缺的 en key 迁移到本地覆盖层（见 §3）                                                          |
| 3 | `packages/core/src/i18n/supportedLanguages.ts`   | 内容冲突          | **直接取上游**：上游已内置 `CN` 国旗并从共享包读语言表，与我们的 `zh` 注册等价                                                |
| 4 | `pnpm-lock.yaml`                                 | 内容冲突          | 不手解，`pnpm install` 重新生成                                                                        |

已自动合并且抽查正常的文件：`frontend/package.json`、`TopBar.tsx`、`LoginPage.tsx`（我们的登录页样式 + 上游二维码共存）、`packages/core/src/index.ts`、`pnpm-workspace.yaml`。

---

## 3. 静默杀手：i18n 迁移（**这是本次合并的核心工作量**）

### 3.1 发生了什么

上游在 `c77cdf70` 把全部 `packages/core/src/i18n/locales/**` 删掉，改为从 `@pelagica/i18n` 包读取：

```ts
// upstream/develop: packages/core/src/i18n/index.ts
import { i18nextOptions } from '@pelagica/i18n';
i18n.init({ ...i18nextOptions, ... });
```

关键点：**这个 `index.ts` 在合并基点上我们和上游完全相同**（我们的 glob 加载器就是基点的原版），所以 git 会**静默采用上游版本，不报冲突**。

### 3.2 后果（git 不会告诉你的）

- 我们手写的中文全量翻译 `locales/zh/*.json`（8 个命名空间，约 600 个 key）会作为**孤儿文件留在仓库里，但不再被任何人加载** → 中文界面全部回落到上游机翻。
- 我们**未提交**的 12 个二开 key（`external_play` / `select_external_player` / `copy_stream_url` / `manual_copy_title` 等，写在 `locales/{zh,en}/item.json`）**目标目录已被上游删除** → 合并后这些 key 直接消失，外部播放器与"手动复制直链"弹窗会显示原始 key 字符串。
- 复数 key 格式断代：我们副本仍是旧式 `season_count` + `season_count_plural`，上游已迁到 i18next v4 的 `season_count_one` / `_other`。保留旧格式 → 单复数不区分。

### 3.3 共享包实测（`@pelagica/i18n@1.0.12`，上游要求 `^1.0.10`）

- 含 13 种语言、14 个命名空间，`exports` 暴露 `./locales/*`，**可以按需取单个 JSON**。
- 中文是上游机翻产物，**比我们的手写版差**，且存在缺 key：
  - `zh/login.quick_connect`、`zh/sidebar.quick_connect`（上游新功能自己都没翻译）
  - `zh/sidebar.shared_library`、`category_links`（我们的二开功能 key）
  - `zh/library.scan_library / scanning_library / scan_success / scan_failed`（我们的媒体库扫描功能 key）
- 我们的 key 在共享包中缺失统计：`zh/item` 36/163、`zh/settings` 12/140、`zh/home` 11/32、`zh/library` 6/15、`zh/sidebar` 5/27、`zh/login` 1/28、`zh/player` 1/13。

### 3.4 推荐方案：两层覆盖（包打底 + 本地覆盖）

不跟上游硬拼，也不丢我们的翻译：

```ts
// packages/core/src/i18n/index.ts 目标形态（示意）
import { i18nextOptions } from '@pelagica/i18n';
import { deepMergeResources } from './mergeResources';
import { localOverrides } from './overrides';  // 本地覆盖层

i18n.init({
  ...i18nextOptions,
  resources: deepMergeResources(i18nextOptions.resources, localOverrides),
  ...
});
```

覆盖层只放**我们真正需要的**：

- `overrides/zh/**`：中文精翻（**只保留 zh 一种语言**，de/es/fr/it/ja/pl/pt/ro/sv/tr/vi 等 11 种语言跟随上游，不再本地维护）
- `overrides/en+zh/custom.json`：二开自定义 key（外部播放器、直链复制、共享库、扫描、快捷链接等）
- 顺手补齐上游缺的中文（`quick_connect` 等）

代价：需要一次性把 zh 的 `_plural` 批量改成 `_other`（约 30 处，脚本可做），以及删除 `locales/` 下除 zh 以外的语言副本。收益：中文体验保持我们的精翻水准，上游新增 key 自动回落到上游值，不再每次合并都撞车。

---

## 4. 其他必须处理的问题

1. **工作区有未提交改动**（`ExternalPlayerButton.tsx`、`MediaInfoDialog.tsx`、`PlayerPage.tsx`、`item.json` ×2、`jellyfinUrls.ts`，新增 `ManualCopyDialog.tsx`、`utils/clipboard.ts`）。带脏工作区合并 = 冲突叠加，必须先收尾。
2. **`frontend/package-lock.json`（6332 行）不该存在**。仓库是 pnpm workspace，这个文件是我们的 ASS 字幕提交（`a1ae4fa8`）误入的，会误导后续安装与 code review，建议本次一并删除。
3. **jassub 2.5.7 → 2.5.21**：我们的 `VideoPlayer.tsx` + `useJellyfinFallbackFont.ts`（动态加载中文字体、移动端 WebGL 黑屏遮罩修复）依赖 jassub 内部行为，升级后必须实测 ASS 字幕。
4. `frontend/src/utils/jellyfinUrls.ts` 我们有 14 行改动，上游未动；但上游新增 `quickConnectUrl.ts`，注意别重复造 URL 拼接逻辑。

---

## 5. 建议执行顺序

1. **收尾 WIP**：先把 12 个自定义 key 从 `locales/*/item.json` 挪到覆盖层（现在挪，省掉合并后再挪一遍），提交。
2. 打备份分支：`git branch backup/dev-before-sync-20261022`
3. `git merge --no-commit upstream/develop`
4. 解 4 个冲突（按 §2 表格），`git rm` 掉 `frontend/package-lock.json`
5. i18n 重构（§3.4）：写 `mergeResources.ts` + `overrides/`，删多余语言副本，`_plural` → `_other`
6. `pnpm install` → 重新生成 `pnpm-lock.yaml`
7. `pnpm build` + 回归测试（见 §6）
8. 合并提交 + 推送 `dev`，同步 `main`

## 6. 回归清单

- [ ] 中文界面完整（首页/详情页/播放器/设置/侧栏）
- [ ] ASS 字幕渲染 + 中文字体加载 + 移动端 WebGL 不黑屏
- [ ] 外部播放器调用、复制直链、手动复制弹窗（12 个自定义 key 全部有译文）
- [ ] 媒体详情页行内播放 + 清晰度切换
- [ ] 上游新功能：登录页二维码快速连接、播放器 logo 尺寸、继续观看剧集缩略图
- [ ] 共享库 / 快捷链接 / 媒体库扫描（我们的二开模块）
- [ ] TV 端（tizen/webos）构建

---

## 7. 待你确认的决策

| # | 决策点                               | 推荐                                |
| - | --------------------------------- | --------------------------------- |
| 1 | 中文翻译：本地精翻覆盖 vs 直接用上游机翻            | **本地精翻覆盖**（中文是你二开的主要用户面，机翻质量不可接受） |
| 2 | 非中文语言（11 种）是否继续本地维护副本             | **不维护**，跟随上游，减少每次合并的冲突面           |
| 3 | `frontend/package-lock.json` 是否删除 | **删除**，改用 pnpm 单一锁文件              |
| 4 | WIP 改动先提交还是先挪覆盖层                  | **先挪覆盖层再提交**，一次到位                 |
