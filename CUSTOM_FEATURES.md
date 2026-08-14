# Pelagica 用户功能清单 (CUSTOM_FEATURES.md)

本清单用于记录和复查 Pelagica 本地版本相较于官方上游（Upstream）所做出的定制化改动。在大版本合并或重构之后，应当重点核对这些功能是否完好。

> **PR 状态标注说明**：
> - `[已PR]` = 已向上游提交 Pull Request，合并上游后需确认是否被采纳
> - `[本地]` = 仅本地保留的深度定制，未提交 PR

---

## 1. 分享管理与共享库 (Share Management) `[本地]`

* **涉及文件**:
  * [`frontend/src/components/ShareDialog.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/components/ShareDialog.tsx) — 分享对话框
  * [`frontend/src/pages/SharedLibrary/SharedLibraryPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/SharedLibrary/SharedLibraryPage.tsx) — 共享库页面
  * [`frontend/src/components/TopBar.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/components/TopBar.tsx) — 顶栏共享库入口按钮
  * [`frontend/src/main.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/main.tsx) — 路由注册 `/shared-library`
* **功能说明**:
  * 支持用户在影片卡片或详情页通过"分享"对话框将视频分享给其他用户。
  * 提供专属的 **「共享库」** 页面（通过顶栏的双人小图标进入），包含 **「共享给我的」** 和 **「我分享的」** 两个管理面板，支持分页浏览、大数 ID 防精度丢失防失效，以及一键取消分享操作。
* **复查要点**:
  * 顶部水平导航栏是否有「共享库」按钮。
  * 进入共享库后，「共享给我的」和「我分享的」数据能否正常加载。
  * 点击"取消分享"是否提示成功，没有报"分享记录不存在"错误。

## 2. 媒体库文件夹视图与多模式切换 (Folder & List View) `[本地]`

* **涉及文件**:
  * [`frontend/src/pages/Library/LibraryPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Library/LibraryPage.tsx) — 文件夹导航 + 视图切换
  * [`frontend/src/pages/Library/LibraryItem.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Library/LibraryItem.tsx) — 卡片渲染（含上下文菜单）
  * [`frontend/src/hooks/api/useLibraryItems.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/hooks/api/useLibraryItems.ts) — 扩展 queryKey（sortOrder/recursive/includeItemTypes）
  * [`frontend/src/locales/zh/library.json`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/locales/zh/library.json) — 中文翻译
* **功能说明**:
  * 支持在媒体库中树状点击进入各级子文件夹，并修复了"返回上一级"历史栈死循环的 Bug。
  * 提供了 **「海报网格 (Poster)」**、**「横版网格 (Backdrop)」** 和 **「列表模式 (List)」** 三种视图切换按钮，且会记住用户的选择。
* **复查要点**:
  * 进入媒体库（Library）后，点击文件夹能正常深入，点击面包屑或返回按钮能正常退回。
  * 右上角是否有视图切换按钮组，切换为"列表模式"时卡片是否能正常渲染为单行列表。

## 3. 详情页唤起外部播放器 (External Player Launch) `[本地]`

* **涉及文件**:
  * [`frontend/src/components/ExternalPlayerButton.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/components/ExternalPlayerButton.tsx) — 外部播放器按钮
  * [`frontend/embyLaunchPotplayer.js`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/embyLaunchPotplayer.js) — PotPlayer 唤起脚本（718行）
  * 详情页文件（`MoviePage.tsx` / `EpisodePage.tsx`）— 按钮挂载点
* **功能说明**:
  * 在电影详情页和剧集详情页中，除了原生的网页播放器，额外提供一个 **「唤起外部播放器」** 按钮，支持一键调用本地的原生 Potplayer 或 VLC 等硬解播放器进行高画质播放。
* **复查要点**:
  * 随便进入一个电影或剧集详情页，检查在"播放"按钮旁是否有一个特殊的"外部播放"按钮。
  * 点击该按钮能否生成正确的流链接，并唤起 PotPlayer 脚本。

