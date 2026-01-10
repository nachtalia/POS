<template>
  <div class="row q-col-gutter-md">
    <div class="col-12">
      <q-card>
        <q-card-section>
          <div class="text-h6">Order Management</div>
          <div class="text-subtitle2">Process and track customer orders</div>
        </q-card-section>

        <q-separator />

        <q-card-section>
          <div class="row q-col-gutter-md q-mb-md">
            <div class="col-12 col-md-4">
              <q-select
                v-model="statusFilter"
                :options="statusOptions"
                outlined
                dense
                label="Filter by Status"
              />
            </div>
            <div class="col-12 col-md-4">
              <q-input v-model="searchQuery" outlined dense placeholder="Search orders...">
                <template v-slot:prepend>
                  <q-icon name="search" />
                </template>
              </q-input>
            </div>
            <div class="col-12 col-md-4">
              <q-btn
                color="primary"
                icon="add"
                label="New Order"
                @click="showNewOrderDialog = true"
              />
            </div>
          </div>

          <q-table
            :rows="filteredOrders"
            :columns="columns"
            row-key="id"
            :loading="orderStore.loading"
            flat
            bordered
          >
            <template v-slot:no-data="{ filter }">
              <div class="full-width row flex-center q-pa-lg text-grey-8">
                <q-icon size="2em" :name="filter ? 'filter_list_off' : 'receipt_long'" />
                <span class="q-ml-sm">
                  {{ filter ? 'No matches found' : 'No orders in database' }}
                </span>
              </div>
            </template>

            <template v-slot:body-cell-status="props">
              <q-td :props="props">
                <q-chip :color="getStatusColor(props.row.status)" text-color="white" dense>
                  {{ props.row.status }}
                </q-chip>
              </q-td>
            </template>

            <template v-slot:body-cell-total="props">
              <q-td :props="props"> ${{ Number(props.row.total || 0).toFixed(2) }} </q-td>
            </template>

            <template v-slot:body-cell-actions="props">
              <q-td :props="props">
                <q-btn flat round dense icon="visibility" color="primary" @click="viewOrder(props.row)" />
                <q-btn flat round dense icon="delete" color="negative" @click="confirmDelete(props.row)" />
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="showNewOrderDialog" persistent maximized>
      <q-card>
        <q-card-section class="row items-center">
          <div class="text-h6">Create New Order</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="closeOrderDialog" />
        </q-card-section>

        <q-card-section class="scroll" style="max-height: 70vh">
          <div class="row q-col-gutter-md">
            <div class="col-12 col-md-6">
              <q-input v-model="newOrder.customerName" label="Customer Name" outlined dense class="q-mb-sm" />
              <q-input v-model="newOrder.customerEmail" label="Email" outlined dense class="q-mb-sm" />
            </div>
            <div class="col-12 col-md-6">
              <div class="text-subtitle2 q-mb-sm">Items</div>
              <div v-for="(item, index) in newOrder.items" :key="index" class="row q-gutter-x-sm q-mb-xs">
                <q-select 
                  v-model="item.product" 
                  :options="productOptions" 
                  label="Product" 
                  outlined dense class="col"
                />
                <q-input v-model.number="item.quantity" type="number" label="Qty" outlined dense style="width: 80px" />
                <q-btn flat round color="negative" icon="remove_circle" @click="removeOrderItem(index)" />
              </div>
              <q-btn flat color="primary" icon="add" label="Add Item" @click="addOrderItem" />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="bg-white text-primary">
          <div class="text-h6 q-mr-lg">Total: ${{ calculateOrderTotal.toFixed(2) }}</div>
          <q-btn flat label="Cancel" @click="closeOrderDialog" />
          <q-btn unelevated label="Create Order" color="primary" @click="handleCreateOrder" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useOrderStore } from '../../stores/orderStore.js'
import { useProductStore } from '../../stores/productStore.js'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const orderStore = useOrderStore()
const productStore = useProductStore()

const searchQuery = ref('')
const statusFilter = ref('All')
const showNewOrderDialog = ref(false)
const statusOptions = ['All', 'Pending', 'Paid', 'Shipped', 'Cancelled']

const newOrder = reactive({
  customerName: '',
  customerEmail: '',
  items: [],
  status: 'Pending'
})

const columns = [
  { name: 'id', label: 'Order ID', field: 'id', align: 'left' },
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' }
]

onMounted(async () => {
  await orderStore.fetchOrders()
  await productStore.fetchProducts()
})

const productOptions = computed(() => {
  return productStore.products.map(p => ({
    label: `${p.name} ($${p.price})`,
    value: p.id,
    price: p.price
  }))
})

const filteredOrders = computed(() => {
  let list = orderStore.orders
  if (statusFilter.value !== 'All') list = list.filter(o => o.status === statusFilter.value)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(o => o.customerName.toLowerCase().includes(q) || o.id.toLowerCase().includes(q))
  }
  return list
})

const calculateOrderTotal = computed(() => {
  return newOrder.items.reduce((acc, item) => {
    return acc + ((item.product?.price || 0) * (item.quantity || 0))
  }, 0)
})

const addOrderItem = () => newOrder.items.push({ product: null, quantity: 1 })
const removeOrderItem = (index) => newOrder.items.splice(index, 1)

const getStatusColor = (status) => {
  const map = { Pending: 'orange', Paid: 'positive', Shipped: 'blue', Cancelled: 'negative' }
  return map[status] || 'grey'
}

const handleCreateOrder = async () => {
  try {
    const payload = {
      ...newOrder,
      total: calculateOrderTotal.value,
      date: new Date().toISOString()
    }
    await orderStore.addOrder(payload)
    $q.notify({ color: 'positive', message: 'Order created successfully' })
    closeOrderDialog()
  } catch {
    $q.notify({ color: 'negative', message: 'Failed to create order' })
  }
}

const confirmDelete = (order) => {
  $q.dialog({
    title: 'Delete Order',
    message: 'Are you sure?',
    cancel: true
  }).onOk(async () => {
    await orderStore.deleteOrder(order.id)
  })
}

const viewOrder = (order) => console.log(order)

const closeOrderDialog = () => {
  showNewOrderDialog.value = false
  Object.assign(newOrder, { customerName: '', customerEmail: '', items: [], status: 'Pending' })
}
</script>