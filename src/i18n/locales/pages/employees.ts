import type { DeepStringify } from '../types'

/** Strings for the Employees page. */
const en = {
  title: 'Employees',
}

const es: DeepStringify<typeof en> = {
  title: 'Empleados',
}

export default { en, es }
