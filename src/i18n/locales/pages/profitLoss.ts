import type { DeepStringify } from '../types'

/** Strings for the Profit & Loss page. */
const en = {
  title: 'Profit & Loss',
  subtitle: 'Revenue, cost of goods, operating expenses and margin, derived from your records',
  period: 'Period',
  periods: { thisMonth: 'This month', lastMonth: 'Last month', '30d': 'Last 30 days', '90d': 'Last 90 days', thisYear: 'This year' },
  comparing: '{current} compared with {previous}',
  stats: { revenue: 'Revenue', grossProfit: 'Gross profit', netProfit: 'Net profit', margin: 'Net margin', marginHint: 'Previous {value}', noRevenue: 'No revenue' },
  statement: {
    title: 'Statement',
    line: 'Line',
    current: 'This period',
    previous: 'Previous period',
    change: 'Change',
    revenue: 'Revenue',
    revenueHint: '{count} completed orders',
    cogs: 'Cost of goods sold',
    grossProfit: 'Gross profit',
    grossMargin: 'Gross margin {value}',
    opex: 'Operating expenses',
    totalOpex: 'Total operating expenses',
    netProfit: 'Net profit',
    netMargin: 'Net margin {value}',
    noOpex: 'No operating expenses in either period',
  },
  chart: { title: 'Revenue, expenses and profit', daily: 'Daily', weekly: 'Weekly', weekOf: 'Week of {date}', label: 'Revenue, expenses and profit per {bucket}', day: 'day', week: 'week' },
  byChannel: 'Revenue by channel',
  bySpecies: 'Revenue by species',
  topProducts: 'Top products',
  noSales: 'No completed sales in this period.',
  footnote:
    'Figures are derived from completed orders and recorded expenses — nothing is typed in. Revenue is net of discounts and excludes tax. Inventory purchases (substrate, spawn, packaging) are stocked first and reach the P&L through cost of goods sold when product is sold, so they are not counted twice. Corrections net against the original expense.',
  csv: { filename: 'profit-and-loss', line: 'Line', current: 'This period ({from} – {to})', previous: 'Previous period ({from} – {to})', change: 'Change (%)' },
  noAccess: { title: 'Profit & Loss is restricted', description: 'Only owners, farm managers and accounting can see the farm’s financial results.' },
}

const es: DeepStringify<typeof en> = {
  title: 'Pérdidas y ganancias',
  subtitle: 'Ingresos, costo de ventas, gastos operativos y margen, calculados con tus registros',
  period: 'Período',
  periods: { thisMonth: 'Este mes', lastMonth: 'Mes pasado', '30d': 'Últimos 30 días', '90d': 'Últimos 90 días', thisYear: 'Este año' },
  comparing: '{current} comparado con {previous}',
  stats: { revenue: 'Ingresos', grossProfit: 'Utilidad bruta', netProfit: 'Utilidad neta', margin: 'Margen neto', marginHint: 'Anterior {value}', noRevenue: 'Sin ingresos' },
  statement: {
    title: 'Estado de resultados',
    line: 'Concepto',
    current: 'Este período',
    previous: 'Período anterior',
    change: 'Cambio',
    revenue: 'Ingresos',
    revenueHint: '{count} pedidos completados',
    cogs: 'Costo de ventas',
    grossProfit: 'Utilidad bruta',
    grossMargin: 'Margen bruto {value}',
    opex: 'Gastos operativos',
    totalOpex: 'Total de gastos operativos',
    netProfit: 'Utilidad neta',
    netMargin: 'Margen neto {value}',
    noOpex: 'No hay gastos operativos en ninguno de los dos períodos',
  },
  chart: { title: 'Ingresos, gastos y utilidad', daily: 'Diario', weekly: 'Semanal', weekOf: 'Semana del {date}', label: 'Ingresos, gastos y utilidad por {bucket}', day: 'día', week: 'semana' },
  byChannel: 'Ingresos por canal',
  bySpecies: 'Ingresos por especie',
  topProducts: 'Productos más vendidos',
  noSales: 'No hay ventas completadas en este período.',
  footnote:
    'Las cifras se calculan con los pedidos completados y los gastos registrados: nada se escribe a mano. Los ingresos son netos de descuentos y sin impuestos. Las compras de inventario (sustrato, semilla, empaque) primero entran al stock y llegan al estado de resultados como costo de ventas cuando se vende el producto, para no contarlas dos veces. Las correcciones se compensan con el gasto original.',
  csv: { filename: 'perdidas-y-ganancias', line: 'Concepto', current: 'Este período ({from} – {to})', previous: 'Período anterior ({from} – {to})', change: 'Cambio (%)' },
  noAccess: { title: 'Pérdidas y ganancias es restringido', description: 'Solo dueños, encargados de granja y contabilidad pueden ver los resultados financieros de la granja.' },
}

export default { en, es }
