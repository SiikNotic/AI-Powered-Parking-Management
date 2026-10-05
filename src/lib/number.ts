/** Parses a numeric input value (accepts a decimal comma); empty → NaN. */
export const toNumber = (value: string) => (value.trim() === '' ? Number.NaN : Number(value.replace(',', '.')))
