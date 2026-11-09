// Link-in-bio page themes. Each preset is a complete look: page palette, the
// ambient backdrop drawn behind the content, the typography, the optional card
// behind the profile, and the shape/finish of the link buttons. Kept free of
// server imports so the dashboard editor's live preview and the public page
// resolve the same colours and geometry.

import type { CSSProperties } from 'react'

export type BioButtonStyle = 'solid' | 'soft' | 'outline' | 'glass'

export type BioPalette = {
  background: string
  surface: string
  text: string
  muted: string
  border: string
  accent: string
  onAccent: string
}

/** An elevated surface behind the profile content, when a theme has one. */
export type BioCard = {
  background: string
  border: string
  shadow: string
  radius: number
  backdropFilter?: string
}

export type BioTheme = {
  id: string
  label: string
  palette: BioPalette
  /**
   * Background layers drawn over `palette.background`. Uses `--bio-accent` so
   * the glow follows a custom accent colour instead of the preset's own.
   */
  backdrop: string
  /** `background-size` for the backdrop; grid patterns need their own tile. */
  backdropSize?: string
  buttonStyle: BioButtonStyle
  /** Corner radius of the link buttons, in pixels. */
  buttonRadius: number
  /** Typography overrides; unset fields keep the app's default sans stack. */
  bodyFont?: string
  headingFont?: string
  headingWeight?: number
  headingLetterSpacing?: string
  headingTransform?: CSSProperties['textTransform']
  headingSize?: string
  headingShadow?: string
  /** Card treatment; themes without one keep the bare centered column. */
  card?: BioCard
  buttonBackground?: string
  buttonImage?: string
  buttonText?: string
  buttonBorder?: string
  buttonShadow?: string
  buttonFontWeight?: number
  buttonHover?: {
    background?: string
    border?: string
    shadow?: string
    transform?: string
    filter?: string
  }
}

const SANS =
  "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', serif"

export const BIO_THEME_DEFAULT = 'pulse'

