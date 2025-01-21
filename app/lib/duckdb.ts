import { AsyncDuckDB, ConsoleLogger, type DuckDBBundles, selectBundle } from '@duckdb/duckdb-wasm'
import { defu } from 'defu'
import { getBundles } from './duckdb-default-bundles'

export type ConnectOptions = ConnectRequiredOptions & ConnectOptionalOptions

export interface ConnectOptionalOptions {
  bundles?: DuckDBBundles
}

export interface ConnectRequiredOptions {

}

export async function connect(options: ConnectOptions) {
  const opts = defu(options, { bundles: getBundles() })

  const bundle = await selectBundle(opts.bundles)
  const worker = new Worker(bundle.mainWorker!)
  const logger = new ConsoleLogger()
  const db = new AsyncDuckDB(logger, worker)

  await db.instantiate(bundle.mainModule, bundle.pthreadWorker)
  const conn = await db.connect()

  return {
    worker,
    db,
    conn,
    close: async () => {
      await conn.close()
      await db.terminate()
      await worker.terminate()
    },
  }
}
