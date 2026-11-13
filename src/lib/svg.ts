const MAX_SVG_BYTES = 200 * 1024

/**
 * SVGs are uploaded as text, so they arrive with every capability an HTML
 * document has. Only inert artwork is accepted: markup that can run script,
 * pull in remote resources, or style itself from elsewhere is rejected outright
 * rather than repaired, because a stripped file no longer looks like the logo
 * the uploader intended.
 */
export function sanitizeSvg(bytes: Uint8Array): Uint8Array | null {
  if (bytes.byteLength > MAX_SVG_BYTES) return null
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
  if (!/^(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(text.trim())) return null

  const blocked = [
    /<\s*script\b/i,
    /<\s*foreignObject\b/i,
    /<\s*(iframe|embed|object|handler|set|animate|animateMotion|animateTransform)\b/i,
    /<\s*\?xml-stylesheet/i,
    /<!DOCTYPE/i,
    /<!ENTITY/i,
    /\son[a-z]+\s*=/i,
    /(?:href|src)\s*=\s*["']?\s*(?:https?:|\/\/|javascript:|data:text\/html)/i,
    /url\(\s*["']?\s*(?:https?:|\/\/)/i,
    /@import/i,
  ]
  if (blocked.some((pattern) => pattern.test(text))) return null

  return new TextEncoder().encode(text.trim())
}
