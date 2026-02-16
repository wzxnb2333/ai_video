export type AppLanguage = 'zh-CN' | 'en-US'

export const DEFAULT_APP_LANGUAGE: AppLanguage = 'zh-CN'

export const isAppLanguage = (value: unknown): value is AppLanguage => {
  return value === 'zh-CN' || value === 'en-US'
}

export const t = (language: AppLanguage, zhCN: string, enUS: string): string => {
  return language === 'en-US' ? enUS : zhCN
}
