# Third-Party Notices

This project redistributes third-party binaries and model packages. Their
licenses remain with their original authors.

## Bundled Runtime Components

1. `FFmpeg / FFprobe`
- Upstream: https://ffmpeg.org/
- Binary source used in this project: https://www.gyan.dev/ffmpeg/builds/
- Build repository: https://github.com/GyanD/codexffmpeg
- License: GPL-3.0-or-later (for the distributed full build)
- Notes: The bundled ffmpeg build reports `--enable-gpl --enable-version3`.
  See `resources/models/ffmpeg/NOTICE.txt` for source and redistribution notes.

2. `waifu2x-ncnn-vulkan`
- Upstream: https://github.com/nihui/waifu2x-ncnn-vulkan
- License: MIT
- Local license file: `resources/models/waifu2x-ncnn-vulkan/LICENSE`

3. `rife-ncnn-vulkan`
- Upstream: https://github.com/nihui/rife-ncnn-vulkan
- License: MIT
- Local license file: `resources/models/rife-ncnn-vulkan/LICENSE`

4. `ncnn` (dependency of waifu2x/rife binaries)
- Upstream: https://github.com/Tencent/ncnn
- License: BSD-3-Clause

## JavaScript / Rust Dependencies

Project dependencies are managed through:

- `package-lock.json` (Node ecosystem)
- `Cargo.lock` in `src-tauri` (Rust ecosystem, when generated)

Their respective licenses apply to each package/crate.
