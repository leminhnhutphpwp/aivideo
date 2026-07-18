import vi from './vi';

const locales = { vi } as const;
type Locale = keyof typeof locales;

let currentLocale: Locale = 'vi';

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

type Messages = typeof vi;

export function t(path: string, params?: Record<string, string | number>): string {
  const keys = path.split('.');
  let value: any = locales[currentLocale];

  for (const key of keys) {
    if (value && typeof value === 'object' && key in value) {
      value = (value as any)[key];
    } else {
      return path;
    }
  }

  if (typeof value !== 'string') return path;
  if (!params) return value;

  return value.replace(/\{(\w+)\}/g, (_, key) =>
    params[key] !== undefined ? String(params[key]) : `{${key}}`
  );
}
