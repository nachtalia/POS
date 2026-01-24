<template>
  <q-card class="glass-card chart-card">
    <q-card-section>
      <div class="row items-center justify-between" :class="{ 'column q-gutter-y-sm': $q.screen.xs }">
        <div :class="{ 'text-center': $q.screen.xs }">
          <div class="text-h6 text-weight-bold">Sales Performance</div>
          <div class="text-caption text-grey-7">{{ selectedPeriod.label }} performance metrics</div>
        </div>
        <div class="row items-center q-gutter-sm" :class="{ 'justify-center full-width': $q.screen.xs }">
          <q-btn-group unelevated class="period-selector">
            <q-btn
              v-for="period in timePeriods"
              :key="period.value"
              :label="period.label"
              :color="selectedPeriod.value === period.value ? 'primary' : 'grey-2'"
              :text-color="selectedPeriod.value === period.value ? 'white' : 'grey-8'"
              @click="changePeriod(period)"
              size="sm"
              padding="xs md"
            />
          </q-btn-group>
        </div>
      </div>
    </q-card-section>

    <q-separator color="grey-2" />

    <q-card-section>
      <div class="row q-col-gutter-sm q-mb-md justify-center">
        <div class="col-6 col-md-3" v-for="stat in miniStats" :key="stat.label">
          <div class="text-center q-pa-sm bg-grey-1 rounded-borders">
            <div :class="`text-subtitle1 text-${stat.color || 'primary'} text-weight-bolder`">
              {{ stat.value }}
            </div>
            <div class="text-caption text-grey-7" style="font-size: 0.7rem">{{ stat.label }}</div>
          </div>
        </div>
      </div>

      <div class="q-px-sm relative-position overflow-auto" style="height: 300px">
        <div v-if="chartData.length === 0" class="flex flex-center full-height text-grey-5">
          <div class="text-center">
            <q-icon name="bar_chart" size="40px" class="q-mb-sm" />
            <div>No data available for this period</div>
          </div>
        </div>

        <div v-else class="row items-end full-height" style="min-width: 500px">
          <div v-for="(data, index) in chartData" :key="index" class="col text-center full-height">
            <div class="flex column items-center justify-end full-height">
              <div
                class="chart-bar q-mx-xs shadow-1"
                :style="{
                  height: `${getChartBarHeight(data.amount)}%`,
                  width: '60%',
                  minWidth: '8px',
                  background: '#1976D2',
                  borderRadius: '4px 4px 0 0',
                }"
              >
                <q-tooltip>
                  <div class="text-center">
                    <div>{{ data.label }}</div>
                    <div class="text-weight-bold">{{ formatCurrency(data.amount) }}</div>
                    <div class="text-caption">{{ data.orders }} orders</div>
                  </div>
                </q-tooltip>
              </div>
              <div class="text-caption text-grey-6 q-mt-sm" style="font-size: 10px">
                {{ data.label }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useFormatters } from 'src/composables/useFormatters'

const props = defineProps({
  orders: { type: Array, default: () => [] },
})

const { formatCurrency } = useFormatters()

const timePeriods = [
  { label: '7 Days', value: '7days', type: 'daily', days: 7 },
  { label: 'Monthly', value: 'monthly', type: 'monthly', months: 12 },
  { label: 'Yearly', value: 'yearly', type: 'yearly', years: 5 },
]

const selectedPeriod = ref(timePeriods[0])
const chartData = ref([])
const periodStats = ref({ totalSales: 0, totalOrders: 0, avgOrderValue: 0, growth: 0 })

const miniStats = computed(() => [
  { label: 'Total Sales', value: formatCurrency(periodStats.value.totalSales) },
  { label: 'Total Orders', value: periodStats.value.totalOrders },
  { label: 'Avg. Value', value: formatCurrency(periodStats.value.avgOrderValue, true) },
  {
    label: 'Growth',
    value: `${periodStats.value.growth > 0 ? '+' : ''}${periodStats.value.growth}%`,
    color: periodStats.value.growth >= 0 ? 'positive' : 'negative',
  },
])

