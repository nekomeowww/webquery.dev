<script setup lang="ts">
import type { CellContext, ColumnDef, ColumnFiltersState, ColumnResizeMode, ColumnSizingState, ExpandedState, SortingState, VisibilityState } from '@tanstack/vue-table'
import { getImportUrlBundles } from '@proj-airi/duckdb-wasm/bundles/import-url-browser'

import { FlexRender, getCoreRowModel, getExpandedRowModel, getFilteredRowModel, getSortedRowModel, useVueTable } from '@tanstack/vue-table'
import { h, ref } from 'vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDuckDBQuery } from '../composables/duckdb'
import { valueUpdater } from '../libs/shadcn/utils'
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
const { error, errored, result, resultColumns } = useDuckDBQuery(query, { bundles: getImportUrlBundles(), immediate: true, autoConnect: true, logger: true })

// Add column resizing state
const columnSizing = ref<ColumnSizingState>({})
const columnResizeMode = ref<ColumnResizeMode>('onChange')

const sorting = ref<SortingState>([])
const columnFilters = ref<ColumnFiltersState>([])
const columnVisibility = ref<VisibilityState>({})
const rowSelection = ref({})
const expanded = ref<ExpandedState>({})

// Define default column sizes
const DEFAULT_COLUMN_WIDTH = 150

const columns = computed<ColumnDef<Record<string, unknown>>[]>(() => {
  const fields = resultColumns.value.map((column) => {
    return {
      accessorKey: column.name,
      header: () => h('span', {}, column.name),
      cell: (cellProps: CellContext<Record<string, unknown>, unknown>) => h('span', {}, cellProps.row.getValue(column.name)),
      size: DEFAULT_COLUMN_WIDTH,
      minSize: 60,
      maxSize: 800,
      enableResizing: true,
    } as ColumnDef<Record<string, unknown>>
  })

  return [
    ...fields,
    // Add a spacer column that will expand to fill available space
    {
      id: 'spacer',
      header: '',
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
      enableResizing: false,
      size: 10,
      minSize: 10,
      maxSize: 2000,
    },
  ]
})

const table = useVueTable({
  get data() {
    return result.value || []
  },
  get columns() {
    return columns.value || []
  },
  enableSorting: false,
  columnResizeMode: columnResizeMode.value,
  enableColumnResizing: true,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  onSortingChange: updaterOrValue => valueUpdater(updaterOrValue, sorting),
  onColumnFiltersChange: updaterOrValue => valueUpdater(updaterOrValue, columnFilters),
  onColumnVisibilityChange: updaterOrValue => valueUpdater(updaterOrValue, columnVisibility),
  onRowSelectionChange: updaterOrValue => valueUpdater(updaterOrValue, rowSelection),
  onExpandedChange: updaterOrValue => valueUpdater(updaterOrValue, expanded),
  onColumnSizingChange: updaterOrValue => valueUpdater(updaterOrValue, columnSizing),
  state: {
    get sorting() { return sorting.value },
    get columnFilters() { return columnFilters.value },
    get columnVisibility() { return columnVisibility.value },
    get rowSelection() { return rowSelection.value },
    get expanded() { return expanded.value },
    get columnSizing() { return columnSizing.value },
  },
})

// Calculate column size variables once for better performance
const columnSizeVars = computed(() => {
  const headers = table.getFlatHeaders()
  const colSizes: Record<string, string> = {}

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]
    colSizes[`--header-${header!.id}-size`] = `${header!.getSize()}px`
    colSizes[`--col-${header!.column.id}-size`] = `${header!.column.getSize()}px`
  }

  return colSizes
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
      <!-- Table -->
      <div class="w-full flex-1 border rounded-md">
        <Table :style="columnSizeVars" class="w-full table-fixed">
          <TableHeader>
            <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="relative" bg="black/2 dark:white/5">
              <TableHead
                v-for="header in headerGroup.headers"
                :key="header.id"
                :style="{
                  width: `var(--header-${header.id}-size)`,
                  position: 'relative',
                }"
                :colspan="header.colSpan"
                :data-column-id="header.column.id"
                class="relative select-none"
              >
                <div class="flex items-center justify-between gap-2">
                  <div v-if="!header.isPlaceholder" class="truncate">
                    <FlexRender :render="header.column.columnDef.header" :props="header.getContext()" />
                  </div>

                  <!-- Column resize handle -->
                  <div
                    v-if="header.column.getCanResize()" class="resizer"
                    :class="{ isResizing: header.column.getIsResizing() }"
                    @dblclick="header.column.resetSize()"
                    @mousedown="header.getResizeHandler()?.($event)"
                    @touchstart="header.getResizeHandler()?.($event)"
                  />
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <template v-if="table.getRowModel().rows?.length">
              <template v-for="row in table.getRowModel().rows" :key="row.id">
                <TableRow
                  :data-state="row.getIsSelected() && 'selected'"
                  class="w-full"
                >
                  <TableCell
                    v-for="cell in row.getVisibleCells()" :key="cell.id"
                    :style="{ width: `var(--col-${cell.column.id}-size)` }"
                    :data-column-id="cell.column.id"
                    class="truncate"
                  >
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
              <TableCell :colspan="columns.length" class="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table {
  border-collapse: separate;
  border-spacing: 0;
}

.resizer {
  position: absolute;
  right: 0;
  top: 0;
  height: 90%;
  width: 2px;
  background: rgba(114, 114, 114, 0.5);
  cursor: col-resize;
  user-select: none;
  touch-action: none;
  opacity: 0.2;
  z-index: 10;
  border-radius: 999px;
  transform: translateY(5%);
}

.resizer:hover {
  opacity: 1;
}

.resizer.isResizing {
  background: rgba(0, 0, 0, 0.2);
  opacity: 1;
}

/* Fix for Firefox */
@-moz-document url-prefix() {
  .resizer {
    height: 100%;
    right: 0;
  }
}

/* Style for the spacer column to allow it to expand */
:deep([data-column-id='spacer']) {
  width: 100% !important;
  min-width: 10px;
}
</style>
