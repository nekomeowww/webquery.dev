<script setup lang="ts">
import type { ColumnDef, ColumnFiltersState, ExpandedState, SortingState, VisibilityState } from '@tanstack/vue-table'
import type { StructRow } from 'apache-arrow'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FlexRender, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, getPaginationRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'

import { h, ref } from 'vue'
import { useDuckDBQuery } from '../composables/duckdb'
import { format } from '../lib/duckdb-format'
import { getViteBundles } from '../lib/duckdb-vite-bundles'
import BasicTextarea from './BasicTextarea.vue'

const query = ref<string>(`SELECT
    -- Numeric Types
    1::smallint AS 'smallint',
    1::integer AS 'integer',
    1::bigint AS 'bigint',
    1.1::decimal AS 'decimal',
    1.1::numeric AS 'numeric',
    1.1::real AS 'real',
    1.1::double precision AS 'double',

    -- Character Types
    'text'::text AS 'text',
    'varchar'::varchar(50) AS 'varchar',
    'char'::char(10) AS 'char',

    -- Date/Time Types
    now()::timestamp AS 'timestamp',
    now()::timestamp with time zone AS 'timestamptz',
    CURRENT_DATE AS 'date',
    CURRENT_TIME AS 'time',
    CURRENT_TIME::time with time zone AS 'timetz',
    interval '1 day' AS 'interval',

    -- Boolean Type
    true::boolean AS 'boolean',

    -- Binary Types
    '\x1234'::bytea AS 'bytea',

    -- Arrays
    ARRAY[1,2,3] AS 'integer_array',
    ARRAY['a','b','c'] AS 'text_array',

    -- JSON Types
    '{"key": "value"}'::json AS 'JSON',

    -- UUID Type
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid AS 'UUID'
;`)
const queryInput = ref<string>(query.value)
const { error, errored, result } = useDuckDBQuery(query, { bundles: getViteBundles(), immediate: true })
const resultArray = computed(() => (result.value?.toArray() as StructRow[] || []).map(item => item.toJSON()))
const columns = computed<ColumnDef<Record<string, unknown>>[]>(() => {
  return result.value?.schema.fields.map((field) => {
    return {
      accessorKey: field.name,
      header: field.name,
      cell: ({ row }) => {
        try {
          return h('span', {}, format(row.getValue(field.name), field))
        }
        catch (err) {
          console.error(err, 'field:', field, 'value:', row.getValue(field.name))

          errored.value = true
          error.value = String(err)
        }
      },
    }
  }) || []
})

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
        <BasicTextarea
          v-model="queryInput"
          bg="black/2 dark:white/5"
          border="1 solid black/10 dark:white/15"
          outline="none"
          w-full rounded p-2 font-mono
          @submit="() => query = queryInput"
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
    <div>
      <div class="overflow-hidden border rounded-md">
        <Table>
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" bg="black/2 dark:white/5">
              <TableHead v-for="header in headerGroup.headers" :key="header.id">
                <FlexRender v-if="!header.isPlaceholder" :render="header.column.columnDef.header" :props="header.getContext()" />
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="table.getRowModel().rows?.length">
              <template v-for="row in table.getRowModel().rows" :key="row.id">
                <TableRow :data-state="row.getIsSelected() && 'selected'">
                  <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" text-nowrap>
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
