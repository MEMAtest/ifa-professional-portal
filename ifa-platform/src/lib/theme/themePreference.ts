export type ThemePreference = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'plannetic-theme'

function resolveTheme(theme: ThemePreference): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function applyThemePreference(theme: ThemePreference) {
  const root = document.documentElement
  const resolved = resolveTheme(theme)
  root.classList.toggle('dark', resolved === 'dark')
  root.dataset.theme = resolved
  root.dataset.themePreference = theme
}

export function persistThemePreference(theme: ThemePreference) {
  localStorage.setItem(THEME_STORAGE_KEY, theme)
  applyThemePreference(theme)
}

export function loadThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemePreference | null
  return stored ?? 'light'
}

export function initThemePreference() {
  const preference = loadThemePreference()
  applyThemePreference(preference)

  if (preference === 'system') {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyThemePreference('system')
    media.addEventListener?.('change', handler)
    return () => media.removeEventListener?.('change', handler)
  }

  return () => {}
}
