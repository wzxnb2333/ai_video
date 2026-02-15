# AI Video (Tauri v2)

本项目是一个本地桌面端 AI 视频处理工具，基于 `Tauri v2 + React + TypeScript`，主打离线、可控、可调参。

## 功能概览

- 视频超分辨率：`waifu2x-ncnn-vulkan`
- 视频补帧：`rife-ncnn-vulkan`
- 元数据读取：`ffprobe`
- 抽帧与编码：`ffmpeg`
- 队列执行：`pending -> processing -> completed/error/cancelled`
- GPU 检测：支持手动检查 GPU 编号、显存、推荐参数
- 参数记忆：核心设置统一持久化（本地 `localStorage`）

## 新增能力（近期）

- 自动 GPU 运行策略
  - `gpuId = -1` 自动选择设备
  - 超分 `tileSize = 0` 自动按显存推荐
  - 自动线程参数（可手动覆盖）
- 超分/补帧预设
  - 补帧新增线程预设（含 `4:8:4`）
  - 超分新增联动预设（Tile + 线程），支持一键设置 `4:8:4 + Tile 320`
- 编码通用设置
  - 支持软件/硬件编码切换
  - 软件编码器：`libx264` / `libx265`
  - 硬件编码器：`h264_nvenc` / `hevc_nvenc`
- 错误可视化增强
  - 模型缺失、路径失败会返回更明确的 Checked 路径信息

## 技术栈

- 前端：React 19、Vite 7、TypeScript、Tailwind CSS 4、Zustand
- 桌面容器：Tauri v2
- Tauri 插件：`@tauri-apps/plugin-shell`、`@tauri-apps/plugin-fs`、`@tauri-apps/plugin-dialog`

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式

```bash
npm run tauri dev
```

### 3. 生产构建

```bash
npm run build
npm run tauri build
```

## 目录结构

- `src/pages`：页面层（首页、超分、补帧、队列、设置）
- `src/components`：组件层（布局、参数面板、UI）
- `src/lib`
  - `ffmpeg.ts`：ffmpeg/ffprobe 调用与进度解析
  - `upscaler.ts`：waifu2x 调用、模型路径解析、线程策略
  - `interpolator.ts`：RIFE 调用、模型路径解析、线程策略
  - `gpu.ts`：GPU 设备检测、显存合并、推荐参数
  - `pipeline.ts`：处理流水线（抽帧 -> AI 处理 -> 编码）
- `src/stores`：Zustand 持久化设置与队列状态
- `src/types`：参数模型与任务类型
- `src-tauri`：Rust 主进程、权限能力、打包配置
- `resources/models`：模型与可执行文件资源

## 模型与资源布局

### waifu2x

- 可执行文件：`resources/models/waifu2x-ncnn-vulkan/waifu2x-ncnn-vulkan.exe`
- 模型目录示例：`resources/models/waifu2x-ncnn-vulkan/models-cunet`

### RIFE

- 可执行文件：`resources/models/rife-ncnn-vulkan/rife-ncnn-vulkan.exe`
- 模型目录示例：`resources/models/rife-ncnn-vulkan/rife-v4.6`

### ffmpeg / ffprobe

- `resources/models/ffmpeg/ffmpeg.exe`
- `resources/models/ffmpeg/ffprobe.exe`

## 参数记忆范围

以下设置默认会持久化并在重启后恢复：

- 超分参数：模型、倍率、降噪、Tile、线程、GPU、输出格式
- 补帧参数：模型、倍率、UHD、线程、GPU
- 编码参数：是否硬编、软编/硬编编码器
- 输出目录
- 主题

## 常见问题

### 1. `Interpolate model not found: rife-v4.6`

- 检查目录：`resources/models/rife-ncnn-vulkan/rife-v4.6`
- 至少应包含：`flownet.param`、`flownet.bin`（按模型版本可能还有其他文件）

### 2. 元数据读取失败 / `os error 3`

- 检查 `ffprobe.exe` 是否存在于 `resources/models/ffmpeg/`
- 确认应用运行于 Tauri 桌面环境（纯网页环境无法访问本地二进制）

### 3. GPU 占用不高（例如 40%-60%）

- 先在参数页点击“检查 GPU”确认设备编号
- 尝试线程预设：`4:8:4`（若稳定）
- 超分可提高 `Tile`，补帧可调整 `-j load:proc:save`

### 4. 编码阶段报输入帧不存在

- 通常是上游 AI 阶段未正确输出帧，先看队列中的错误详情
- 优先排查模型目录、GPU 参数、以及自定义参数冲突