export const BIO_THEMES: BioTheme[] = [
  {
    id: 'pulse',
    label: 'Pulse',
    palette: {
      background: '#0B0C09',
      surface: '#151614',
      text: '#F5F6F2',
      muted: '#A9ADA1',
      border: '#292A26',
      accent: '#D5FF2F',
      onAccent: '#171812',
    },
    backdrop:
      'radial-gradient(120% 90% at 50% -20%, color-mix(in srgb, var(--bio-accent) 22%, transparent), transparent 62%)',
    buttonStyle: 'solid',
    buttonRadius: 16,
  },
  {
    id: 'daylight',
    label: 'Daylight',
    palette: {
      background: '#F6F7F2',
      surface: '#FFFFFF',
      text: '#171812',
      muted: '#66685F',
      border: '#E3E5DA',
      accent: '#C9F72A',
      onAccent: '#171812',
    },
    backdrop:
      'radial-gradient(90% 60% at 100% 0%, color-mix(in srgb, var(--bio-accent) 42%, transparent), transparent 56%), radial-gradient(80% 60% at 0% 100%, color-mix(in srgb, var(--bio-accent) 22%, transparent), transparent 60%)',
    buttonStyle: 'solid',
    buttonRadius: 16,
  },
  {
    id: 'midnight',
    label: 'Midnight',
    palette: {
      background: '#070A14',
      surface: '#101527',
      text: '#F2F5FF',
      muted: '#9AA5C4',
      border: '#232A44',
      accent: '#7C9BFF',
      onAccent: '#0A0F22',
    },
    backdrop:
      'linear-gradient(180deg, rgba(13, 20, 44, 0.9), transparent 55%), radial-gradient(120% 80% at 50% -10%, color-mix(in srgb, var(--bio-accent) 30%, transparent), transparent 60%)',
    buttonStyle: 'soft',
    buttonRadius: 999,
  },
  {
    id: 'sunset',
    label: 'Sunset',
    palette: {
      background: '#1A0F0A',
      surface: '#241610',
      text: '#FFF3EC',
      muted: '#C6A797',
      border: '#3A2419',
      accent: '#FF8A3D',
      onAccent: '#1A0F0A',
    },
    backdrop:
      'radial-gradient(100% 70% at 50% 115%, color-mix(in srgb, var(--bio-accent) 32%, transparent), transparent 62%), linear-gradient(180deg, rgba(64, 26, 10, 0.55), transparent 60%)',
    buttonStyle: 'solid',
    buttonRadius: 18,
  },
  {
    id: 'forest',
    label: 'Forest',
    palette: {
      background: '#08120D',
      surface: '#0F1F16',
      text: '#EFFBF4',
      muted: '#94B7A6',
      border: '#1E3529',
      accent: '#6EE7A8',
      onAccent: '#06120B',
    },
    backdrop:
      'radial-gradient(110% 75% at 15% 0%, color-mix(in srgb, var(--bio-accent) 24%, transparent), transparent 58%), linear-gradient(170deg, rgba(12, 40, 26, 0.65), transparent 65%)',
    buttonStyle: 'outline',
    buttonRadius: 999,
  },
  {
    id: 'clean-minimal',
    label: 'Clean Minimal',
    palette: {
      background: '#F7F7F4',
      surface: '#FFFFFF',
      text: '#1B1B18',
      muted: '#6B6B66',
      border: '#E6E6E0',
      accent: '#20201C',
      onAccent: '#FFFFFF',
    },
    backdrop: 'none',
    buttonStyle: 'soft',
    buttonRadius: 12,
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 600,
    headingLetterSpacing: '-0.02em',
    card: {
      background: '#FFFFFF',
      border: '#ECECE6',
      shadow: '0 24px 60px -38px rgba(24, 24, 20, 0.45)',
      radius: 28,
    },
    buttonShadow: '0 1px 2px rgba(24, 24, 20, 0.06)',
    buttonHover: { background: '#F3F3EF', border: '#D9D9D2' },
  },
  {
    id: 'dark-mode',
    label: 'Dark Mode',
    palette: {
      background: '#0C0C0E',
      surface: '#17171B',
      text: '#F5F5F7',
      muted: '#A1A1AA',
      border: '#2A2A31',
      accent: '#D6D6DC',
      onAccent: '#101013',
    },
    backdrop: 'none',
    buttonStyle: 'soft',
    buttonRadius: 14,
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 600,
    headingLetterSpacing: '-0.02em',
    card: {
      background: '#17171B',
      border: '#2A2A31',
      shadow: '0 30px 80px -40px rgba(0, 0, 0, 0.9)',
      radius: 26,
    },
    buttonHover: { background: '#202027', border: '#3A3A44' },
  },
  {
    id: 'glass-card',
    label: 'Glass Card',
    palette: {
      background: '#0E1320',
      surface: '#171C2B',
      text: '#F8FAFF',
      muted: '#C3CCE0',
      border: 'rgba(255, 255, 255, 0.22)',
      accent: '#A5D8FF',
      onAccent: '#0A1220',
    },
    backdrop:
      'radial-gradient(60% 45% at 15% 10%, rgba(124, 155, 255, 0.55), transparent 62%), radial-gradient(55% 45% at 85% 18%, rgba(255, 122, 196, 0.42), transparent 62%), radial-gradient(70% 55% at 50% 100%, rgba(94, 234, 212, 0.35), transparent 68%)',
    buttonStyle: 'glass',
    buttonRadius: 16,
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 600,
    card: {
      background: 'rgba(255, 255, 255, 0.08)',
      border: 'rgba(255, 255, 255, 0.22)',
      shadow: '0 30px 80px -30px rgba(6, 10, 25, 0.8)',
      radius: 28,
      backdropFilter: 'blur(22px)',
    },
    buttonHover: {
      background: 'rgba(255, 255, 255, 0.16)',
      border: 'rgba(255, 255, 255, 0.35)',
    },
  },
  {
    id: 'neo-brutalist',
    label: 'Neo Brutalist',
    palette: {
      background: '#FFE14D',
      surface: '#FFFFFF',
      text: '#111111',
      muted: '#4B4B4B',
      border: '#111111',
      accent: '#111111',
      onAccent: '#FFFFFF',
    },
    backdrop: 'none',
    buttonStyle: 'soft',
    buttonRadius: 6,
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 800,
    headingLetterSpacing: '-0.02em',
    headingTransform: 'uppercase',
    card: {
      background: '#FFFFFF',
      border: '#111111',
      shadow: '10px 10px 0 #111111',
      radius: 10,
    },
    buttonShadow: '4px 4px 0 #111111',
    buttonFontWeight: 700,
    buttonHover: { shadow: '6px 6px 0 #111111', transform: 'translate(-1px, -1px) scale(1)' },
  },
  {
    id: 'luxury',
    label: 'Luxury',
    palette: {
      background: '#F4EDE1',
      surface: '#FBF7EF',
      text: '#2B2118',
      muted: '#776651',
      border: '#D9CBB8',
      accent: '#A67C3D',
      onAccent: '#FFFFFF',
    },
    backdrop: 'radial-gradient(90% 60% at 50% 0%, rgba(255, 250, 240, 0.9), transparent 70%)',
    buttonStyle: 'outline',
    buttonRadius: 4,
    bodyFont: SANS,
    headingFont: SERIF,
    headingWeight: 500,
    headingLetterSpacing: '0.01em',
    card: {
      background: '#FBF7EF',
      border: '#E4D8C6',
      shadow: '0 30px 60px -40px rgba(70, 50, 25, 0.35)',
      radius: 3,
    },
    buttonHover: { background: 'rgba(166, 124, 61, 0.10)' },
  },
  {
    id: 'cyber-neon',
    label: 'Cyber Neon',
    palette: {
      background: '#05060B',
      surface: '#0B0F1A',
      text: '#EAF6FF',
      muted: '#93A7C6',
      border: '#1B2B45',
      accent: '#39FF88',
      onAccent: '#04120A',
    },
    backdrop:
      'linear-gradient(rgba(57, 255, 136, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(57, 255, 136, 0.06) 1px, transparent 1px), radial-gradient(120% 80% at 50% -10%, rgba(124, 58, 237, 0.45), transparent 60%)',
    backdropSize: '36px 36px, 36px 36px, cover',
    buttonStyle: 'outline',
    buttonRadius: 10,
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 700,
    headingLetterSpacing: '0.14em',
    headingTransform: 'uppercase',
    headingShadow: '0 0 22px color-mix(in srgb, var(--bio-accent) 55%, transparent)',
    card: {
      background: '#080C16',
      border: 'color-mix(in srgb, var(--bio-accent) 45%, transparent)',
      shadow: '0 0 60px -12px color-mix(in srgb, var(--bio-accent) 40%, transparent)',
      radius: 20,
    },
    buttonShadow: '0 0 18px -2px color-mix(in srgb, var(--bio-accent) 45%, transparent)',
    buttonHover: {
      shadow: '0 0 26px 0 color-mix(in srgb, var(--bio-accent) 70%, transparent)',
    },
  },
  {
    id: 'pastel-soft',
    label: 'Pastel Soft',
    palette: {
      background: '#F3EDFF',
      surface: '#FFFFFF',
      text: '#3B2F55',
      muted: '#6A5C86',
      border: '#E4D9F7',
      accent: '#C084FC',
      onAccent: '#2A173F',
    },
    backdrop:
      'radial-gradient(60% 40% at 15% 0%, rgba(196, 132, 252, 0.35), transparent 62%), radial-gradient(55% 40% at 90% 100%, rgba(125, 211, 252, 0.35), transparent 62%)',
    buttonStyle: 'soft',
    buttonRadius: 999,
    buttonBackground: '#FBF6FF',
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 700,
    headingLetterSpacing: '-0.01em',
    card: {
      background: '#FFFFFF',
      border: '#EFE4FB',
      shadow: '0 24px 50px -30px rgba(114, 80, 160, 0.35)',
      radius: 30,
    },
    buttonShadow: '0 4px 12px -6px rgba(114, 80, 160, 0.35)',
    buttonHover: { background: '#F3E8FF', border: '#D8C2F5' },
  },
  {
    id: 'retro-vintage',
    label: 'Retro Vintage',
    palette: {
      background: '#F3E3C3',
      surface: '#FBF0D9',
      text: '#3A2A1A',
      muted: '#7A5F43',
      border: '#C9A876',
      accent: '#B5482A',
      onAccent: '#FFF6E5',
    },
    backdrop:
      'radial-gradient(120% 90% at 50% 0%, rgba(255, 248, 230, 0.75), transparent 62%), repeating-linear-gradient(0deg, rgba(90, 60, 30, 0.035) 0 1px, transparent 1px 4px)',
    buttonStyle: 'soft',
    buttonRadius: 4,
    bodyFont: SERIF,
    headingFont: SERIF,
    headingWeight: 700,
    headingLetterSpacing: '0.01em',
    card: {
      background: '#FBF0D9',
      border: '#C9A876',
      shadow: '8px 8px 0 rgba(90, 60, 30, 0.16)',
      radius: 6,
    },
    buttonShadow: '2px 2px 0 rgba(90, 60, 30, 0.18)',
    buttonHover: {
      background: '#F6E6C8',
      shadow: '3px 3px 0 rgba(90, 60, 30, 0.22)',
    },
  },
  {
    id: 'gradient-flow',
    label: 'Gradient Flow',
    palette: {
      background: '#111227',
      surface: '#1A1B3A',
      text: '#F7F7FF',
      muted: '#C0C1E4',
      border: 'rgba(255, 255, 255, 0.16)',
      accent: '#7DD3FC',
      onAccent: '#141024',
    },
    backdrop:
      'radial-gradient(55% 45% at 12% 8%, rgba(255, 99, 132, 0.5), transparent 62%), radial-gradient(50% 42% at 88% 12%, rgba(255, 193, 7, 0.42), transparent 62%), radial-gradient(65% 55% at 50% 100%, rgba(88, 101, 242, 0.6), transparent 68%)',
    buttonStyle: 'solid',
    buttonRadius: 16,
    buttonBackground: 'transparent',
    buttonImage: 'linear-gradient(135deg, #FDE68A 0%, #7DD3FC 50%, #C4B5FD 100%)',
    buttonText: '#141024',
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 700,
    headingLetterSpacing: '-0.02em',
    card: {
      background: 'rgba(17, 18, 39, 0.74)',
      border: 'rgba(255, 255, 255, 0.14)',
      shadow: '0 30px 80px -30px rgba(8, 8, 30, 0.9)',
      radius: 24,
      backdropFilter: 'blur(14px)',
    },
    buttonShadow: '0 12px 28px -16px rgba(253, 230, 138, 0.65)',
    buttonHover: { filter: 'brightness(1.06)', transform: 'translateY(-1px)' },
  },
  {
    id: 'organic-nature',
    label: 'Organic Nature',
    palette: {
      background: '#EDE7DA',
      surface: '#F7F3E8',
      text: '#2F382A',
      muted: '#6A7561',
      border: '#D5CDBA',
      accent: '#6F8F5F',
      onAccent: '#FBFAF4',
    },
    backdrop:
      'radial-gradient(55% 40% at 12% 0%, rgba(143, 168, 122, 0.45), transparent 62%), radial-gradient(45% 35% at 90% 8%, rgba(204, 178, 128, 0.35), transparent 62%), radial-gradient(60% 45% at 50% 105%, rgba(111, 143, 95, 0.28), transparent 66%)',
    buttonStyle: 'soft',
    buttonRadius: 22,
    buttonBackground: '#F1EBDD',
    bodyFont: SANS,
    headingFont: SERIF,
    headingWeight: 500,
    card: {
      background: '#F7F3E8',
      border: '#DCD3C0',
      shadow: '0 26px 60px -36px rgba(60, 70, 45, 0.45)',
      radius: 32,
    },
    buttonShadow: '0 4px 14px -8px rgba(60, 70, 45, 0.4)',
    buttonHover: { background: '#EAE3D2', border: '#C8BFA9' },
  },
  {
    id: 'y2k-glossy',
    label: 'Y2K Glossy',
    palette: {
      background: '#B9C2FF',
      surface: 'rgba(255, 255, 255, 0.45)',
      text: '#241B4A',
      muted: '#55477E',
      border: 'rgba(255, 255, 255, 0.65)',
      accent: '#7C3AED',
      onAccent: '#FFFFFF',
    },
    backdrop: 'linear-gradient(135deg, #C4B5FD 0%, #93C5FD 38%, #F0ABFC 72%, #A5F3FC 100%)',
    buttonStyle: 'soft',
    buttonRadius: 999,
    buttonBackground: 'rgba(255, 255, 255, 0.55)',
    buttonImage:
      'linear-gradient(180deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.45) 46%, rgba(196, 181, 253, 0.55) 100%)',
    bodyFont: SANS,
    headingFont: SANS,
    headingWeight: 800,
    headingLetterSpacing: '-0.02em',
    card: {
      background: 'rgba(255, 255, 255, 0.38)',
      border: 'rgba(255, 255, 255, 0.7)',
      shadow: '0 24px 60px -24px rgba(80, 50, 160, 0.45)',
      radius: 28,
      backdropFilter: 'blur(16px)',
    },
    buttonShadow:
      'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 10px 24px -12px rgba(60, 30, 140, 0.5)',
    buttonHover: {
      filter: 'brightness(1.04)',
      shadow:
        'inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 14px 30px -12px rgba(60, 30, 140, 0.6)',
    },
  },
  {
    id: 'editorial',
    label: 'Editorial',
    palette: {
      background: '#F4F3F0',
      surface: '#FAF9F6',
      text: '#151515',
      muted: '#6A6A66',
      border: '#D8D6D0',
      accent: '#151515',
      onAccent: '#FFFFFF',
    },
    backdrop: 'none',
    buttonStyle: 'soft',
    buttonRadius: 2,
    buttonBackground: 'transparent',
    bodyFont: SANS,
    headingFont: SERIF,
    headingWeight: 400,
    headingLetterSpacing: '-0.03em',
    headingSize: 'clamp(1.9rem, 6vw, 2.5rem)',
    card: {
      background: '#FAF9F6',
      border: '#E5E3DD',
      shadow: '0 18px 40px -34px rgba(20, 20, 20, 0.35)',
      radius: 2,
    },
    buttonHover: { background: '#EEECE6', border: '#C9C6BE' },
  },
]