## 4. 封面图防挤压缩放与备用图逻辑 (Cover Ratio & Fallback) `[本地]`

* **涉及文件**:
  * [`frontend/src/pages/Home/BaseContinueRow.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Home/BaseContinueRow.tsx) — 继续观看行（大幅重构 389 行改动）
  * [`frontend/src/pages/Home/ItemsRow.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Home/ItemsRow.tsx) — 首页卡片行
  * [`frontend/src/pages/Home/MediaBar.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Home/MediaBar.tsx) — 媒体栏
  * [`frontend/src/utils/jellyfinUrls.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/utils/jellyfinUrls.ts) — 图片 URL 工具重构
  * 详情页封面优化部分 `[已PR]`，见第 8 条
* **功能说明**:
  * 优化了首页、继续观看、媒体库等各处卡片的封面比例渲染，**防止图片在拉伸或缩放时出现变形或裁切**。
  * 增加了"缩略图（Thumb）加载失败时自动使用背景图（Backdrop）或海报图（Primary）"的智能 fallback 逻辑，保证页面图片永远不留空白。
  * **详情页部分已提交 PR**（见第 8 条）：详情页封面改为根据图片真实宽高动态计算 `aspectRatio`，而非固定 2:3，避免非标准海报被裁切。
* **复查要点**:
  * 浏览首页和媒体库，检查海报或视频封面的长宽比是否端正，没有被上下或左右挤压变形。
  * 检查网络不畅或无图的视频，是否有背景图替代显示。

## 5. 卡片封面悬停播放按钮 (Hover Play Button) `[本地]`

* **涉及文件**:
  * `BaseContinueRow.tsx` / `ItemsRow.tsx` / `MediaBar.tsx` — 卡片悬停播放
  * 详情页封面播放按钮 `[已PR]`，见第 8 条
* **功能说明**:
  * 当用户在桌面端将鼠标悬停到任何电影或剧集的封面卡片上时，卡片中央会浮现出便捷的 **「播放 (Play)」图标按钮**，用户可以直接点击开始播放，而不需要先点进详情页再点击播放，缩短了操作链路。
  * **详情页封面播放按钮已提交 PR**（见第 8 条）：电影和剧集详情页的封面也可直接点击播放，悬停时显示半透明播放按钮。

## 6. 手动刷新媒体元数据 (Refresh Metadata) `[本地]`

* **涉及文件**:
  * [`frontend/src/hooks/api/useRefreshItemMetadata.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/hooks/api/useRefreshItemMetadata.ts) — 元数据刷新钩子
* **功能说明**:
  * 引入了"手动刷新元数据"的功能，在媒体库或影片管理界面中提供专属按钮，允许用户随时对指定的媒体文件手动向 Jellyfin 服务器发送"重新刮削、下载海报及元数据"的指令。
* **复查要点**:
  * 检查媒体库界面是否有"刷新元数据"相关的操作入口，触发后能否成功刷新。

## 7. 播放器增强体验 (Player Enhancements)

本条包含两大类播放器定制优化。**A 类已向上游提交 PR**（`fix/remove-duplicate-player-time` 分支），**B 类为仅本地保留的深度定制**。合并上游后两类均需核对。

### A. 播放控制 + 移动端 `[已PR被拒]`

* **涉及文件**:
  * [`frontend/src/pages/Player/PlayerControls.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Player/PlayerControls.tsx)
  * [`frontend/src/pages/Player/PlayerPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Player/PlayerPage.tsx)
  * [`frontend/src/pages/Player/VideoPlayer.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Player/VideoPlayer.tsx)
