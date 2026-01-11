<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="glass-card">
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6">Transactions</div>
            <q-space />
            <q-btn color="grey-7" icon="download" flat class="q-ml-sm" @click="exportTransactions" />
          </q-card-section>

          <q-card-section>
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-input v-model="searchQuery" outlined dense placeholder="Search">
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                  <template v-slot:append v-if="searchQuery">
                    <q-icon name="close" @click="searchQuery = ''" class="cursor-pointer" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-3">
                <q-input v-model="fromDate" outlined dense label="From" readonly>
                  <template v-slot:prepend>
                    <q-icon name="event" />
                  </template>
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="fromDate" mask="YYYY-MM-DD" today-btn />
                  </q-popup-proxy>
                </q-input>
              </div>
              <div class="col-12 col-md-3">
                <q-input v-model="toDate" outlined dense label="To" readonly>
                  <template v-slot:prepend>
                    <q-icon name="event" />
                  </template>
                  <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                    <q-date v-model="toDate" mask="YYYY-MM-DD" today-btn />
                  </q-popup-proxy>
                </q-input>
              </div>
            </div>

            <q-table
              :rows="filteredTransactions"
              :columns="columns"
              row-key="id"
              flat
              bordered
            >
              <template v-slot:no-data>
                <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-8">
                  <q-icon size="2em" name="receipt_long" />
                  <span>No transactions</span>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useOrderStore } from '../../stores/orderStore'

const orderStore = useOrderStore()

const searchQuery = ref('')
const fromDate = ref('')
const toDate = ref('')

const columns = [
  { name: 'id', label: 'ID', field: 'id', align: 'left', sortable: true },
  { name: 'customerName', label: 'Customer', field: 'customerName', align: 'left', sortable: true },
  { name: 'date', label: 'Date', field: 'date', align: 'left', sortable: true, format: val => new Date(val).toLocaleString() },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'total', label: 'Total', field: 'total', align: 'right', sortable: true, format: val => `$${Number(val || 0).toFixed(2)}` },
]

const filteredTransactions = computed(() => {
  let list = orderStore.orders || []
  const from = fromDate.value ? new Date(fromDate.value) : null
  const to = toDate.value ? new Date(toDate.value + 'T23:59:59') : null
  if (from || to) {
    list = list.filter(t => {
      const d = new Date(t.date || t.createdAt)
      if (Number.isNaN(d.getTime())) return false
      if (from && d < from) return false
      if (to && d > to) return false
      return true
    })
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t =>
      (t.id && t.id.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.status && t.status.toLowerCase().includes(q))
    )
  }
  return list
})

const exportTransactions = () => {
  console.log('Export transactions:', filteredTransactions.value.length)
}

onMounted(async () => {
  if (!orderStore.orders.length) {
    await orderStore.fetchOrders()
  }
})
</script>
