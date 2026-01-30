<template>
  <q-page :padding="$q.screen.gt.xs" class="bg-app" :class="{ 'q-pa-sm': $q.screen.xs }">
    <div class="row" :class="$q.screen.gt.xs ? 'q-col-gutter-md' : 'q-col-gutter-sm'">
      <div class="col-12 q-mt-sm">
        <DashboardHeader
          :title="brandTitle"
          @refresh="refreshData"
          @logout="handleLogout"
          @open-export="showExportDialog = true"
          @download-inventory="downloadInventoryReport"
        />
      </div>

      <div class="col-12" v-if="branchOptions.length">
        <div class="row items-center q-col-gutter-sm">
          <div class="col-12 col-md-4">
            <q-select
              v-model="branchFilter"
              :options="branchOptions"
              label="Branch (Super Admin)"
              outlined
              dense
              emit-value
              map-options
            />
          </div>
          <div class="col-auto" v-if="branchFilter">
            <q-chip color="primary" text-color="white">Showing: {{ currentBranchLabel }}</q-chip>
          </div>
          <div class="col-auto" v-if="branchFilter">
            <q-btn flat dense label="Clear" @click="branchFilter = null" />
          </div>
          <div class="col-auto">
            <q-btn flat dense label="Sync Branches" @click="syncBranches" />
          </div>
        </div>
      </div>

      <div class="col-12 q-mt-md q-mb-md">
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
        <SalesChart :orders="filteredOrders" />
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
import { useUserManagementStore } from 'src/stores/usermanagementStore'
import { useAuthStore } from 'src/features/index.js'

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
const userStore = useUserManagementStore()
const authStore = useAuthStore()
const { formatCurrency } = useFormatters()

// Branch filter (main account only)
const branchFilter = ref(null)
const branchOptions = computed(() => {
  if (!authStore.isMainAdmin) return []

  const users = userStore.users || []
  const normalizeRole = (role) =>
    String(role || '')
      .toLowerCase()
      .replace(/[\s_]+/g, '')
  const orgOwnerUid = authStore.orgOwnerUid

  const owners = users.filter((u) => {
    const uid = u.uid || u.id
    if (!uid || uid === authStore.user?.uid) return false

    const role = normalizeRole(u.role)
    if (role !== 'superadmin') return false

    if (u.orgOwnerUid && orgOwnerUid) return u.orgOwnerUid === orgOwnerUid
    return u.branchId === authStore.user?.uid
  })

  const map = new Map()
  owners.forEach((u) => {
    const uid = u.uid || u.id
    if (!map.has(uid)) {
      map.set(uid, { label: u.username || u.email || uid, value: uid })
    }
  })

  const list = Array.from(map.values()).sort((a, b) =>
    String(a.label).localeCompare(String(b.label)),
  )
  return [{ label: 'Overall', value: 'ALL' }, ...list]
})
const filteredOrders = computed(() => {
  const all = orderStore.orders || []
  if (!authStore.isMainAdmin || !branchFilter.value || branchFilter.value === 'ALL') return all
  return all.filter((o) => o.branchId === branchFilter.value)
})
const filteredProducts = computed(() => {
  const all = productStore.products || []
  if (!authStore.isMainAdmin || !branchFilter.value || branchFilter.value === 'ALL') return all
  return all.filter((p) => p.branchId === branchFilter.value)
})

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

const normalizeDate = (d) => {
  if (!d) return null
  if (typeof d?.toDate === 'function') return d.toDate()
  const js = new Date(d)
  return Number.isNaN(js.getTime()) ? null : js
}

const todayOrders = computed(() => {
  const now = new Date()
  return filteredOrders.value.filter((o) => {
    const od = normalizeDate(o.createdAt || o.date)
    return od ? isSameDay(od, now) : false
  }).length
})

const todaySales = computed(() => {
  const now = new Date()
  return filteredOrders.value
    .filter((o) => {
      const od = normalizeDate(o.createdAt || o.date)
      return od ? isSameDay(od, now) : false
    })
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0)
})

const averageOrderValue = computed(() =>
  todayOrders.value > 0 ? todaySales.value / todayOrders.value : 0,
)

// --- COMPUTED: INVENTORY ---
const lowStockItems = computed(
  () => filteredProducts.value.filter((p) => (p.stock ?? 0) <= 5).length,
)
const criticalStockItems = computed(
  () => filteredProducts.value.filter((p) => (p.stock ?? 0) <= 2).length,
)

// --- COMPUTED: COMPARISON (Today vs Yesterday) ---
const salesGrowth = computed(() => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const todaySum = todaySales.value

  const yesterdaySum = filteredOrders.value
    .filter((o) => {
      const od = normalizeDate(o.createdAt || o.date)
      return od ? isSameDay(od, yesterday) : false
    })
    .reduce((sum, o) => sum + Number(o.total || o.totalAmount || 0), 0)

  if (yesterdaySum === 0) return 100 // Avoid divide by zero

  const diff = ((todaySum - yesterdaySum) / yesterdaySum) * 100
  return Math.round(diff * 10) / 10
})

// --- COMPUTED: LISTS ---
const recentOrders = computed(() => {
  return [...filteredOrders.value]
    .sort((a, b) => {
      const bd = normalizeDate(b.createdAt || b.date)
      const ad = normalizeDate(a.createdAt || a.date)
      return (bd?.getTime?.() || 0) - (ad?.getTime?.() || 0)
    })
    .slice(0, 5)
})

// --- ACTIONS ---
const refreshData = async () => {
  await userStore.fetchUsers()
  if (authStore.isMainAdmin) {
    const users = userStore.users || []
    const normalizeRole = (role) =>
      String(role || '')
        .toLowerCase()
        .replace(/[\s_]+/g, '')
    const orgOwnerUid = authStore.orgOwnerUid
    const branchIds = users
      .filter((u) => normalizeRole(u.role) === 'superadmin')
      .filter((u) =>
        u.orgOwnerUid ? u.orgOwnerUid === orgOwnerUid : u.branchId === authStore.user?.uid,
      )
      .map((u) => u.uid || u.id)
      .filter(Boolean)
    await Promise.all([
      orderStore.fetchOrdersForDashboard(branchIds),
      productStore.fetchProductsForDashboard(branchIds),
    ])
  } else {
    await Promise.all([orderStore.fetchOrders(), productStore.fetchProducts()])
  }
}

const syncBranches = async () => {
  await userStore.backfillBranchOwnersForMain()
  await refreshData()
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

const currentBranchLabel = computed(() => {
  const opt = branchOptions.value.find((o) => o.value === branchFilter.value)
  return opt?.label || 'All branches'
})

const brandTitle = computed(() => {
  const label = currentBranchLabel.value
  if (label && label !== 'All branches') return `${label} Dashboard`
  return 'Dashboard'
})

// --- LIFECYCLE ---
onMounted(() => {
  refreshData()
})
</script>
