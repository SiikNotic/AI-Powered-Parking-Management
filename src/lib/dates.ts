/** Converts between ISO strings and the value of an <input type="datetime-local"> (local time). */
export function toLocalInput(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromLocalInput(value: string): string {
  return new Date(value).toISOString()
}

/** Next quarter hour, `hoursAhead` from now. */
export function roundedFromNow(hoursAhead: number): string {
  const d = new Date(Date.now() + hoursAhead * 3_600_000)
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0)
  return d.toISOString()
}
