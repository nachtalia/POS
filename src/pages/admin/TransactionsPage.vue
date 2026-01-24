<template>
  <q-page class="q-pa-md bg-grey-2">
    <div class="row justify-center">
      <div class="col-12" style="max-width: 1400px">
        <div class="row items-center justify-between q-mb-md">
          <div>
            <div class="text-h5 text-weight-bold text-blue-grey-9">Transactions</div>
            <div class="text-caption text-grey-7">Manage and track your order history</div>
          </div>
          <q-btn
            color="primary"
            icon="cloud_download"
            label="Export Report"
            no-caps
            unelevated
            class="radius-8"
            @click="exportTransactions"
          />
        </div>

        <q-card class="shadow-2 rounded-xl bg-white overflow-hidden">
          <div class="q-pa-md border-bottom-light">
            <div class="row q-col-gutter-md">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="searchQuery"
                  outlined
                  dense
                  placeholder="Search Order #, Cashier, Customer..."
                  class="rounded-input"
                  bg-color="grey-1"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" class="text-grey-5" />
                  </template>
                  <template v-slot:append v-if="searchQuery">
                    <q-icon
                      name="cancel"
                      @click="searchQuery = ''"
                      class="cursor-pointer text-grey-5"
                    />
                  </template>
                </q-input>
              </div>

              <div class="col-12 col-md-3">
                <q-input
                  v-model="fromDate"
                  outlined
                  dense
                  label="From Date"
                  readonly
                  class="rounded-input"
                  bg-color="grey-1"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" class="text-primary" />
                  </template>
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="fromDate" mask="YYYY-MM-DD" today-btn color="primary" />
                  </q-popup-proxy>
                </q-input>
              </div>
              <div class="col-12 col-md-3">
                <q-input
                  v-model="toDate"
                  outlined
                  dense
                  label="To Date"
                  readonly
                  class="rounded-input"
                  bg-color="grey-1"
                >
                  <template v-slot:prepend>
                    <q-icon name="event" class="text-primary" />
                  </template>
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="toDate" mask="YYYY-MM-DD" today-btn color="primary" />
                  </q-popup-proxy>
                </q-input>
              </div>
            </div>
          </div>

          <q-table
            :rows="filteredTransactions"
            :columns="columns"
            row-key="id"
            flat
            class="sticky-header-table"
            v-model:pagination="pagination"
            :rows-per-page-options="[10, 20, 50]"
          >
            <template v-slot:header="props">
              <q-tr :props="props">
                <q-th
                  v-for="col in props.cols"
                  :key="col.name"
                  :props="props"
                  class="text-uppercase text-grey-7 text-weight-bold bg-grey-1"
                >
                  {{ col.label }}
                </q-th>
              </q-tr>
            </template>

            <template v-slot:body-cell-orderNumber="props">
              <q-td :props="props">
                <div class="text-weight-bold text-primary font-mono">
                  {{ props.value }}
                </div>
                <div class="text-caption text-grey-5" style="font-size: 0.7rem">
                  {{ props.row.id.substring(0, 8) }}...
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-date="props">
              <q-td :props="props">
                <div class="text-weight-medium text-grey-9">{{ formatDate(props.value) }}</div>
              </q-td>
            </template>

            <template v-slot:body-cell-customerName="props">
              <q-td :props="props">
                <div class="text-weight-medium text-blue-grey-9">{{ props.value }}</div>
                <div class="text-caption text-grey-6" v-if="props.row.customer?.phone">
                  {{ props.row.customer.phone }}
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-badge
                  :color="getStatusColor(props.value)"
                  class="q-px-sm q-py-xs text-weight-medium"
                  rounded
                >
                  {{ props.value }}
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-total="props">
              <q-td :props="props" class="text-right">
                <span class="text-grey-9 text-weight-bold" style="font-size: 1.1em">
                  {{ props.value }}
                </span>
              </q-td>
            </template>

            <template v-slot:body-cell-items="props">
              <q-td :props="props" class="text-center">
                <q-badge color="grey-2" text-color="grey-9" rounded class="q-px-sm shadow-sm">
                  {{ props.value }} Items
                </q-badge>
              </q-td>
            </template>

            <template v-slot:body-cell-type="props">
              <q-td :props="props" class="text-center">
                <q-chip
                  dense
                  square
                  outline
                  color="primary"
                  size="sm"
                  class="text-weight-bold"
                  :label="props.value"
                />
              </q-td>
            </template>

            <template v-slot:body-cell-paymentMethod="props">
              <q-td :props="props" class="text-center">
                <div class="row items-center justify-center no-wrap text-grey-8">
                  <q-icon :name="getPaymentIcon(props.value)" size="xs" class="q-mr-xs" />
                  <span class="text-caption text-weight-medium">{{ props.value }}</span>
                </div>
              </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props" class="text-right">
                <div class="row justify-end q-gutter-x-sm no-wrap">
                  <q-btn
                    flat
                    round
                    dense
                    color="grey-7"
                    icon="visibility"
                    size="sm"
                    class="bg-grey-2"
                    @click="viewOrder(props.row)"
                  >
                    <q-tooltip>View Details</q-tooltip>
                  </q-btn>
                  <q-btn
                    flat
                    round
                    dense
                    color="primary"
                    icon="print"
                    size="sm"
                    class="bg-blue-1"
                    @click="printOrder(props.row)"
                  >
                    <q-tooltip>Print Receipt</q-tooltip>
                  </q-btn>
                </div>
              </q-td>
            </template>

            <template v-slot:no-data>
              <div class="full-width row flex-center q-pa-xl text-grey-5">
                <div class="column items-center">
                  <q-icon size="4rem" name="receipt_long" class="q-mb-md opacity-50" />
                  <div class="text-h6">No transactions found</div>
                  <div class="text-caption">Try adjusting your filters</div>
                </div>
              </div>
            </template>
          </q-table>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '../../stores/orderStore'
