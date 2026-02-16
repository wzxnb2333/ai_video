# AI Video (Tauri v2)

本项目是一个本地桌面端 AI 视频处理工具，基于 `Tauri v2 + React + TypeScript`，支持：

- AI 超分（waifu2x-ncnn-vulkan）
- AI 补帧（rife-ncnn-vulkan）
- 组合工作流（补帧 + 超分，自动顺序）
- GPU 检测、线程/Tile 预设、编码策略管理
- 中英文界面切换（设置后自动记忆）

## 1. 运行与构建

### 开发模式

```bash
npm install
npm run tauri dev
```

### 正式构建

```bash
npm run lint
npm run build
npm run tauri build
```

Tauri 配置已包含模型与 ffmpeg 资源打包：

- `src-tauri/tauri.conf.json`
- `"bundle.resources": ["../resources/models"]`

## 2. 目录说明

- `src/`: React + TypeScript 前端
- `src-tauri/`: Rust/Tauri 主进程
- `resources/models/`:
  - `ffmpeg/ffmpeg.exe`、`ffprobe.exe`
  - `waifu2x-ncnn-vulkan/*`
  - `rife-ncnn-vulkan/*`

## 3. 开源软件与链接

### 核心可执行与模型

1. FFmpeg / FFprobe
- 官方主页: https://ffmpeg.org/
- 法律说明: https://ffmpeg.org/legal.html
- 本项目使用的 Windows 构建来源: https://www.gyan.dev/ffmpeg/builds/
- 构建仓库: https://github.com/GyanD/codexffmpeg

2. waifu2x-ncnn-vulkan
- 仓库: https://github.com/nihui/waifu2x-ncnn-vulkan
- 协议: MIT
- 本地协议文件: `resources/models/waifu2x-ncnn-vulkan/LICENSE`

3. rife-ncnn-vulkan
- 仓库: https://github.com/nihui/rife-ncnn-vulkan
- 协议: MIT
- 本地协议文件: `resources/models/rife-ncnn-vulkan/LICENSE`

4. ncnn（waifu2x/rife 依赖）
- 仓库: https://github.com/Tencent/ncnn
- 协议: BSD-3-Clause

## 4. 协议与合规

### 本项目协议

本项目源代码采用：

- `GPL-3.0-or-later`

见根目录：`LICENSE`

### 第三方声明

第三方组件与协议说明见：

- `THIRD_PARTY_NOTICES.md`
- `resources/models/ffmpeg/NOTICE.txt`

说明：

- `waifu2x-ncnn-vulkan` 与 `rife-ncnn-vulkan` 的 MIT 协议文本已随包分发。
- 本项目分发的 FFmpeg 为 GPL enabled 构建（可通过 `ffmpeg -version` 中 `--enable-gpl --enable-version3` 确认），分发者需遵守对应许可证要求。

## 5. 功能摘要（v0.1.0）

- 超分 / 补帧 / 工作流三种任务类型
- 任务队列、取消、进度与错误详情
- 补帧与超分预设（含 `4:8:4`）
- GPU 手动检测（编号、显存、推荐参数）
- 通用编码设置（软编/硬编、编码器选择）
- 中英文语言切换并持久化

## 6. 发布流程（建议）

1. 代码检查

```bash
npm run lint
npm run build
```

2. 生成安装包

```bash
npm run tauri build
```

3. 产物目录（Windows）

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`（若启用）

