<template>
  <div class="q-pa-md bg-grey-1 full-height">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card flat bordered class="shadow-1 rounded-borders bg-white">
          <div class="q-pa-md row items-center justify-between q-gutter-y-sm">
            <div>
              <div class="text-h6 text-weight-bold text-grey-9">Order Management</div>
              <div class="text-caption text-grey-6">Realtime Order Tracking</div>
            </div>

            <q-btn
              color="primary"
              icon="add_shopping_cart"
              label="New POS Order"
              unelevated
              no-caps
              class="q-px-md"
              @click="showPOSDialog = true"
              v-if="canCreateOrder"
            />
          </div>

          <q-separator class="bg-grey-3" />

          <div class="q-pa-md bg-grey-1">
            <div class="row q-col-gutter-sm">
              <div class="col-12 col-md-4">
                <q-input
                  v-model="searchQuery"
                  outlined
                  dense
                  bg-color="white"
                  placeholder="Search Order #, ID, or Customer..."
                >
                  <template v-slot:prepend>
                    <q-icon name="search" class="text-grey-5" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-3">
                <q-select
                  v-model="statusFilter"
                  :options="statusOptions"
                  outlined
                  dense
                  bg-color="white"
                  emit-value
                  map-options
                  label="Filter Status"
                >
                  <template v-slot:prepend>
                    <q-icon name="filter_list" class="text-grey-5" />
                  </template>
                </q-select>
              </div>
            </div>
          </div>

          <q-table
            :rows="filteredOrders"
            :columns="columns"
            row-key="id"
            :loading="loading"
            flat
            class="sticky-header-table"
            :pagination="{ rowsPerPage: 10, sortBy: 'date', descending: true }"
          >
            <template v-slot:header="props">
              <q-tr :props="props">
                <q-th v-for="col in props.cols" :key="col.name" :props="props" class="text-grey-7">
                  {{ col.label }}
                </q-th>
              </q-tr>
            </template>

            <template v-slot:body="props">
              <q-tr :props="props">
                <q-td key="id" :props="props">
                  <div class="column cursor-pointer" @click="openReceipt(props.row)">
                    <span class="text-weight-bold text-primary font-mono">
                      {{ props.row.orderNumber || props.row.id.substring(0, 8) + '...' }}
                    </span>
                    <q-tooltip v-if="props.row.orderNumber">
                      Internal ID: {{ props.row.id }}
                    </q-tooltip>
                  </div>
                </q-td>

                <q-td key="customerName" :props="props">
                  {{
                    props.row.customerName ||
                    (props.row.customer ? props.row.customer.name : 'Walk-in Customer')
                  }}
                </q-td>

                <q-td key="date" :props="props">
                  {{ formatDate(props.row.createdAt || props.row.date) }}
                </q-td>

                <q-td key="status" :props="props">
                  <q-badge
                    :color="getStatusColor(props.row.status)"
                    rounded
                    class="q-px-sm q-py-xs shadow-1"
                  >
                    {{ props.row.status }}
                  </q-badge>
                </q-td>

                <q-td key="total" :props="props" class="text-weight-bold text-grey-9">
                  {{ formatTotal(props.row) }}
                </q-td>

                <q-td key="actions" :props="props">
                  <div class="row justify-center q-gutter-x-sm">
                    <q-btn
                      flat
                      round
                      dense
                      size="sm"
                      color="grey-7"
                      icon="visibility"
                      @click="openReceipt(props.row)"
                    >
                      <q-tooltip>View Receipt</q-tooltip>
                    </q-btn>
                  </div>
                </q-td>
              </q-tr>
            </template>

            <template v-slot:no-data>
              <div class="full-width row flex-center q-pa-lg text-grey-6">
                <div class="column items-center">
                  <q-icon name="assignment_late" size="48px" class="q-mb-sm text-grey-4" />
                  <div>No orders found matching your criteria.</div>
                </div>
              </div>
            </template>
          </q-table>
        </q-card>
      </div>

      <POSOrderDialog v-model="showPOSDialog" :products="products" />
      <ReceiptDialog v-model="showReceiptDialog" :order="selectedOrder" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { db } from 'src/services/firebase'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'

// Components
import POSOrderDialog from 'src/components/ordering/POSOrderingDialog.vue'
import ReceiptDialog from 'src/components/ordering/ReceiptDialog.vue'
import { useAuthStore } from 'src/features/index.js'

// State
const orders = ref([])
const products = ref([])
const loading = ref(true)

