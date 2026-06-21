export type Locale = "en" | "sq";

export function resolveLocale(userLocale?: string | null): Locale {
  if (!userLocale) return "en";
  if (userLocale.startsWith("sq")) return "sq";
  return "en";
}

interface Dict {
  [key: string]: string | Dict;
}

function getPath(dict: Dict, key: string): string | undefined {
  const parts = key.split(".");
  let node: string | Dict | undefined = dict;
  for (const part of parts) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export function translate(
  dict: Dict,
  key: string,
  params?: Record<string, string | number>
): string {
  const template = getPath(dict, key) ?? key;
  if (!params) return template;
  return Object.entries(params).reduce(
    (text, [param, value]) => text.replaceAll(`{{${param}}}`, String(value)),
    template
  );
}