* **功能说明**:
  * **时间显示移位**: 将当前时间/总时长从播放/暂停按钮旁移至进度条下方两端显示，消除冗余。
  * **播放速度控制**: 控制栏新增速度下拉菜单，支持 0.5x ~ 2.0x 倍速切换，且切换流后保持倍速。
  * **音量控制优化**: 音量条改为悬停/触摸滑出式，收起时仅显示图标，展开后拖动调节；图标点击切换静音。
  * **duration 初始化优化**: 初始化时使用 `RunTimeTicks` 预设 duration，避免初始显示 0:00 闪烁；`markItemAsCompleted` 优先使用实际播放器时长。
  * **移动端全屏自动横屏**: 全屏时通过 Screen Orientation API 锁定横屏，不支持时回退到 CSS `rotate(90deg)` 旋转方案。
  * **多浏览器全屏 API 兼容**: 监听 `webkitfullscreenchange` / `mozfullscreenchange` / `MSFullscreenChange` 事件。
  * **iOS 内联播放**: `<video>` 标签添加 `playsInline` 和 `webkit-playsinline` 属性。
  * **屏蔽原生触摸控件**: `nativeControlsForTouch` 设为 `false`，统一使用自定义控件。
* **复查要点**:
  * 进度条下方左右两端是否显示当前时间和总时长。
  * 控制栏是否有倍速按钮，切换 1.5x 后跳到下一集是否保持 1.5x。
  * 鼠标悬停音量图标是否滑出音量条，移开后是否自动收起。
  * 手机端全屏播放时是否自动横屏，退出全屏是否恢复竖屏。

### B. 视频体验深度定制 `[本地]`

