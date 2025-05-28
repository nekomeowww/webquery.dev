import type { ConnectOptions, DuckDBWasmClient } from '@proj-airi/duckdb-wasm'
import type { Field } from 'apache-arrow'

import type { MaybeRefOrGetter } from 'vue'
import { connect as duckdbConnect, mapStructRowData } from '@proj-airi/duckdb-wasm'
import { onMounted, onUnmounted, ref, toValue, watch } from 'vue'

export function useDuckDB(options?: ConnectOptions & { autoConnect?: boolean }) {
  const connecting = ref(false)
  const db = ref<DuckDBWasmClient>()
  const closeFunc = ref<() => Promise<void>>(async () => { })
  const errored = ref<boolean>(false)
  const error = ref<unknown>()

  async function connect() {
    connecting.value = true

    try {
      const client = await duckdbConnect({ ...options })
      db.value = client

      closeFunc.value = async () => {
        client?.close()
      }
    }
    catch (err) {
      console.error('Error connecting to DuckDB:', err)

      errored.value = true
      error.value = err

      db.value = undefined
      closeFunc.value = async () => { }
    }
    finally {
      connecting.value = false
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
    connecting,
    errored,
    error,
  }
}

export function useDuckDBQuery(queryStr: MaybeRefOrGetter<string>, options?: { autoConnect?: boolean, immediate?: boolean } & ConnectOptions) {
  const result = ref<Record<string, unknown>[]>()
  const resultColumns = ref<Field[]>([])
  const errored = ref<boolean>(false)
  const error = ref<unknown>()
  const querying = ref(false)

  const { db, connecting, error: dbError, errored: dbErrored } = useDuckDB(options)

  async function _query(query: string, params: unknown[] = []): Promise<{ data: Record<string, unknown>[], columns: any[] }> {
    const conn = db.value?.conn
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
    querying.value = true

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
    finally {
      querying.value = false
    }
  }

  onMounted(async () => options?.immediate && await query())
  watch(() => toValue(queryStr), () => query())
  watch(db, async (newDb) => {
    if (newDb && options?.immediate) {
      await query()
    }
  })
  watch(dbError, (newError) => {
    if (newError) {
      errored.value = true
      error.value = newError
    }
  })
  watch(dbErrored, (newErrored) => {
    if (newErrored) {
      errored.value = true
      error.value = dbError.value
    }
  })

  return {
    result,
    resultColumns,
    error,
    errored,
    execute: query,
    querying,
    connecting,
  }
}