import { useFormatters } from 'src/composables/useFormatters'

const orderStore = useOrderStore()
const { formatDate, formatCurrency } = useFormatters()

const searchQuery = ref('')
const fromDate = ref('')
const toDate = ref('')

const pagination = ref({
  sortBy: 'date',
  descending: true,
  page: 1,
  rowsPerPage: 10,
})

const normalizeDate = (d) => {
  if (!d) return null
  if (typeof d?.toDate === 'function') return d.toDate()
  const js = new Date(d)
  return Number.isNaN(js.getTime()) ? null : js
}

const getStatusColor = (status) => {
  if (!status) return 'grey'
  const s = status.toLowerCase()
  if (s === 'paid' || s === 'completed') return 'positive'
  if (s === 'pending') return 'warning'
  if (s === 'cancelled') return 'negative'
  if (s === 'shipped') return 'info'
  return 'grey-7'
}

const computeTotal = (row) => {
  const t = row.total ?? row.totalAmount
  if (typeof t === 'number') return t
  const items = Array.isArray(row.items) ? row.items : []
  const subtotal = items.reduce(
    (s, i) => s + Number(i.unitPrice ?? i.price ?? 0) * Number(i.quantity ?? 1),
    0,
  )
  const tax = Number(row.taxAmount ?? 0)
  const discount = Number(row.discountAmount ?? 0)
  return subtotal + tax - discount
}

const getPaymentIcon = (method) => {
  if (!method) return 'payments'
  const m = method.toLowerCase()
  if (m.includes('cash')) return 'payments'
  if (m.includes('card') || m.includes('visa') || m.includes('master')) return 'credit_card'
  if (m.includes('gcash') || m.includes('wallet')) return 'account_balance_wallet'
  if (m.includes('bank')) return 'account_balance'
  return 'receipt'
}

const viewOrder = (row) => {
  console.log('View Order', row)
  // TODO: Implement View Dialog
}

const printOrder = (row) => {
  console.log('Print Order', row)
  // TODO: Implement Print Logic
}

// --- UPDATED COLUMNS ---
const columns = [
  {
    name: 'orderNumber',
    required: true,
    label: 'Order ID',
    align: 'left',
    field: (row) => row.orderNumber || row.id?.substring(0, 8).toUpperCase() || 'N/A',
    sortable: true,
  },
  {
    name: 'customerName',
    align: 'left',
    label: 'Customer Name',
    field: (row) => row.customerName || 'Walk-in Customer',
    sortable: true,
  },
  {
    name: 'date',
    align: 'left',
    label: 'Date',
    field: (row) => row.createdAt || row.date,
    sortable: true,
    format: (val) => {
      try {
        return formatDate(val)
      } catch {
        return val
      }
    },
  },
  {
    name: 'status',
    align: 'center',
    label: 'Status',
    field: 'status',
    sortable: true,
  },
  {
    name: 'total',
    align: 'right',
    label: 'Total Amount',
    field: (row) => computeTotal(row),
    sortable: true,
    format: (val) => formatCurrency(val),
  },
  {
    name: 'items',
    align: 'center',
    label: 'Items',
    field: (row) => row.itemCount || (row.items ? row.items.length : 0),
    sortable: true,
  },
  {
    name: 'type',
    align: 'center',
    label: 'Type',
    field: (row) => row.orderType || 'Walk-in',
    sortable: true,
  },
  {
    name: 'paymentMethod',
    align: 'center',
    label: 'Payment',
    field: (row) => row.paymentMethod || 'Cash',
    sortable: true,
  },
  {
    name: 'actions',
    align: 'right',
    label: 'Actions',
    field: 'actions',
  },
]

// --- UPDATED SEARCH LOGIC ---
const filteredTransactions = computed(() => {
  let list = orderStore.orders || []
  const from = fromDate.value ? new Date(fromDate.value) : null
  const to = toDate.value ? new Date(toDate.value + 'T23:59:59') : null

  // Date Filter
  if (from || to) {
    list = list.filter((t) => {
      const d = normalizeDate(t.date || t.createdAt)
      if (!d) return false
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }

  // Search Filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => {
      // Check Order Number (e.g. 2026...)
      const orderNum = t.orderNumber ? String(t.orderNumber).toLowerCase() : ''
      const sysId = t.id ? t.id.toLowerCase() : ''

      // Check Customer Name
      const custName = (t.customerName || t.customer?.name || '').toLowerCase()

      // Check Cashier/User Name
      const userName = (t.userName || t.cashierName || t.user?.name || '').toLowerCase()

      return (
        orderNum.includes(q) || sysId.includes(q) || custName.includes(q) || userName.includes(q)
      )
    })
  }
  return list
})

const exportTransactions = () => {
  console.log('Exporting...', filteredTransactions.value.length)
  // Implementation for export usually goes here (e.g. exportFile from Quasar)
}

onMounted(async () => {
  if (!orderStore.orders.length) {
    await orderStore.fetchOrders()
  }
})
</script>

<style scoped>
.rounded-xl {
  border-radius: 12px;
}

.radius-8 {
  border-radius: 8px;
}

.rounded-input :deep(.q-field__control) {
  border-radius: 8px;
}

.border-bottom-light {
  border-bottom: 1px solid #f0f0f0;
}

:deep(.q-table tbody tr:hover) {
  background-color: #fafafa;
}

.opacity-50 {
  opacity: 0.5;
}

.font-mono {
  font-family: 'Roboto Mono', monospace;
  letter-spacing: -0.5px;
}
</style>
