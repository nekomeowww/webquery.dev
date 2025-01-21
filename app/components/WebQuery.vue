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
import { getViteBundles } from '~/lib/duckdb-vite-bundles'
import { useDuckDBQuery } from '../composables/duckdb'

const query = ref<string>('SELECT * FROM generate_series(1, 100) t(v);')
const queryInput = ref<string>(query.value)
const { error, errored, result } = useDuckDBQuery(query, { bundles: getViteBundles(), immediate: true })
const resultArray = computed(() => result.value?.toArray().map(row => row.toJSON()) || [])
const columns = computed<ColumnDef<any>[]>(() => (result.value?.schema.fields.map((field) => {
  return {
    accessorKey: field.name,
    header: field.name,
    cell: ({ row }) => h('span', {}, row.getValue(field.name)),
  }
}) || []))

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
        {{ error }}
      </div>
      <div
        v-else
        bg="green/5 dark:green-300/15"
        border="1 solid green/60 dark:green-300/50"
        outline="none"
        w-full rounded p-2 font-mono
      >
        <p>
          OK
        </p>
      </div>
      <div>
        <textarea
          v-model="queryInput"
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
        @click="() => query = queryInput"
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
