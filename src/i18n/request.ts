import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";

import {
  adminLocaleCookieName,
  isLocale,
  localeAreaHeader,
  localeCookieName,
  negotiateLocale,
} from "./config";

/**
 * Resolves the request locale. The admin console and the public site each keep
 * their own locale selection: the proxy marks admin requests with the
 * `x-locale-area` header, and admin requests resolve `NEXT_LOCALE_ADMIN`
 * first, falling back to the site choice, then negotiation.
 */
export default getRequestConfig(async () => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const isAdminArea = headerList.get(localeAreaHeader) === "admin";

  const siteCookie = cookieStore.get(localeCookieName)?.value;
  const adminCookie = isAdminArea
    ? cookieStore.get(adminLocaleCookieName)?.value
    : undefined;

  const negotiated = negotiateLocale(headerList.get("accept-language"));
  const locale = isLocale(adminCookie)
    ? adminCookie
    : isLocale(siteCookie)
      ? siteCookie
      : negotiated;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