// --- CORE LOGIC RESTORED ---

const getDateFromOrder = (o) => {
  // Handle Firebase Timestamp or JS Date or String
  if (o.createdAt && typeof o.createdAt.toDate === 'function') return o.createdAt.toDate()
  if (o.date) return new Date(o.date)
  return new Date()
}

const getOrderTotal = (o) => {
  // Handle different property names for total
  return Number(o.total || o.totalAmount || 0)
}

const changePeriod = (period) => {
  selectedPeriod.value = period
  recalculateData()
}

const getChartBarHeight = (amount) => {
  if (chartData.value.length === 0) return 0
  const max = Math.max(...chartData.value.map((d) => d.amount), 100)
  // Cap at 85% height so tooltips don't get cut off
  return Math.max((amount / max) * 85, 2)
}

const recalculateData = () => {
  const period = selectedPeriod.value
  const orders = props.orders || []

  // 1. Build the Chart Data based on selection
  let data = []
  if (period.type === 'daily') {
    data = buildDailyData(orders, period.days)
  } else if (period.type === 'monthly') {
    data = buildMonthlyData(orders, period.months)
  } else if (period.type === 'yearly') {
    data = buildYearlyData(orders, period.years)
  }

  chartData.value = data

  // 2. Calculate Stats from the generated data
  const totalSales = data.reduce((sum, item) => sum + item.amount, 0)
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0)

  // Simple growth calculation (compare last bar vs previous bar as a rough proxy)
  // For a real app, you'd fetch the actual previous period data
  const currentVal = data[data.length - 1]?.amount || 0
  const prevVal = data[data.length - 2]?.amount || 0
  const growth = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0

  periodStats.value = {
    totalSales,
    totalOrders,
    avgOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
    growth: Math.round(growth * 10) / 10,
  }
}

// --- DATA BUILDERS ---

const buildDailyData = (orders, days) => {
  const data = []
  const today = new Date()
  today.setHours(0, 0, 0, 0) // reset time

  // Initialize array for last X days (reverse loop to start from X days ago)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)

    data.push({
      dateStr: d.toDateString(), // distinct key
      label: d.toLocaleDateString('en-US', { weekday: 'short' }),
      amount: 0,
      orders: 0,
    })
  }

  // Fill buckets
  orders.forEach((o) => {
    const d = getDateFromOrder(o)
    const key = d.toDateString()
    const bucket = data.find((b) => b.dateStr === key)

    if (bucket) {
      bucket.amount += getOrderTotal(o)
      bucket.orders++
    }
  })

  return data
}

const buildMonthlyData = (orders, months) => {
  const data = []
  const today = new Date()

  // Initialize array for last X months
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${d.getMonth()}`

    data.push({
      key: key,
      label: d.toLocaleString('default', { month: 'short' }),
      amount: 0,
      orders: 0,
    })
  }

  orders.forEach((o) => {
    const d = getDateFromOrder(o)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = data.find((b) => b.key === key)

    if (bucket) {
      bucket.amount += getOrderTotal(o)
      bucket.orders++
    }
  })

  return data
}

const buildYearlyData = (orders, years) => {
  const data = []
  const currentYear = new Date().getFullYear()

  for (let i = years - 1; i >= 0; i--) {
    const year = currentYear - i
    data.push({
      key: year,
      label: year.toString(),
      amount: 0,
      orders: 0,
    })
  }

  orders.forEach((o) => {
    const d = getDateFromOrder(o)
    const year = d.getFullYear()
    const bucket = data.find((b) => b.key === year)

    if (bucket) {
      bucket.amount += getOrderTotal(o)
      bucket.orders++
    }
  })

  return data
}

// Watch for props change (e.g. data fetch completes)
watch(
  () => props.orders,
  () => {
    recalculateData()
  },
  { deep: true },
)

onMounted(() => {
  recalculateData()
})
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 16px;
  transition: transform 0.3s ease;
}

.chart-bar {
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.period-selector .q-btn {
  font-weight: 500;
}
</style>