export const BIO_THEME_IDS = BIO_THEMES.map((theme) => theme.id)

/** Accent presets offered next to the custom colour picker. */
export const BIO_ACCENT_PRESETS = [
  '#D5FF2F',
  '#FFB020',
  '#FF6B57',
  '#6BB8FF',
  '#A78BFA',
  '#5EEAD4',
]

export const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

export function isHexColor(value: string | null | undefined): value is string {
  return Boolean(value && HEX_COLOR_PATTERN.test(value))
}

/** Readable text colour for a solid accent fill, by relative luminance. */
export function textOnColor(hex: string): string {
  const value = hex.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(value.slice(offset, offset + 2), 16) / 255)
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
  return luminance > 0.55 ? '#171812' : '#FFFFFF'
}

export function resolveBioTheme(themeId: string | null | undefined): BioTheme {
  return BIO_THEMES.find((theme) => theme.id === themeId) ?? BIO_THEMES[0]
}

export function resolveBioPalette(
  themeId: string | null | undefined,
  accent: string | null | undefined,
): BioPalette {
  const theme = resolveBioTheme(themeId)
  if (!isHexColor(accent)) return theme.palette
  return { ...theme.palette, accent, onAccent: textOnColor(accent) }
}

export type BioButtonVisual = {
  backgroundColor: string
  backgroundImage?: string
  color: string
  borderColor: string
  borderRadius: number
  boxShadow?: string
  fontWeight?: number
}

