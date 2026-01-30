<template>
  <div :class="$q.screen.gt.xs ? 'q-pa-md' : 'q-pa-sm'" class="bg-grey-1 full-height">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="shadow-1 rounded-borders bg-white">
          <div class="q-pa-md row items-center justify-between q-gutter-y-sm">
            <div class="col-12 col-sm-auto text-center text-sm-left">
              <div class="page-title">Order Management</div>
              <div class="page-subtitle">Realtime order tracking</div>
            </div>

            <q-btn
              v-if="canCreateOrder"
              color="primary"
              icon="point_of_sale"
              label="Open POS"
              unelevated
              no-caps
              :class="[$q.screen.xs ? 'full-width' : '', 'btn-primary']"
              @click="goToPOS"
            />
          </div>

          <q-separator class="bg-grey-3" />

          <div class="q-pa-md bg-grey-1">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-sm-8">
                <q-input
                  v-model="searchQuery"
                  outlined
                  dense
                  bg-color="white"
                  placeholder="Search orders..."
                  clearable
                  class="input-field"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-sm-4">
                <q-select
                  v-model="statusFilter"
                  :options="statusOptions"
                  outlined
                  dense
                  bg-color="white"
                  label="Status"
                />
              </div>
            </div>
          </div>

          <q-table
            :rows="filteredOrders"
            :columns="columns"
            row-key="id"
            :loading="loading"
            flat
            :grid="$q.screen.xs"
            :hide-header="$q.screen.xs"
            class="order-table"
            :pagination="{ rowsPerPage: 10, sortBy: 'date', descending: true }"
          >
            <template v-slot:body="props">
              <q-tr :props="props" class="cursor-pointer hover-bg" @click="openReceipt(props.row)">
                <q-td key="id" :props="props">
                  <span class="text-weight-bold text-primary font-mono">
                    #{{ props.row.orderNumber || props.row.id.substring(0, 8) }}
                  </span>
                </q-td>
                <q-td key="customerName" :props="props">
                  {{ props.row.customerName || 'Walk-in' }}
                </q-td>
                <q-td key="date" :props="props">
                  {{ formatDate(props.row.createdAt || props.row.date) }}
                </q-td>
                <q-td key="status" :props="props">
                  <q-badge :color="getStatusColor(props.row.status)" rounded>
                    {{ props.row.status }}
                  </q-badge>
                </q-td>
                <q-td key="totalAmount" :props="props" class="text-weight-bold">
                  {{ formatTotal(props.row) }}
                </q-td>
                <q-td key="actions" :props="props">
                  <q-btn flat round dense size="sm" icon="chevron_right" />
                </q-td>
              </q-tr>
            </template>

            <template v-slot:item="props">
              <div class="col-12 q-px-xs q-py-xs">
                <q-item
                  clickable
                  v-ripple
                  class="bg-white border-bottom q-pa-md"
                  @click="openReceipt(props.row)"
                >
                  <q-item-section avatar>
                    <q-avatar
                      :color="getStatusColor(props.row.status)"
                      text-color="white"
                      icon="receipt_long"
                      size="40px"
                    />
                  </q-item-section>

                  <q-item-section>
                    <q-item-label class="text-weight-bold text-primary font-mono">
                      #{{ props.row.orderNumber || props.row.id.substring(0, 8) }}
                    </q-item-label>
                    <q-item-label caption>
                      {{ props.row.customerName || 'Walk-in' }}
                    </q-item-label>
                    <q-item-label caption class="text-grey-6">
                      {{ formatDate(props.row.createdAt || props.row.date) }}
                    </q-item-label>
                  </q-item-section>

                  <q-item-section side>
                    <div class="text-subtitle1 text-weight-bolder text-grey-9">
                      {{ formatTotal(props.row) }}
                    </div>
                    <q-badge
                      :label="props.row.status"
                      :color="getStatusColor(props.row.status)"
                      outline
                      size="sm"
                    />
                  </q-item-section>
                </q-item>
              </div>
            </template>

            <template v-slot:no-data>
              <div class="full-width column flex-center q-pa-xl text-grey-5">
                <q-icon name="history" size="64px" />
                <div class="text-h6 q-mt-md">No orders found</div>
              </div>
            </template>
          </q-table>
        </q-card>
      </div>

      <ReceiptDialog v-model="showReceiptDialog" :order="selectedOrder" />
    </div>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/features/index.js'
import { useOrderStore } from 'src/stores/orderStore'
import ReceiptDialog from 'src/components/ordering/ReceiptDialog.vue'

const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()
const orderStore = useOrderStore()

const searchQuery = ref('')
const statusFilter = ref('All')
const showReceiptDialog = ref(false)
const selectedOrder = ref(null)
const statusOptions = ['All', 'Paid', 'Pending', 'Void', 'Cancelled']

const orders = computed(() => orderStore.orders || [])
const loading = computed(() => orderStore.loading)

// Permissions
const has = (perm) =>
  authStore.isSuperAdmin ||
  authStore.permissions.includes('*') ||
  authStore.permissions.includes(perm)
const canCreateOrder = computed(() => has('ordering:view'))

const goToPOS = () => router.push({ name: 'POS' })

onMounted(() => {
  if (!orderStore.orders.length) {
    orderStore.fetchOrders()
  }
})

const columns = [
  { name: 'id', label: 'Order ID', field: 'id', align: 'left', sortable: true },
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left', sortable: true },
  { name: 'date', label: 'Date', field: 'createdAt', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'totalAmount', label: 'Total', field: 'totalAmount', align: 'right', sortable: true },
  { name: 'actions', label: '', align: 'right' },
]

const filteredOrders = computed(() => {
  let list = orders.value
  if (statusFilter.value !== 'All') list = list.filter((o) => o.status === statusFilter.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((o) => (o.customerName || '').toLowerCase().includes(q) || o.id.includes(q))
  }
  return list
})

const formatDate = (val) => {
  if (!val) return '-'
  const d = val?.toDate ? val.toDate() : new Date(val)
  return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
}

const getStatusColor = (s) => {
  const c = { Paid: 'positive', Pending: 'warning', Void: 'negative', Cancelled: 'grey-8' }
  return c[s] || 'grey'
}

const formatTotal = (row) =>
  `₱${Number(row.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`

const openReceipt = (order) => {
  selectedOrder.value = order
  showReceiptDialog.value = true
}
</script>

<style lang="scss" scoped>
.font-mono {
  font-family: 'Roboto Mono', monospace;
}
.hover-bg:hover {
  background-color: #f8f9fa;
}
.border-bottom {
  border-bottom: 1px solid #eeeeee;
}

.order-table {
  /* Dynamic height for sticky header */
  max-height: calc(100vh - 280px);
  thead tr th {
    position: sticky;
    z-index: 1;
    background-color: #fff;
    top: 0;
  }
}

/* Specific mobile tweaks */
@media (max-width: $breakpoint-xs-max) {
  .order-table {
    max-height: none;
    background: transparent !important;
  }
}
</style>
