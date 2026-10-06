import type { DeepStringify } from '../types'

/** Strings for the Production page. */
const en = {
  title: 'Production',
  subtitle: 'Pipeline, harvest forecast and how the plan is tracking',
  newBatch: 'New batch',
  viewBatches: 'All batches',
  stats: {
    active: 'Active batches',
    activeHint: '{count} ready to harvest',
    forecast: 'Expected this week',
    forecastHint: 'From active batches',
    efficiency: 'Yield efficiency',
    efficiencyHint: 'Harvested ÷ expected, completed batches',
    costPerLb: 'Cost per lb',
    costHint: 'Completed batches',
  },
  pipeline: {
    title: 'Pipeline by stage',
    subtitle: '{count} batches in progress',
    label: 'Batches per stage',
    closed: 'Closed',
  },
  plan: {
    title: 'Planned vs actual',
    subtitle: 'Net harvest per week against the expected yield of batches due that week',
    planned: 'Planned',
    actual: 'Actual',
    week: 'Week of {date}',
    label: 'Planned and actual harvest per week, in pounds',
    current: 'This week',
  },
  bySpecies: { title: 'By species', subtitle: 'Net harvest, last 30 days', empty: 'No harvests in the last 30 days.' },
  byRoom: { title: 'By room', subtitle: 'Net harvest, last 30 days', empty: 'No harvests in the last 30 days.' },
  species: {
    title: 'Species',
    subtitle: 'Growing parameters and current activity',
    growDays: 'Grow days',
    yield: 'Avg yield',
    active: 'Active',
    harvested30: 'Last 30 days',
    efficiency: 'Actual yield',
  },
}

const es: DeepStringify<typeof en> = {
  title: 'Producción',
  subtitle: 'Flujo de producción, pronóstico de cosecha y avance frente al plan',
  newBatch: 'Nuevo lote',
  viewBatches: 'Todos los lotes',
  stats: {
    active: 'Lotes activos',
    activeHint: '{count} listos para cosechar',
    forecast: 'Esperado esta semana',
    forecastHint: 'De los lotes activos',
    efficiency: 'Eficiencia de rendimiento',
    efficiencyHint: 'Cosechado ÷ esperado, lotes completados',
    costPerLb: 'Costo por lb',
    costHint: 'Lotes completados',
  },
  pipeline: {
    title: 'Flujo por etapa',
    subtitle: '{count} lotes en proceso',
    label: 'Lotes por etapa',
    closed: 'Cerrados',
  },
  plan: {
    title: 'Plan vs. real',
    subtitle: 'Cosecha neta por semana frente al rendimiento esperado de los lotes que vencen esa semana',
    planned: 'Plan',
    actual: 'Real',
    week: 'Semana del {date}',
    label: 'Cosecha planificada y real por semana, en libras',
    current: 'Esta semana',
  },
  bySpecies: { title: 'Por especie', subtitle: 'Cosecha neta, últimos 30 días', empty: 'Sin cosechas en los últimos 30 días.' },
  byRoom: { title: 'Por sala', subtitle: 'Cosecha neta, últimos 30 días', empty: 'Sin cosechas en los últimos 30 días.' },
  species: {
    title: 'Especies',
    subtitle: 'Parámetros de cultivo y actividad actual',
    growDays: 'Días de cultivo',
    yield: 'Rend. promedio',
    active: 'Activos',
    harvested30: 'Últimos 30 días',
    efficiency: 'Rend. real',
  },
}

export default { en, es }
