export const locales = ["en", "es", "pt-br", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const localeCookieName = "NEXT_LOCALE";
/** Independent locale cookie for the admin console. */
export const adminLocaleCookieName = "NEXT_LOCALE_ADMIN";
/** Request header set by the proxy to mark admin-area requests. */
export const localeAreaHeader = "x-locale-area";
export type LocaleArea = "site" | "admin";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  es: "Español",
  "pt-br": "Português (Brasil)",
  ar: "العربية",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "es" || value === "pt-br" || value === "ar";
}

export function localeDirection(locale: Locale) {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Small Accept-Language negotiator. It intentionally maps regional variants
 * (es-MX, pt-BR, ar-EG) onto the four supported locales.
 */
export function negotiateLocale(header: string | null | undefined): Locale {
  if (!header) return defaultLocale;

  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const quality = params.find((param) => param.trim().startsWith("q="));
      return {
        tag: tag.toLowerCase(),
        quality: quality ? Number.parseFloat(quality.split("=")[1]) : 1,
      };
    })
    .filter((entry) => Number.isFinite(entry.quality) && entry.quality > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === "pt-br" || tag === "pt" || tag.startsWith("pt-")) return "pt-br";
    if (tag === "es" || tag.startsWith("es-")) return "es";
    if (tag === "ar" || tag.startsWith("ar-")) return "ar";
    if (tag === "en" || tag.startsWith("en-")) return "en";
  }

  return defaultLocale;
}