/** How a link button is painted for a theme, with the creator's accent applied. */
export function bioButtonVisual(
  themeId: string | null | undefined,
  accent: string | null | undefined,
): BioButtonVisual {
  const theme = resolveBioTheme(themeId)
  const palette = resolveBioPalette(theme.id, accent)
  const base = {
    backgroundImage: theme.buttonImage,
    borderRadius: theme.buttonRadius,
    boxShadow: theme.buttonShadow,
    fontWeight: theme.buttonFontWeight,
  }
  if (theme.buttonStyle === 'glass') {
    return {
      ...base,
      backgroundColor: theme.buttonBackground ?? 'rgba(255, 255, 255, 0.12)',
      color: palette.text,
      borderColor: 'rgba(255, 255, 255, 0.24)',
    }
  }
  if (theme.buttonStyle === 'outline') {
    return {
      ...base,
      backgroundColor: theme.buttonBackground ?? 'transparent',
      color: theme.buttonText ?? palette.text,
      borderColor: theme.buttonBorder ?? palette.accent,
    }
  }
  if (theme.buttonStyle === 'soft') {
    return {
      ...base,
      backgroundColor: theme.buttonBackground ?? palette.surface,
      color: theme.buttonText ?? palette.text,
      borderColor: theme.buttonBorder ?? palette.border,
    }
  }
  return {
    ...base,
    backgroundColor: theme.buttonBackground ?? palette.accent,
    color: theme.buttonText ?? palette.onAccent,
    borderColor: theme.buttonBorder ?? 'transparent',
  }
}

