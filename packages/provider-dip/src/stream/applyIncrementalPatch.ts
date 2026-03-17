import type { IncrementalPatchFrame } from './types.js';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function ensureContainer(value: unknown, pathKeys: string[]): Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (isObject(value)) {
    return value;
  }

  const firstKey = pathKeys[0];
  return Number.isInteger(Number(firstKey)) ? [] : {};
}

export function applyIncrementalPatch(
  originalValue: unknown,
  patch: Omit<IncrementalPatchFrame, 'seqId'>
): unknown {
  const pathKeys = patch.key;
  const operation = patch.action;
  const newContent = patch.content;

  if (operation === 'end') {
    return originalValue;
  }

  if (pathKeys.length === 0) {
    if (operation === 'upsert') {
      return newContent;
    }

    if (operation === 'append') {
      return typeof originalValue === 'string' ? originalValue + String(newContent ?? '') : originalValue;
    }

    return originalValue;
  }

  const root = ensureContainer(originalValue, pathKeys);
  let cursor: Record<string, unknown> | unknown[] = root;

  for (let index = 0; index < pathKeys.length - 1; index += 1) {
    const key = pathKeys[index];
    const nextKey = pathKeys[index + 1];
    const targetIndex = Number(key);
    const shouldUseArray = Number.isInteger(Number(nextKey));

    if (Array.isArray(cursor) && Number.isInteger(targetIndex)) {
      const existing = cursor[targetIndex];
      if (existing === undefined || existing === null || typeof existing !== 'object') {
        cursor[targetIndex] = shouldUseArray ? [] : {};
      }
      cursor = cursor[targetIndex] as Record<string, unknown> | unknown[];
      continue;
    }

    const existing = (cursor as Record<string, unknown>)[key];
    if (existing === undefined || existing === null || typeof existing !== 'object') {
      (cursor as Record<string, unknown>)[key] = shouldUseArray ? [] : {};
    }
    cursor = (cursor as Record<string, unknown>)[key] as Record<string, unknown> | unknown[];
  }

  const lastKey = pathKeys[pathKeys.length - 1];
  const lastIndex = Number(lastKey);

  if (operation === 'remove') {
    if (Array.isArray(cursor) && Number.isInteger(lastIndex)) {
      delete cursor[lastIndex];
      return root;
    }

    delete (cursor as Record<string, unknown>)[lastKey];
    return root;
  }

  if (operation === 'append') {
    if (Array.isArray(cursor) && Number.isInteger(lastIndex)) {
      const existing = cursor[lastIndex];
      cursor[lastIndex] = typeof existing === 'string' ? existing + String(newContent ?? '') : newContent;
      return root;
    }

    const existing = (cursor as Record<string, unknown>)[lastKey];
    (cursor as Record<string, unknown>)[lastKey] =
      typeof existing === 'string' ? existing + String(newContent ?? '') : newContent;
    return root;
  }

  if (Array.isArray(cursor) && Number.isInteger(lastIndex)) {
    cursor[lastIndex] = newContent;
    return root;
  }

  (cursor as Record<string, unknown>)[lastKey] = newContent;
  return root;
}
