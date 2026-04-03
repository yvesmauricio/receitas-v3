import Dexie from 'dexie'

export const db = new Dexie('ChocoStoqDB')

// Schema v5: uuid como chave primária (resolve bug de CRUD com put/delete)
db.version(5).stores({
  produtos:   'uuid, nome',
  receitas:   'uuid, nome',
  producoes:  'uuid, data_producao',
  config:     'chave'
}).upgrade(tx => {
  // Migra registros antigos que podem não ter uuid
  return tx.table('produtos').toCollection().modify(p => {
    if (!p.uuid) p.uuid = crypto.randomUUID()
  }).then(() =>
    tx.table('receitas').toCollection().modify(r => {
      if (!r.uuid) r.uuid = crypto.randomUUID()
    })
  ).then(() =>
    tx.table('producoes').toCollection().modify(p => {
      if (!p.uuid) p.uuid = crypto.randomUUID()
    })
  )
})

// ─── Config local ──────────────────────────────────────────────
export async function configGet(chave, fallback = null) {
  try {
    const row = await db.config.get(chave)
    return row?.valor ?? fallback
  } catch { return fallback }
}

export async function configSet(chave, valor) {
  try { await db.config.put({ chave, valor }) } catch {}
}

// ─── Rotina de Backup Forte ─────────────────────────────────────

/** Exporta todo o banco para um objeto JSON */
export async function exportarDados() {
  const tabelas = ['produtos', 'receitas', 'producoes', 'config']
  const backup = {}
  for (const t of tabelas) {
    backup[t] = await db[t].toArray()
  }
  return backup
}

/** Importa dados de um JSON (sobrescreve o que existe) */
export async function importarDados(backup) {
  return db.transaction('rw', db.tables, async () => {
    for (const [tabela, rows] of Object.entries(backup)) {
      if (db[tabela]) {
        await db[tabela].clear()
        await db[tabela].bulkPut(rows)      
      }
    }
  })
}

/** Solicita ao navegador que o armazenamento seja persistente */
export async function garantirPersistencia() {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persisted()
    if (!isPersisted) {
      const granted = await navigator.storage.persist()
      console.log(`Persistência de dados concedida: ${granted}`)
      return granted
    }
    return true
  }
  return false
}