/** Whether the preset's button finish actually takes the creator's accent. */
export function bioThemeButtonUsesAccent(themeId: string | null | undefined): boolean {
  const preset = bioButtonVisual(themeId, null)
  const custom = bioButtonVisual(themeId, '#FF00FF')
  return (
    preset.backgroundColor !== custom.backgroundColor ||
    preset.borderColor !== custom.borderColor ||
    preset.color !== custom.color
  )
}

/** CSS custom properties consumed by the `.bio-link` rules in globals.css. */
export function bioButtonCssVars(
  themeId: string | null | undefined,
  accent: string | null | undefined,
): CSSProperties {
  const theme = resolveBioTheme(themeId)
  const visual = bioButtonVisual(theme.id, accent)
  const hover = theme.buttonHover ?? {}
  return {
    '--bio-button-bg': visual.backgroundColor,
    '--bio-button-image': visual.backgroundImage ?? 'none',
    '--bio-button-text': visual.color,
    '--bio-button-border': visual.borderColor,
    '--bio-button-radius': `${visual.borderRadius}px`,
    '--bio-button-shadow': visual.boxShadow ?? 'none',
    '--bio-button-weight': String(visual.fontWeight ?? 600),
    '--bio-button-hover-bg': hover.background ?? visual.backgroundColor,
    '--bio-button-hover-border': hover.border ?? visual.borderColor,
    '--bio-button-hover-shadow': hover.shadow ?? visual.boxShadow ?? 'none',
    '--bio-button-hover-transform': hover.transform ?? 'scale(1.01)',
    '--bio-button-hover-filter': hover.filter ?? 'none',
  } as CSSProperties
}

export function bioCardStyle(card: BioCard | undefined): CSSProperties | undefined {
  if (!card) return undefined
  return {
    backgroundColor: card.background,
    borderColor: card.border,
    boxShadow: card.shadow,
    borderRadius: `${card.radius}px`,
    backdropFilter: card.backdropFilter,
    WebkitBackdropFilter: card.backdropFilter,
  }
}

export function bioHeadingStyle(theme: BioTheme): CSSProperties {
  return {
    fontFamily: theme.headingFont,
    fontWeight: theme.headingWeight,
    letterSpacing: theme.headingLetterSpacing,
    textTransform: theme.headingTransform,
    fontSize: theme.headingSize,
    textShadow: theme.headingShadow,
  }
}
