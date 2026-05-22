export type RawRecord = Record<string, any>;

export function asArray(value: unknown): RawRecord[] {
  return Array.isArray(value) ? value : [];
}

export function money(value: unknown): string {
  if (value === null || value === undefined) {
    return "0";
  }

  return value.toString();
}

export function timestamp(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  const parsed = new Date(value as string);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toISOString();
}
