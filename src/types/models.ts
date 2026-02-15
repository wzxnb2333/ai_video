export interface UpscaleParams {
  scale: 2 | 3 | 4
  denoiseLevel: 0 | 1 | 2 | 3
  tileSize: number
  threadSpec: string
  gpuId: number
  model: string
  format: 'png' | 'jpg' | 'webp'
  customArgs: string[]
}

export interface InterpolateParams {
  multiplier: 2 | 3 | 4 | 8
  model: string
  gpuId: number
  uhd: boolean
  threadSpec: string
  customArgs: string[]
}

export interface UpscaleModelConfig {
  name: string
  displayName: string
  description: string
  supportedScales: number[]
  defaultScale: 2 | 3 | 4
}

export interface InterpolateModelConfig {
  name: string
  displayName: string
  description: string
  supportedMultipliers: number[]
  defaultMultiplier: 2 | 3 | 4 | 8
}

export const DEFAULT_UPSCALE_PARAMS: UpscaleParams = {
  scale: 2,
  denoiseLevel: 1,
  tileSize: 0,
  threadSpec: '',
  gpuId: -1,
  model: 'models-cunet',
  format: 'png',
  customArgs: [],
}

export const DEFAULT_INTERPOLATE_PARAMS: InterpolateParams = {
  multiplier: 2,
  model: 'rife-v4.6',
  gpuId: -1,
  uhd: false,
  threadSpec: '4:8:4',
  customArgs: [],
}

export const UPSCALE_MODELS: UpscaleModelConfig[] = [
  {
    name: 'models-cunet',
    displayName: 'CUnet (General Anime)',
    description: 'Balanced anime upscaling with effective denoising for compressed sources.',
    supportedScales: [2],
    defaultScale: 2,
  },
  {
    name: 'models-upconv_7_anime_style_art_rgb',
    displayName: 'Anime Style Art RGB',
    description: 'Optimized for anime illustrations, line art, and flat color regions.',
    supportedScales: [2, 3, 4],
    defaultScale: 2,
  },
  {
    name: 'models-upconv_7_photo',
    displayName: 'Photo Realistic',
    description: 'Sharper textures for live-action footage and photographic inputs.',
    supportedScales: [2, 3, 4],
    defaultScale: 2,
  },
]

export const INTERPOLATE_MODELS: InterpolateModelConfig[] = [
  {
    name: 'rife-v4.6',
    displayName: 'RIFE v4.6',
    description: 'Stable general-purpose interpolation with strong temporal consistency.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v4',
    displayName: 'RIFE v4',
    description: 'Fast and stable interpolation model for daily workloads.',
    supportedMultipliers: [2, 3, 4],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v3.1',
    displayName: 'RIFE v3.1',
    description: 'Good compatibility choice for mixed quality source videos.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v3.0',
    displayName: 'RIFE v3.0',
    description: 'Legacy stable model with balanced speed and quality.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v2.4',
    displayName: 'RIFE v2.4',
    description: 'Older model, useful for compatibility or low-end devices.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v2.3',
    displayName: 'RIFE v2.3',
    description: 'Legacy variant with conservative motion estimation.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-v2',
    displayName: 'RIFE v2',
    description: 'Classic version for baseline comparison and fallback.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife',
    displayName: 'RIFE (Default)',
    description: 'Default bundled model profile.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-anime',
    displayName: 'RIFE Anime',
    description: 'Optimized for anime and line-art motion interpolation.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-HD',
    displayName: 'RIFE HD',
    description: 'Tuned for high-definition sources with better detail retention.',
    supportedMultipliers: [2, 3, 4, 8],
    defaultMultiplier: 2,
  },
  {
    name: 'rife-UHD',
    displayName: 'RIFE UHD',
    description: 'Model profile for high-resolution and UHD pipelines.',
    supportedMultipliers: [2, 4, 8],
    defaultMultiplier: 2,
  },
]
