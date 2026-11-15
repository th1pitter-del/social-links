/** Colors and split for the two-tone brand name shown next to the logo. */
export type BrandNameStyle = {
  /** First word (or the first N characters of a single-word name); '' = inherit. */
  color1: string
  /** Second word (or the rest of a single-word name); '' = inherit. */
  color2: string
  /** Characters of a single-word name that take the first color; 0 = none. */
  splitChars: number
}

export const BRAND_NAME_SPLIT_MAX = 40

export const DEFAULT_BRAND_NAME_STYLE: BrandNameStyle = {
  color1: '',
  color2: '',
  splitChars: 0,
}

/**
 * Splits a brand name into its two displayed parts. A name with whitespace is
 * split after the first word; a single word is split after `splitChars`
 * characters (0 keeps it whole). Characters are counted as code points so an
 * emoji or a surrogate pair is never cut in half.
 */
export function splitBrandName(
  name: string,
  splitChars: number,
): { first: string; second: string } {
  const text = name.trim()
  if (!text) return { first: '', second: '' }

  const firstSpace = text.search(/\s/)
  if (firstSpace !== -1) {
    return {
      first: text.slice(0, firstSpace),
      second: text.slice(firstSpace).trimStart(),
    }
  }

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

/** Joins the two edited parts into the single stored site-name string. */
export function composeBrandName(first: string, second: string): string {
  const tail = second.trimStart()
  return tail ? `${first.trimEnd()} ${tail}` : first
}
