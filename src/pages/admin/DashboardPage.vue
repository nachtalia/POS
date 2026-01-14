<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <DashboardHeader
          @refresh="refreshData"
          @logout="handleLogout"
          @open-export="showExportDialog = true"
          @download-inventory="downloadInventoryReport"
        />
      </div>

      <div class="col-12 col-md-3">
        <MetricCard
          title="Today's Sales"
          :value="formatCurrency(todaySales)"
          icon="payments"
          gradient-class="bg-gradient-primary"
          text-color="blue-1"
        >
          <template #sub-content>
            <q-icon :name="salesComparison >= 0 ? 'trending_up' : 'trending_down'" />
            {{ salesComparison }}% vs yesterday
          </template>
        </MetricCard>
      </div>

      <div class="col-12 col-md-3">
        <MetricCard
          title="Orders Today"
          :value="todayOrders"
          icon="shopping_bag"
          gradient-class="bg-gradient-success"
          text-color="green-1"
          :sub-label="`Avg. ${formatCurrency(averageOrderValue)} per order`"
        />
      </div>

      <div class="col-12 col-md-3">
        <MetricCard
          title="Low Stock Items"
          :value="lowStockItems"
          icon="inventory_2"
          gradient-class="bg-gradient-warning"
          text-color="orange-1"
          :sub-label="`${criticalStockItems} items critical`"
        />
      </div>

      <div class="col-12 col-md-3">
        <MetricCard
          title="Active Tables"
          :value="activeTables"
          icon="table_restaurant"
          gradient-class="bg-gradient-info"
          text-color="cyan-1"
          :sub-label="`${occupiedTables} of ${totalTables} occupied`"
        />
      </div>

      <div class="col-12 col-md-8">
        <SalesChart :orders="orderStore.orders" />
      </div>

      <div class="col-12 col-md-4">
        <RecentOrders :orders="recentOrders" />
      </div>
    </div>

    <ExportDialog v-model="showExportDialog" @export="executeExportCSV" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from 'src/services/firebase'
import { useOrderStore } from 'src/stores/orderStore'
import { useProductStore } from 'src/stores/productStore'
import { useFormatters } from 'src/composables/useFormatters'

// Components
import DashboardHeader from 'src/components/dashboard/DashboardHeader.vue'
import MetricCard from 'src/components/dashboard/MetricCard.vue'
import SalesChart from 'src/components/dashboard/SalesChart.vue'
import RecentOrders from 'src/components/dashboard/RecentOrders.vue'
import ExportDialog from 'src/components/dashboard/ExportDialog.vue'

// Logic
const router = useRouter()
const orderStore = useOrderStore()
const productStore = useProductStore()
const { formatCurrency } = useFormatters()

const showExportDialog = ref(false)
const activeTables = ref(0)
const occupiedTables = ref(0)
const totalTables = ref(0)

// Computed Stats
const todayOrders = computed(() => {
  // Simple filter for "today"
  const now = new Date()
  return orderStore.orders.filter((o) => {
    const d = o.createdAt?.toDate() || new Date(o.date)
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
  }).length
})

const todaySales = computed(() => {
  const now = new Date()
  return orderStore.orders
    .filter((o) => {
      const d = o.createdAt?.toDate() || new Date(o.date)
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth()
    })
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0)
})

const averageOrderValue = computed(() =>
  todayOrders.value > 0 ? todaySales.value / todayOrders.value : 0,
)

const lowStockItems = computed(
  () => productStore.products.filter((p) => (p.stock ?? 0) <= 5).length,
)
const criticalStockItems = computed(
  () => productStore.products.filter((p) => (p.stock ?? 0) <= 2).length,
)

// Sales Comparison Logic (Simplified for brevity)
const salesComparison = ref(12.5) // You can calculate this by comparing today vs yesterday sums

const recentOrders = computed(() => {
  return [...orderStore.orders]
    .sort(
      (a, b) =>
        (b.createdAt?.toDate() || new Date(b.date)) - (a.createdAt?.toDate() || new Date(a.date)),
    )
    .slice(0, 5)
})

// Actions
const refreshData = async () => {
  await Promise.all([orderStore.fetchOrders(), productStore.fetchProducts()])
}

const handleLogout = async () => {
  await signOut(auth)
  router.push('/login')
}

const executeExportCSV = (options) => {
  console.log('Exporting with options:', options)
  showExportDialog.value = false
}
const downloadInventoryReport = () => {
  console.log('Downloading inventory...')
}

onMounted(() => {
  refreshData()
})
</script>