* **涉及文件**:
  * [`frontend/src/pages/Player/VideoPlayer.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Player/VideoPlayer.tsx) — 硬解指示器 + 字幕清理 + 字幕样式
  * [`frontend/src/pages/Player/PlayerPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Player/PlayerPage.tsx) — STRM 直流播放
  * [`frontend/src/utils/jellyfinUrls.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/utils/jellyfinUrls.ts) — `getStaticStreamUrl` 函数 + mkv 容器支持
  * [`frontend/src/hooks/api/usePlaybackInfo.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/hooks/api/usePlaybackInfo.ts) — 扩展容器/编解码支持
  * [`frontend/src/hooks/api/useMediaSegments.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/hooks/api/useMediaSegments.ts) — 媒体分段请求错误兜底
* **功能说明**:
  * **硬解/软解指示器**: 播放器右上角显示绿色 `HW`（硬解）或橙色 `SW`（软解）标识，通过 `navigator.mediaCapabilities` API 探测。
  * **字幕大括号样式标记清理**: 自动剥离字幕中的 `{\fn...}` 等大括号包裹的样式标记。
  * **自定义字幕样式**: 透明背景 + 洋红色（`#ff00ff`）描边 + 黑色深邃阴影 + 微软雅黑字体（仅本地保留，PR 中改为通用黑色描边）。
  * **STRM 直流播放**: 检测到 `.strm` 文件时直接使用 `/Videos/{id}/stream?Static=true` 直流 URL，绕过转码。
  * **扩展媒体格式支持**: 直播播放容器新增 `mkv` / `m4v` / `mov`；音频编解码新增 `ac3` / `eac3` / `dts` / `truehd`。
  * **媒体分段请求容错**: `useMediaSegments` 的 `queryFn` 添加 try-catch，请求失败时返回空数组而非抛错。
* **复查要点**:
  * 播放视频时右上角是否出现 HW/SW 指示器。
  * 字幕是否无大括号标记残留，样式是否为洋红描边（本地）或黑色描边（PR 版）。
  * 播放 `.strm` 文件是否能正常播放（不走转码）。
  * 播放 mkv / ac3 等格式是否正常直通。
  * 媒体分段接口异常时播放器是否不崩溃。

## 8. 详情页返回按钮与封面增强 (Detail Page Back Button & Cover Enhancements) `[已PR]`

**已向上游提交 PR**（`feature/detail-page-back-button-cover-play` 分支），基于 `upstream/main` 创建，仅包含以下三个功能的干净改动，不含外部播放器、分享等本地定制。

* **涉及文件**:
  * [`frontend/src/pages/Item/ItemBackButton.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/ItemBackButton.tsx) — 新增返回按钮组件
  * [`frontend/src/pages/Item/ItemPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/ItemPage.tsx) — 智能返回导航逻辑 + 向子页面传 `onBack`
  * [`frontend/src/pages/Item/MoviePage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/MoviePage.tsx) — 返回按钮 + 封面播放按钮 + 封面大小优化
  * [`frontend/src/pages/Item/EpisodePage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/EpisodePage.tsx) — 返回按钮 + 封面播放按钮
  * [`frontend/src/pages/Item/SeriesPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/SeriesPage.tsx) — 返回按钮 + 封面大小优化
  * [`frontend/src/pages/Item/SeasonPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/SeasonPage.tsx) — 返回按钮 + 封面大小优化
  * [`frontend/src/pages/Item/BoxSetPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Item/BoxSetPage.tsx) — 返回按钮 + 封面大小优化
* **功能说明**:
  * **详情页返回按钮**: 在所有详情页（电影、剧集、季、合集、单集）封面左上角添加浮层返回按钮。点击后优先使用浏览器历史后退；无历史时根据 item 类型智能回退到上级页面（如单集→季→剧集→库）。
  * **详情页封面播放按钮**: 电影和剧集详情页的封面可整体点击跳转播放，悬停时封面中央显示半透明圆形播放图标。
  * **详情页封面大小优化**: 封面容器改为根据图片真实宽高（`naturalWidth / naturalHeight`）动态计算 `aspectRatio`，替代原先固定的 2:3 比例，避免非标准海报被裁切或拉伸。同时放大了封面尺寸上限以利用大屏空间。
* **复查要点**:
  * 进入任意详情页，封面左上角是否有返回按钮，点击能否正确返回上级。
  * 电影/剧集详情页封面是否可点击播放，悬停是否出现播放按钮。
  * 非标准宽高比的海报是否不被裁切或拉伸。

## 9. 中文完整本地化 (Chinese Localization) `[本地]`

* **涉及文件**:
  * `frontend/src/locales/zh/common.json` — 公共翻译（4 条）
  * `frontend/src/locales/zh/home.json` — 首页翻译（34 条）
  * `frontend/src/locales/zh/item.json` — 详情页翻译（165 条）
  * `frontend/src/locales/zh/library.json` — 媒体库翻译（17 条）
  * `frontend/src/locales/zh/login.json` — 登录页翻译（30 条）
  * `frontend/src/locales/zh/player.json` — 播放器翻译（15 条）
  * `frontend/src/locales/zh/search.json` — 搜索翻译（19 条）
  * `frontend/src/locales/zh/settings.json` — 设置页翻译（142 条）
  * `frontend/src/locales/zh/sidebar.json` — 侧边栏翻译（29 条）
  * `frontend/src/locales/zh/themebrowser.json` — 主题浏览器翻译（8 条）
* **功能说明**:
  * 为整个前端添加了完整的中文（zh）翻译文件，覆盖所有页面和功能模块，共计约 463 条翻译条目。
  * 上游仅包含 en/de/fr/ja/pt/sv 等语言，中文为本地独有。
* **复查要点**:
  * 切换语言到中文，检查各页面是否都有中文显示，没有英文残留。
  * 合并上游后如果上游新增了 i18n key，需要同步在 `zh/` 目录下补充对应翻译。

## 10. 登录页分立 IP/端口输入 (Split IP & Port Login) `[本地]`

* **涉及文件**:
  * [`frontend/src/pages/Login/LoginPage.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/pages/Login/LoginPage.tsx) — 分立输入框 + 自动填入浏览器 IP
* **功能说明**:
  * 将原来的单个服务器地址输入框拆分为 **IP 地址** 和 **端口** 两个独立输入框，更符合国内用户的使用习惯。
  * 开发环境下自动填入当前浏览器的 IP 地址，减少手动输入。
  * 不自动连接，需用户手动点击确认。
* **复查要点**:
  * 登录页是否有两个独立输入框（IP + 端口），而非一个地址栏。
  * 开发环境下 IP 输入框是否自动填入当前浏览器 IP。

## 11. 标题/文件名显示模式切换 (Title Display Mode) `[本地]`

* **涉及文件**:
  * [`frontend/src/hooks/useTitleDisplayMode.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/hooks/useTitleDisplayMode.ts) — 新增 Hook（65 行）
* **功能说明**:
  * 新增 `useTitleDisplayMode` Hook，支持在"显示标题"和"显示文件名"之间切换。
  * 使用 `localStorage` 持久化用户选择，默认为显示文件名。
  * 通过自定义事件 `titleDisplayModeChanged` 实现同窗口多组件间的即时状态同步。
* **复查要点**:
  * 媒体库卡片是否默认显示文件名而非标题。
  * 切换显示模式后是否立即生效且刷新后保持。

## 12. 统计同意弹窗优化 (Stats Consent Modal Fix) `[本地]`

* **涉及文件**:
  * [`frontend/src/components/StatsConsentModal.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/components/StatsConsentModal.tsx)
  * [`backend/collector/collector.go`](file:///d:/Users/Documents/1/emby2openlist/pelagica/backend/collector/collector.go) — 后端 consent 文件路径兜底
* **功能说明**:
  * 统计同意弹窗改为：点击选择后立即关闭弹窗（`dismissed` 状态），即使 API 请求失败也不阻塞。
  * 移除了原先的"禁止点击外部关闭"和"禁止 ESC 关闭"限制。
  * 后端 `collector.go` 为 `COLLECTOR_INSTANCE_ID_FILE` 和 `COLLECTOR_STATS_CONSENT_FILE` 添加了默认路径兜底逻辑（优先 `/config/` 目录）。
* **复查要点**:
  * 首次使用时统计同意弹窗是否出现，点击选择后是否立即关闭。
  * API 请求失败时弹窗是否也能正常关闭。

## 13. 调试与开发体验优化 (Dev Experience) `[本地]`

* **涉及文件**:
  * [`frontend/src/main.tsx`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/main.tsx) — QueryClient 默认配置
  * [`frontend/src/utils/authErrorHandler.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/src/utils/authErrorHandler.ts) — 重试策略
  * [`frontend/vite.config.ts`](file:///d:/Users/Documents/1/emby2openlist/pelagica/frontend/vite.config.ts) — 开发服务器 host
  * [`dev.sh`](file:///d:/Users/Documents/1/emby2openlist/pelagica/dev.sh) — 开发启动脚本
  * [`config.schema.json`](file:///d:/Users/Documents/1/emby2openlist/pelagica/config.schema.json) — 配置 schema（883 行新增）
* **功能说明**:
  * **QueryClient 配置**: 开发模式下关闭自动重试（`retry: false`），生产模式重试 1 次；全局关闭窗口聚焦时的重新请求（`refetchOnWindowFocus: false`）。
  * **认证错误重试**: 开发模式下不重试（`return false`），生产模式重试次数从 3 降为 2。
  * **Vite 服务器**: 开发服务器监听 `0.0.0.0`（允许局域网访问）。
  * **dev.sh**: 一键启动前后端开发服务器的脚本。
  * **config.schema.json**: 新增大量配置项 schema 定义，供设置页面动态渲染。
* **复查要点**:
  * 开发模式下 API 失败是否不自动重试。
  * 局域网其他设备是否能访问开发服务器。
  * 设置页面各项配置是否正常显示和保存。

---

## 合并上游时的快速核对清单

1. `git diff upstream/main..dev -- <文件路径>` — 随时查看任意文件的定制改动
2. 优先核对 `[本地]` 标记的功能（1-6、9-13 条），这些不会被上游 PR 覆盖
3. 再核对 `[已PR]` 标记的功能（第 7-A、8 条），确认上游是否已采纳
4. 如有冲突，逐文件查看本清单确认是否是二开功能，确认后保留自己的代码
