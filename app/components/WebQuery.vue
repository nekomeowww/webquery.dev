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

function toObject(val: any) {
  return JSON.parse(JSON.stringify(val, (key, value) =>
    typeof value === 'bigint'
      ? value.toString()
      : value),
  )
}

async function handleQuery() {
  if (!db.value || !conn.value)
    return

  const result = await conn.value.query(query.value)

  columns.value = result.schema.fields.map((field) => {
    return {
      accessorKey: field.name,
      header: field.name,
      cell: ({ row }) => h('span', {}, row.getValue(field.name)),
    }
  })

  resultArray.value = toObject(result.toArray())
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
    // onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
    // onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
    // onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
    // onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
    // onExpandedChange: updaterOrValue => valueUpdater(updaterOrValue, expanded),
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
  <div flex flex-col gap-4>
    <h1 flex items-center gap-2 text-left font-mono>
      <div i-heroicons:command-line-solid text="indigo-600 dark:indigo-300" text-2xl />
      <span text-xl>WebQuery</span>
    </h1>
    <div flex flex-col gap-1>
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
    <div>
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
