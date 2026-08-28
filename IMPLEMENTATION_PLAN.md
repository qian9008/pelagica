# 二开功能解耦与上游 (upstream/develop) 合并方案

## 1. 架构目标与解耦原则

为了解决当前及未来与上游频繁发生代码冲突的问题，我们将本地所有二次开发特性（行内播放、播放器手势/快进、分享系统、外部播放器、ASS字幕增强等）进行**模块化与组件化解耦**：

1. **零侵入/低侵入主干**：主干组件（如 `PlayerControls.tsx`, `MoviePage.tsx`, `SeriesPage.tsx`）仅保留最小化的装配点（如挂载独立组件或调用自定义 Hook），禁止在主干内部直接堆砌大量二开业务分支。
2. **对齐 Monorepo 规范**：遵循上游最新的 Monorepo 体系，通用 API 与 Hook 统一放入 `packages/core`。
3. **高内聚功能模块**：每个二开功能作为独立文件维护，便于未来单独升级、排查与维护。

---

## 2. 二开模块拆分与解耦设计

```
packages/core/src/
├── api/
│   └── share.ts                  # [解耦] 分享 API (对齐 @pelagica/core)
└── hooks/
    ├── useExternalPlayer.ts      # [解耦] 外部播放器调用 Hook
    └── ...

frontend/src/
├── features/ (或 components/custom/)
│   ├── player/
│   │   ├── usePlayerGestures.ts  # [解耦] 长按3x快进、双击±30s等手势状态与定时器
│   │   ├── PlayerGestureOverlay.tsx # [解耦] 快进徽章与双击跳转动画 UI 蒙层
│   │   └── InlinePlayerControls.tsx # [解耦] 详情页行内播放专属轻量控制栏
│   ├── inline-playback/
│   │   └── InlineVideoPlayer.tsx # [解耦] 行内播放器容器（隔离全屏播放页面逻辑）
│   ├── share/
│   │   ├── ShareMediaButton.tsx  # [解耦] 分享按钮及弹窗组件
│   │   └── ShareModal.tsx        # [解耦] 分享配置与链接生成弹窗
│   └── item/
│       └── ItemBackButton.tsx    # [解耦] 自定义详情页返回按钮
```

---

## 3. 具体冲突解决与改造步骤

### 第一阶段：解决 Core 基础层冲突并接入解耦 API
- 将 `frontend/src/api/share.ts` 规范化迁移至 `packages/core/src/api/share.ts`，并在 `packages/core/src/index.ts` 中统一导出。
- 解决 `packages/core/src/hooks/useLibraryItems.ts` 的查询参数顺序冲突。
- 统一使用根目录 lockfile，移除旧的 `frontend/pnpm-lock.yaml`。

### 第二阶段：播放器模块（PlayerControls & 增强功能）解耦
- **抽离手势逻辑**：新建 `usePlayerGestures.ts` 负责 pointerDown/Up/Move、长按 3x、双击判断。
- **抽离手势反馈**：新建 `PlayerGestureOverlay.tsx` 独立渲染 `3x 快进中` 与 `+30s / -30s` 动画。
- **抽离行内控制**：新建 `InlinePlayerControls.tsx` 避免污染全屏控制栏。
- **精简 `PlayerControls.tsx`**：采用上游最新结构，仅挂载上述解耦模块，消除庞大冲突。

### 第三阶段：媒体详情页（MoviePage / SeriesPage / SeasonPage）解耦
- 引入独立的 `<ShareMediaButton />`、`<InlineVideoPlayer />` 和 `<ItemBackButton />`。
- 在 `MoviePage.tsx` 和 `SeriesPage.tsx` 中保留上游新特性的同时，以声明式组件形式插入二开能力。

### 第四阶段：构建与功能验证
- 解决 `main.tsx` 和 `LoginPage.tsx` 的 Provider 包装冲突。
- 运行 `pnpm build` 或 TypeScript 类型检查，确保多包关联和新架构编译无误。
