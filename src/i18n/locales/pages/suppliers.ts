import type { DeepStringify } from '../types'

/** Strings for the Suppliers page. */
const en = {
  title: 'Suppliers',
  subtitle: 'Who you buy substrate, spawn, packaging and services from — and how much',
  new: 'New supplier',
  newTitle: 'New supplier',
  editTitle: 'Edit supplier',
  searchPlaceholder: 'Search by name, email or phone…',
  stats: {
    suppliers: 'Suppliers',
    spent30: 'Spent · last 30 days',
    spent365: 'Spent · last 12 months',
    top: 'Top supplier · 12 months',
    none: 'No purchases yet',
  },
  columns: { name: 'Supplier', contact: 'Contact', spent30: 'Last 30 days', spent365: 'Last 12 months', purchases: 'Purchases', last: 'Last purchase' },
  fields: { name: 'Name', email: 'Email', phone: 'Phone' },
  never: 'Never',
  financeHidden: 'Spending figures are visible to owners, managers and accounting.',
  saved: 'Supplier saved',
  errors: { name: 'Enter a name', email: 'Enter a valid email', duplicate: 'A supplier with this name already exists' },
  drawer: {
    contact: 'Contact',
    history: 'Purchase history',
    noHistory: 'No expenses recorded for this supplier yet',
    correction: 'Correction',
    noContact: 'No contact details',
    matchHint: 'Includes expenses linked to this supplier or with the same vendor name.',
  },
}

const es: DeepStringify<typeof en> = {
  title: 'Proveedores',
  subtitle: 'A quién le compras sustrato, semilla, empaques y servicios, y cuánto',
  new: 'Nuevo proveedor',
  newTitle: 'Nuevo proveedor',
  editTitle: 'Editar proveedor',
  searchPlaceholder: 'Buscar por nombre, correo o teléfono…',
  stats: {
    suppliers: 'Proveedores',
    spent30: 'Gastado · últimos 30 días',
    spent365: 'Gastado · últimos 12 meses',
    top: 'Principal proveedor · 12 meses',
    none: 'Sin compras todavía',
  },
  columns: { name: 'Proveedor', contact: 'Contacto', spent30: 'Últimos 30 días', spent365: 'Últimos 12 meses', purchases: 'Compras', last: 'Última compra' },
  fields: { name: 'Nombre', email: 'Correo', phone: 'Teléfono' },
  never: 'Nunca',
  financeHidden: 'Las cifras de gasto solo las ven dueños, gerentes y contabilidad.',
  saved: 'Proveedor guardado',
  errors: { name: 'Escribe un nombre', email: 'Escribe un correo válido', duplicate: 'Ya existe un proveedor con ese nombre' },
  drawer: {
    contact: 'Contacto',
    history: 'Historial de compras',
    noHistory: 'Todavía no hay gastos registrados para este proveedor',
    correction: 'Corrección',
    noContact: 'Sin datos de contacto',
    matchHint: 'Incluye los gastos vinculados a este proveedor o con el mismo nombre de proveedor.',
  },
}

export default { en, es }
