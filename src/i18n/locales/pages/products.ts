import type { DeepStringify } from '../types'

/** Strings for the Products page. */
const en = {
  title: 'Products',
  subtitle: 'Fresh, dried and packed products, supplies and their prices',
  new: 'New product',
  editTitle: 'Edit product',
  newTitle: 'New product',
  searchPlaceholder: 'Search by name or SKU…',
  category: 'Category',
  stats: { products: 'Products', mushroom: 'Mushroom products', supplies: 'Supplies', avgMargin: 'Average margin' },
  columns: { name: 'Product', sku: 'SKU', category: 'Category', species: 'Species', unit: 'Unit', cost: 'Cost', price: 'Price', margin: 'Margin', stock: 'On hand', reorder: 'Reorder at' },
  fields: {
    name: 'Name',
    sku: 'SKU',
    category: 'Category',
    species: 'Species',
    noSpecies: 'None (supply)',
    unit: 'Unit',
    unitWeight: 'Weight per unit (lb)',
    unitWeightHint: 'For packs and kits, so stock can be shown in pounds',
    cost: 'Unit cost ($)',
    price: 'Sale price ($)',
    priceHint: 'Leave 0 for supplies that are not sold',
    reorderPoint: 'Reorder point',
    location: 'Location',
    perishable: 'Perishable (tracks expiry)',
  },
  saved: 'Product saved',
  errors: { name: 'Enter a name', sku: 'Enter a SKU', numbers: 'Cost, price and reorder point must be 0 or more' },
}

const es: DeepStringify<typeof en> = {
  title: 'Productos',
  subtitle: 'Productos frescos, deshidratados, empacados, insumos y sus precios',
  new: 'Nuevo producto',
  editTitle: 'Editar producto',
  newTitle: 'Nuevo producto',
  searchPlaceholder: 'Buscar por nombre o SKU…',
  category: 'Categoría',
  stats: { products: 'Productos', mushroom: 'Productos de hongos', supplies: 'Insumos', avgMargin: 'Margen promedio' },
  columns: { name: 'Producto', sku: 'SKU', category: 'Categoría', species: 'Especie', unit: 'Unidad', cost: 'Costo', price: 'Precio', margin: 'Margen', stock: 'En stock', reorder: 'Reordenar en' },
  fields: {
    name: 'Nombre',
    sku: 'SKU',
    category: 'Categoría',
    species: 'Especie',
    noSpecies: 'Ninguna (insumo)',
    unit: 'Unidad',
    unitWeight: 'Peso por unidad (lb)',
    unitWeightHint: 'Para paquetes y kits, para mostrar el stock en libras',
    cost: 'Costo unitario ($)',
    price: 'Precio de venta ($)',
    priceHint: 'Deja 0 en insumos que no se venden',
    reorderPoint: 'Punto de reorden',
    location: 'Ubicación',
    perishable: 'Perecedero (controla vencimiento)',
  },
  saved: 'Producto guardado',
  errors: { name: 'Escribe un nombre', sku: 'Escribe un SKU', numbers: 'Costo, precio y punto de reorden deben ser 0 o más' },
}

export default { en, es }
