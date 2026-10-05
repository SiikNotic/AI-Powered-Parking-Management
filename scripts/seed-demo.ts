/**
 * Writes SQL that loads the generated demo farm into a Supabase project, so a
 * new project has realistic data to explore. Usage:
 *
 *   npm run seed:sql            → supabase/seed/out/*.sql (git-ignored)
 *
 * Run the files in order in the SQL editor (or `psql`). They insert a farm
 * named "Evergreen Mycology (demo)" and its history. Triggers are disabled
 * while seeding so history can be back-dated. Then add yourself as owner:
 *
 *   insert into farm_members (farm_id, user_id, role)
 *   values ('<farm id printed below>', '<your auth user id>', 'OWNER');
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { generateFarm } from '../src/data/demo/generate'
import { demoRows } from '../src/data/demo/toRows'

const FARM_ID = '0d6b8f3a-5c2e-4f7a-9e1b-3a4c5d6e7f80'
const OUT = process.argv[2] ?? 'supabase/seed/out'
const MAX_ROWS = 400

const data = generateFarm({ farm: { id: FARM_ID, name: 'Evergreen Mycology (demo)', location: 'Lancaster, PA', timezone: 'America/New_York' }, seed: 2026, scale: 1 })

type Value = string | number | boolean | null | undefined | object
const lit = (v: Value): string => {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
  return `'${v.replace(/'/g, "''")}'`
}

const files: string[] = []
let part = 0
function insert(table: string, rows: Record<string, Value>[]) {
  for (let i = 0; i < rows.length; i += MAX_ROWS) {
    const chunk = rows.slice(i, i + MAX_ROWS)
    if (!chunk.length) continue
    const cols = Object.keys(chunk[0])
    const values = chunk.map((r) => `(${cols.map((c) => lit(r[c])).join(', ')})`).join(',\n')
    files.push(`-- ${table}\nset session_replication_role = replica;\ninsert into ${table} (${cols.join(', ')}) values\n${values};\nset session_replication_role = origin;\n`)
  }
}

insert('farms', [{ id: FARM_ID, name: data.farm.name, location: data.farm.location, timezone: data.farm.timezone }])
for (const [table, rows] of demoRows(data, { salt: FARM_ID })) insert(table, rows.map((r) => ({ ...r, farm_id: FARM_ID })))

mkdirSync(OUT, { recursive: true })
for (const sql of files) writeFileSync(join(OUT, `${String(++part).padStart(3, '0')}.sql`), sql)
console.log(`Wrote ${files.length} files to ${OUT}. Farm id: ${FARM_ID}`)
