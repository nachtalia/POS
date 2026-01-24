<template>
  <q-page :padding="$q.screen.gt.xs" class="bg-app" :class="{ 'q-pa-sm': $q.screen.xs }">
    <div class="row" :class="$q.screen.gt.xs ? 'q-col-gutter-md' : 'q-col-gutter-sm'">
      <div class="col-12">
        <DashboardHeader
          @refresh="refreshData"
          @logout="handleLogout"
          @open-export="showExportDialog = true"
          @download-inventory="downloadInventoryReport"
        />
      </div>

      <div class="col-12">
        <div
          class="row"
          :class="{
            'no-wrap q-col-gutter-xs': $q.screen.xs,
            'q-col-gutter-md': $q.screen.gt.xs,
          }"
        >
          <div class="col-3 col-sm-6 col-md-3">
            <MetricCard
              title="Sales"
              :value="formatCurrency(todaySales)"
              :icon="$q.screen.xs ? '' : 'payments'"
              gradient-class="bg-gradient-primary"
              text-color="blue-1"
            >
              <template #sub-content v-if="!$q.screen.xs">
                <div class="row items-center q-gutter-x-xs">
                  <q-icon :name="salesGrowth >= 0 ? 'trending_up' : 'trending_down'" />
                  <span>{{ Math.abs(salesGrowth) }}% vs yesterday</span>
                </div>
              </template>
            </MetricCard>
          </div>

          <div class="col-3 col-sm-6 col-md-3">
            <MetricCard
              title="Orders"
              :value="todayOrders"
              :icon="$q.screen.xs ? '' : 'shopping_bag'"
              gradient-class="bg-gradient-success"
              text-color="green-1"
              :sub-label="$q.screen.xs ? '' : `Avg. ${formatCurrency(averageOrderValue)} / order`"
            />
          </div>

          <div class="col-3 col-sm-6 col-md-3">
            <MetricCard
              title="Stock"
              :value="lowStockItems"
              :icon="$q.screen.xs ? '' : 'inventory_2'"
              gradient-class="bg-gradient-warning"
              text-color="orange-1"
              :sub-label="$q.screen.xs ? '' : `${criticalStockItems} items critical`"
            />
          </div>

          <div class="col-3 col-sm-6 col-md-3">
            <MetricCard
              title="Tables"
              :value="activeTables"
              :icon="$q.screen.xs ? '' : 'table_restaurant'"
              gradient-class="bg-gradient-info"
              text-color="cyan-1"
              :sub-label="$q.screen.xs ? '' : `${occupiedTables} of ${totalTables} occupied`"
            />
          </div>
        </div>
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

// Child Components
import DashboardHeader from 'src/components/dashboard/DashboardHeader.vue'
import MetricCard from 'src/components/dashboard/MetricCard.vue'
import SalesChart from 'src/components/dashboard/SalesChart.vue'
import RecentOrders from 'src/components/dashboard/RecentOrders.vue'
import ExportDialog from 'src/components/dashboard/ExportDialog.vue'

// --- SETUP ---
const router = useRouter()
const orderStore = useOrderStore()
const productStore = useProductStore()
const { formatCurrency } = useFormatters()

// --- STATE ---
const showExportDialog = ref(false)
// Table state (Mock data - connect to a store if you have one)
const activeTables = ref(4)
const occupiedTables = ref(4)
const totalTables = ref(12)

// --- COMPUTED: CORE METRICS ---

// Helper to check dates
const isSameDay = (d1, d2) =>
  d1.getDate() === d2.getDate() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getFullYear() === d2.getFullYear()

const todayOrders = computed(() => {
  const now = new Date()
  return orderStore.orders.filter((o) => isSameDay(o.createdAt?.toDate() || new Date(o.date), now))
    .length
})

const todaySales = computed(() => {
  const now = new Date()
  return orderStore.orders
    .filter((o) => isSameDay(o.createdAt?.toDate() || new Date(o.date), now))
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0)
})

const averageOrderValue = computed(() =>
  todayOrders.value > 0 ? todaySales.value / todayOrders.value : 0,
)

// --- COMPUTED: INVENTORY ---
const lowStockItems = computed(
  () => productStore.products.filter((p) => (p.stock ?? 0) <= 5).length,
)
const criticalStockItems = computed(
  () => productStore.products.filter((p) => (p.stock ?? 0) <= 2).length,
)

// --- COMPUTED: COMPARISON (Today vs Yesterday) ---
const salesGrowth = computed(() => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todaySum = todaySales.value

  const yesterdaySum = orderStore.orders
    .filter((o) => isSameDay(o.createdAt?.toDate() || new Date(o.date), yesterday))
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0)

  if (yesterdaySum === 0) return 100 // Avoid divide by zero

  const diff = ((todaySum - yesterdaySum) / yesterdaySum) * 100
  return Math.round(diff * 10) / 10
})

// --- COMPUTED: LISTS ---
const recentOrders = computed(() => {
  return [...orderStore.orders]
    .sort(
      (a, b) =>
        (b.createdAt?.toDate() || new Date(b.date)) - (a.createdAt?.toDate() || new Date(a.date)),
    )
    .slice(0, 5)
})

// --- ACTIONS ---
const refreshData = async () => {
  await Promise.all([orderStore.fetchOrders(), productStore.fetchProducts()])
}

const handleLogout = async () => {
  try {
    await signOut(auth)
    router.push('/login')
  } catch (error) {
    console.error('Logout failed:', error)
  }
}

const executeExportCSV = (options) => {
  console.log('Exporting...', options)
  showExportDialog.value = false
  // Add actual export logic here or move to composable
}

const downloadInventoryReport = () => {
  console.log('Downloading inventory report...')
}

// --- LIFECYCLE ---
onMounted(() => {
  refreshData()
})
</script>
