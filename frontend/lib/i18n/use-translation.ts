"use client";

import * as React from "react";
import { apiPatch } from "@/lib/api/client";
import { en } from "@/lib/i18n/locales/en";
import { sq } from "@/lib/i18n/locales/sq";
import { resolveLocale, translate, type Locale } from "@/lib/i18n";
import { useSessionStore } from "@/lib/store/session";

const DICTS = { en, sq };

export function useTranslation() {
  const user = useSessionStore((s) => s.user);
  const setSession = useSessionStore((s) => s.setSession);
  const token = useSessionStore((s) => s.token);
  const [locale, setLocaleState] = React.useState<Locale>(resolveLocale(user?.locale));

  React.useEffect(() => {
    setLocaleState(resolveLocale(user?.locale));
  }, [user?.locale]);

  const setLocale = React.useCallback(
    async (next: Locale) => {
      setLocaleState(next);
      const apiLocale = next === "sq" ? "sq-AL" : "en";
      if (user && token) {
        try {
          await apiPatch("/me/locale", { locale: apiLocale });
          setSession(token, { ...user, locale: apiLocale });
        } catch {
          // keep local locale even if API fails
        }
      }
    },
    [setSession, token, user]
  );

  const t = React.useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(DICTS[locale] as never, key, params),
    [locale]
  );

  return { t, locale, setLocale };
}
