<script setup lang="ts">
import type {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  SortingState,
  VisibilityState,
} from '@tanstack/vue-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

import * as duckdb from '@duckdb/duckdb-wasm'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'

import {
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table'

import { formatDistance } from 'date-fns'
import { h, ref } from 'vue'

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: {
    mainModule: duckdb_wasm,
    mainWorker: mvp_worker,
  },
  eh: {
    mainModule: duckdb_wasm_eh,
    mainWorker: eh_worker,
  },
}

const worker = ref<Worker>()
const db = ref<duckdb.AsyncDuckDB>()
const conn = ref<duckdb.AsyncDuckDBConnection>()
const query = ref<string>('SELECT * FROM generate_series(1, 100) t(v);')
const resultArray = ref<any[]>([])

const columns = ref<ColumnDef<any>[]>([])

const queryTimeElapse = ref('')
const errored = ref(false)
const errorMessage = ref('')

onMounted(async () => {
  // Select a bundle based on browser checks
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
  // Instantiate the asynchronus version of DuckDB-wasm
  worker.value = new Worker(bundle.mainWorker!)
  const logger = new duckdb.ConsoleLogger()

  db.value = new duckdb.AsyncDuckDB(logger, worker.value)
  await db.value.instantiate(bundle.mainModule, bundle.pthreadWorker)

  conn.value = await db.value.connect()

  await handleQuery()
})

onUnmounted(async () => {
  // Closing everything
  await conn.value?.close()
  await db.value?.terminate()
  await worker.value?.terminate()
})

async function handleQuery() {
  try {
    errored.value = false
    errorMessage.value = ''

    if (!db.value || !conn.value)
      return

    const startTime = performance.now()

    const result = await conn.value.query(query.value)
    // eslint-disable-next-line no-console
    console.debug('Queried result:', result)

    const endTime = performance.now()
    queryTimeElapse.value = formatDistance(endTime, startTime)

    columns.value = result.schema.fields.map((field) => {
      return {
        accessorKey: field.name,
        header: field.name,
        cell: ({ row }) => h('span', {}, row.getValue(field.name)),
      }
    })

    resultArray.value = result.toArray().map(row => row.toJSON())
  }
  catch (err) {
    console.error(err)
    errored.value = true

    if (err instanceof Error) {
      errorMessage.value = err.message
    }
    else {
      errorMessage.value = String(err)
    }
  }
}

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})
const expanded = ref<ExpandedState>({})

const table = computed(() => {
  return useVueTable({
    data: resultArray.value,
    columns: columns.value,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    state: {
      get sorting() { return sorting.value },
      get columnFilters() { return columnFilters.value },
      get columnVisibility() { return columnVisibility.value },
      get rowSelection() { return rowSelection.value },
      get expanded() { return expanded.value },
    },
  })
})
</script>

<template>
  <div flex flex-col gap-4 text-left>
    <h1 flex items-center gap-2 font-mono>
      <div i-heroicons:command-line-solid text="indigo-600 dark:indigo-300" text-2xl />
      <span text-xl>WebQuery</span>
    </h1>
    <div flex flex-col gap-2>
      <div
        v-if="errored"
        bg="red/5 dark:red-300/15"
        border="1 solid red/60 dark:red-300/50"
        outline="none"
        w-full whitespace-pre-line rounded p-2 font-mono
      >
        {{ errorMessage }}
      </div>
      <div
        v-else
        bg="green/5 dark:green-300/15"
        border="1 solid green/60 dark:green-300/50"
        outline="none"
        w-full rounded p-2 font-mono
      >
        <p v-if="queryTimeElapse">
          OK, {{ queryTimeElapse }}
        </p>
        <p>
          OK
        </p>
      </div>
      <div>
        <textarea
          v-model="query"
          bg="black/2 dark:white/5"
          border="1 solid black/10 dark:white/15"
          outline="none"
          w-full rounded p-2 font-mono
        />
      </div>
      <button
        bg="indigo-50 dark:indigo-900"
        border="1 solid indigo-600 dark:indigo-300"
        text="black dark:white xs"
        w-fit rounded px-2 py-1
        @click="handleQuery"
      >
        Run
      </button>
    </div>
    <div text-center>
      <div class="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
              <TableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="table.getRowModel().rows?.length">
              <template v-for="row in table.getRowModel().rows" :key="row.id">
                <TableRow :data-state="row.getIsSelected() && 'selected'">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                    <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                  </TableCell>
                </TableRow>
                <TableRow v-if="row.getIsExpanded()">
                  <TableCell :colspan="row.getAllCells().length">
                    {{ JSON.stringify(row.original) }}
                  </TableCell>
                </TableRow>
              </template>
            </template>

            <TableRow v-else>
              <TableCell
                :colspan="columns.length"
                class="h-24 text-center"
              >
                No results.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>
