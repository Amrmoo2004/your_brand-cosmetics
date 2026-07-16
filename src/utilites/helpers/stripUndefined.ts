/**
 * Removes keys with `undefined` values from an object.
 * Required because `exactOptionalPropertyTypes` in tsconfig
 * makes Mongoose reject `{ key: undefined }` on `.create()`.
 */
export const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const result = {} as any;
  for (const key of Object.keys(obj)) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result as T;
};
