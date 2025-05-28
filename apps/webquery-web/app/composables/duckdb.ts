import type { ConnectOptions, DuckDBWasmClient } from '@proj-airi/duckdb-wasm'
import type { Field } from 'apache-arrow'

import type { MaybeRefOrGetter } from 'vue'
import { connect as duckdbConnect, mapStructRowData } from '@proj-airi/duckdb-wasm'
import { onMounted, onUnmounted, ref, toValue, watch } from 'vue'

export function useDuckDB(options?: ConnectOptions & { autoConnect?: boolean }) {
  const db = ref<DuckDBWasmClient>()
  const closeFunc = ref<() => Promise<void>>(async () => { })

  async function connect() {
    const client = await duckdbConnect({ ...options })
    db.value = client

    closeFunc.value = async () => {
      client?.close()
    }
  }

  onMounted(async () => {
    if (options?.autoConnect) {
      await connect()
    }
  })

  onUnmounted(() => {
    closeFunc.value()
  })

  return {
    connect,
    db,
  }
}

export function useDuckDBQuery(queryStr: MaybeRefOrGetter<string>, options?: { autoConnect?: boolean, immediate?: boolean } & ConnectOptions) {
  const result = ref<Record<string, unknown>[]>()
  const resultColumns = ref<Field[]>([])
  const errored = ref<boolean>(false)
  const error = ref<unknown>()

  const duckDB = useDuckDB(options)

  async function _query(query: string, params: unknown[] = []): Promise<{ data: Record<string, unknown>[], columns: any[] }> {
    const conn = duckDB.db.value?.conn
    if (!conn) {
      return {
        data: [],
        columns: [],
      }
    }

    if (!params || params.length === 0) {
      const results = await conn.query(query)
      return {
        data: mapStructRowData(results),
        columns: results.schema.fields,
      }
    }

    const stmt = await conn.prepare(query)
    const results = await stmt.query(...params)

    const rows = mapStructRowData(results)
    stmt.close()

    return {
      data: rows,
      columns: results.schema.fields,
    }
  }

  async function query() {
    try {
      const results = await _query(toValue(queryStr))

      errored.value = false
      error.value = undefined

      result.value = results.data
      resultColumns.value = results.columns
    }
    catch (err) {
      errored.value = true
      error.value = err
    }
  }

  onMounted(async () => options?.immediate && await query())
  watch(() => toValue(queryStr), () => query())
  watch(duckDB.db, async (newDb) => {
    if (newDb && options?.immediate) {
      await query()
    }
  })

  return {
    result,
    resultColumns,
    error,
    errored,
    execute: query,
  }
}
