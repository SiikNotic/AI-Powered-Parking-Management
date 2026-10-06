import type { DeepStringify } from '../types'

/** Strings for the Equipment page. */
const en = {
  title: 'Equipment',
  subtitle: 'Humidifiers, HVAC, coolers and scales — status and maintenance schedule',
  new: 'New equipment',
  newTitle: 'New equipment',
  editTitle: 'Edit equipment',
  searchPlaceholder: 'Search by name or serial…',
  stats: {
    operational: 'Operational',
    maintenanceDue: 'Maintenance due',
    offline: 'Offline',
    dueSoon: 'Service due in 7 days',
    dueSoonHint: '{count} overdue',
    ofTotal: 'of {total}',
  },
  filters: { kind: 'Type', status: 'Status', room: 'Room' },
  columns: { name: 'Equipment', kind: 'Type', room: 'Room', serial: 'Serial', status: 'Status', next: 'Next maintenance', actions: 'Actions' },
  overdue: 'Overdue {days} d',
  overdueToday: 'Due today',
  dueIn: 'In {days} d',
  markDone: 'Mark maintenance done',
  markDoneShort: 'Done',
  fields: { name: 'Name', kind: 'Type', room: 'Room', serial: 'Serial number', status: 'Status', next: 'Next maintenance' },
  complete: {
    title: 'Maintenance done',
    description: '{name} will be marked operational and the next service scheduled.',
    next: 'Next maintenance',
    nextHint: 'Defaults to 30 days from today',
    submit: 'Mark done',
    saved: 'Maintenance recorded',
  },
  saved: 'Equipment saved',
  errors: { name: 'Enter a name', room: 'Choose a room', date: 'Choose a valid date', future: 'Choose a date after today' },
}

const es: DeepStringify<typeof en> = {
  title: 'Equipos',
  subtitle: 'Humidificadores, climatización, cámaras de frío y básculas: estado y mantenimiento',
  new: 'Nuevo equipo',
  newTitle: 'Nuevo equipo',
  editTitle: 'Editar equipo',
  searchPlaceholder: 'Buscar por nombre o número de serie…',
  stats: {
    operational: 'Operativos',
    maintenanceDue: 'Mantenimiento pendiente',
    offline: 'Fuera de servicio',
    dueSoon: 'Servicio en 7 días',
    dueSoonHint: '{count} vencidos',
    ofTotal: 'de {total}',
  },
  filters: { kind: 'Tipo', status: 'Estado', room: 'Sala' },
  columns: { name: 'Equipo', kind: 'Tipo', room: 'Sala', serial: 'Serie', status: 'Estado', next: 'Próximo mantenimiento', actions: 'Acciones' },
  overdue: 'Vencido hace {days} d',
  overdueToday: 'Vence hoy',
  dueIn: 'En {days} d',
  markDone: 'Marcar mantenimiento hecho',
  markDoneShort: 'Hecho',
  fields: { name: 'Nombre', kind: 'Tipo', room: 'Sala', serial: 'Número de serie', status: 'Estado', next: 'Próximo mantenimiento' },
  complete: {
    title: 'Mantenimiento realizado',
    description: '{name} quedará operativo y se programará el próximo servicio.',
    next: 'Próximo mantenimiento',
    nextHint: 'Por defecto, 30 días a partir de hoy',
    submit: 'Marcar hecho',
    saved: 'Mantenimiento registrado',
  },
  saved: 'Equipo guardado',
  errors: { name: 'Escribe un nombre', room: 'Elige una sala', date: 'Elige una fecha válida', future: 'Elige una fecha posterior a hoy' },
}

export default { en, es }
