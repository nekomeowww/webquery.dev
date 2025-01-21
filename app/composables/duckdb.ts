import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

import { connect, type ConnectOptions } from '../lib/duckdb'
import { bundles } from '../lib/duckdb-vite-bundles'

export function useDuckDB(options?: ConnectOptions) {
  const worker = ref<Worker>()
  const db = ref<AsyncDuckDB>()
  const conn = ref<AsyncDuckDBConnection>()
  const closeFunc = ref<() => Promise<void>>(async () => {})

  onUnmounted(() => {
    closeFunc.value()
  })

  return {
    connect: async () => {
      const session = await connect({ ...options, bundles: bundles() })

      worker.value = session.worker
      db.value = session.db
      conn.value = session.conn
      closeFunc.value = session.close
    },
    worker,
    db,
    conn,
  }
}

export function useDuckDBQuery(queryStr: MaybeRefOrGetter<string>, options?: { immediate?: boolean } & ConnectOptions) {
  const result = ref<Awaited<ReturnType<AsyncDuckDBConnection['query']>>>()
  const errored = ref<boolean>(false)
  const error = ref<unknown>()

  const duckDB = useDuckDB(options)

  async function query() {
    if (!duckDB.conn.value) {
      return
    }

    try {
      result.value = await duckDB.conn.value.query(toValue(queryStr))
    }
    catch (err) {
      errored.value = true
      error.value = err
    }
  }

  onMounted(async () => {
    await duckDB.connect()

    errored.value = false
    error.value = undefined

    if (options?.immediate) {
      await query()
    }
  })

  watch(() => toValue(queryStr), () => {
    query()
  })

  return {
    result,
    error,
    errored,
    execute: query,
  }
}