const searchQuery = ref('')
const statusFilter = ref('All')
const showPOSDialog = ref(false)
const showReceiptDialog = ref(false)
const selectedOrder = ref(null)
const statusOptions = ['All', 'Pending', 'Paid', 'Shipped', 'Cancelled']
const authStore = useAuthStore()

// Permissions Helper
const has = (perm) =>
  authStore.isSuperAdmin ||
  authStore.permissions.includes('*') ||
  authStore.permissions.includes(perm)

const canCreateOrder = computed(() => authStore.can('create', 'ordering') || has('ordering:create'))

let unsubscribeOrders = null
let unsubscribeProducts = null

// 2. UPDATED: Column Definitions
const columns = [
  {
    name: 'id',
    label: 'Order #', // Renamed label
    // Field prioritizes orderNumber, falls back to ID
    field: (row) => row.orderNumber || row.id,
    align: 'left',
    sortable: true,
    style: 'width: 150px', // Give it a bit more space
  },
  {
    name: 'customerName',
    label: 'Customer',
    align: 'left',
    sortable: true,
    field: (row) => {
      if (row.customer && typeof row.customer === 'object' && row.customer.name) {
        return row.customer.name
      }
      if (row.customerName) {
        return row.customerName
      }
      return 'Walk-in Customer'
    },
  },
  {
    name: 'date',
    label: 'Date',
    field: (row) => row.createdAt || row.date,
    align: 'left',
    sortable: true,
  },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'total', label: 'Total Amount', field: 'total', align: 'right', sortable: true },
  { name: 'actions', label: '', field: 'actions', align: 'center', style: 'width: 100px' },
]

onMounted(() => {
  // 1. Existing Firebase Listeners
  const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))

  unsubscribeOrders = onSnapshot(
    ordersQuery,
    (snapshot) => {
      // The store saves orderNumber, so ...doc.data() will include it
      orders.value = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      loading.value = false
    },
    (err) => {
      console.error(err)
      loading.value = false
    },
  )

  const productsQuery = query(collection(db, 'products'))

  unsubscribeProducts = onSnapshot(productsQuery, (snapshot) => {
    products.value = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  })

  // 2. AUTOMATICALLY OPEN POS FOR CASHIERS
  const userRole = authStore.user?.role?.toLowerCase() || ''

  if (userRole === 'cashier') {
    showPOSDialog.value = true
  }
})

onUnmounted(() => {
  if (unsubscribeOrders) unsubscribeOrders()
  if (unsubscribeProducts) unsubscribeProducts()
})

// 3. UPDATED: Search Logic
const filteredOrders = computed(() => {
  let list = orders.value

  // Status Filter
  if (statusFilter.value !== 'All') {
    list = list.filter((o) => o.status === statusFilter.value)
  }

  // Search Filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((o) => {
      // Search by Firestore ID
      const hasId = o.id && o.id.toLowerCase().includes(q)

      // Search by Order Number (e.g. 20260121...)
      const hasOrderNum = o.orderNumber && String(o.orderNumber).toLowerCase().includes(q)

      // Search by Customer Name
      const custName = o.customer?.name || o.customerName || ''
      const hasName = custName.toLowerCase().includes(q)

      return hasId || hasOrderNum || hasName
    })
  }
  return list
})

const formatDate = (val) => {
  if (!val) return '-'
  if (val && typeof val.toDate === 'function') {
    return (
      val.toDate().toLocaleDateString() +
      ' ' +
      val.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    )
  }
  const d = new Date(val)
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleDateString() +
        ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getStatusColor = (status) => {
  const map = {
    Pending: 'orange-7',
    Paid: 'green-6',
    Shipped: 'blue-6',
    Cancelled: 'red-5',
  }
  return map[status] || 'grey-6'
}

const formatTotal = (row) => {
  let val = row.total || row.totalAmount

  if (val === undefined || val === null) {
    const items = Array.isArray(row.items) ? row.items : []
    val = items.reduce((acc, item) => {
      const price = Number(item.unitPrice || item.price || item.productPrice || 0)
      const qty = Number(item.quantity || 1)
      return acc + price * qty
    }, 0)

    if (row.customer && row.customer.discountAmount) {
      val = val - Number(row.customer.discountAmount)
    }
  }

  return `₱${Number(val).toFixed(2)}`
}

const openReceipt = (order) => {
  selectedOrder.value = order
  showReceiptDialog.value = true
}
</script>
