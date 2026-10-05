/** Same shape as T with every leaf typed as string (for translated copies). */
export type DeepStringify<T> = { [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]> }
