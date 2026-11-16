/** Colors, split and size for the two-tone brand name shown next to the logo. */
export type BrandNameStyle = {
  /** Color of the leading characters; '' = inherit. */
  color1: string
  /** Color of the remaining characters; '' = inherit. */
  color2: string
  /** Leading characters that take the first color; 0 = no split. */
  splitChars: number
  /** Size of the name as a percentage of the surface's own text size. */
  nameSize: number
}

export const BRAND_NAME_SPLIT_MAX = 40
export const BRAND_NAME_SIZE_MIN = 60
export const BRAND_NAME_SIZE_MAX = 160
export const BRAND_NAME_SIZE_DEFAULT = 100

export const DEFAULT_BRAND_NAME_STYLE: BrandNameStyle = {
  color1: '',
  color2: '',
  splitChars: 0,
  nameSize: BRAND_NAME_SIZE_DEFAULT,
}

/**
 * Splits a brand name after `splitChars` characters into the two colored parts.
 * The slider is authoritative even when the name contains spaces, so the split
 * can land mid-word or exactly on a separator (the space then stays in the
 * second part). Characters are counted as code points so an emoji or a
 * surrogate pair is never cut in half. 0, or the whole length, keeps the name
 * in one color.
 */
export function splitBrandName(
  name: string,
  splitChars: number,
): { first: string; second: string } {
  const text = name.trim()
  if (!text) return { first: '', second: '' }

  const characters = Array.from(text)
  const count = Math.max(0, Math.min(Math.floor(splitChars), characters.length))
  if (count === 0 || count === characters.length) {
    return { first: text, second: '' }
  }
  return {
    first: characters.slice(0, count).join(''),
    second: characters.slice(count).join(''),
  }
}
