<template>
  <q-card class="glass-card chart-card">
    <q-card-section>
      <div class="row items-center justify-between">
        <div>
          <div class="text-h6 text-weight-bold">Sales Performance</div>
          <div class="text-caption text-grey-7">{{ selectedPeriod.label }} performance metrics</div>
        </div>
        <div class="row items-center q-gutter-sm">
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
          <q-btn-dropdown :label="currentChartLabel" flat dense no-caps size="sm" color="grey-8">
            <q-list>
              <q-item
                v-for="type in chartTypes"
                :key="type.value"
                clickable
                v-close-popup
                @click="chartType = type.value"
              >
                <q-item-section avatar><q-icon :name="type.icon" size="xs" /></q-item-section>
                <q-item-section>{{ type.label }}</q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
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

      <div style="height: 300px" class="q-px-sm relative-position">
        <div v-if="chartType === 'bar'" class="row items-end full-height">
          <div v-for="(data, index) in chartData" :key="index" class="col text-center full-height">
            <div class="flex column items-center justify-end full-height">
              <div
                class="chart-bar q-mx-xs shadow-1"
                :style="{
                  height: `${getChartBarHeight(data.amount)}%`,
                  width: '60%',
                  background: '#1976D2',
                  borderRadius: '8px 8px 0 0',
                }"
              >
                <q-tooltip>{{ data.label }}: {{ formatCurrency(data.amount) }}</q-tooltip>
              </div>
              <div class="text-caption text-grey-6 q-mt-sm">{{ data.label }}</div>
            </div>
          </div>
        </div>

        <div v-else class="flex flex-center full-height text-grey-5">
          [Image of Chart Visualization]

          <div class="text-center">
            SVG Logic (Line/Area) uses computed props based on `chartData`
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
  orders: { type: Array, default: () => [] }, // Raw orders
})

const { formatCurrency } = useFormatters()
const chartType = ref('bar')
const chartTypes = [
  { label: 'Bar', value: 'bar', icon: 'bar_chart' },
  { label: 'Line', value: 'line', icon: 'show_chart' },
  { label: 'Area', value: 'area', icon: 'area_chart' },
]

const timePeriods = [
  { label: '7 Days', value: '7days', type: 'daily', days: 7 },
  { label: 'Monthly', value: 'monthly', type: 'monthly', months: 12 },
  { label: 'Yearly', value: 'yearly', type: 'yearly', years: 5 },
]
const selectedPeriod = ref(timePeriods[0])
const chartData = ref([])
const periodStats = ref({ totalSales: 0, totalOrders: 0, avgOrderValue: 0, growth: 0 })

const currentChartLabel = computed(() => chartTypes.find((t) => t.value === chartType.value)?.label)

const miniStats = computed(() => [
  { label: 'Sales', value: formatCurrency(periodStats.value.totalSales) },
  { label: 'Orders', value: periodStats.value.totalOrders },
  { label: 'Avg. Value', value: formatCurrency(periodStats.value.avgOrderValue, true) },
  {
    label: 'Growth',
    value: `${periodStats.value.growth}%`,
    color: periodStats.value.growth >= 0 ? 'positive' : 'negative',
  },
])

const changePeriod = (period) => {
  selectedPeriod.value = period
  recalculateData()
}

// Data Processing Logic (Moved from Parent)
const recalculateData = () => {
  // Implement the buildDailyData / buildMonthlyData logic here
  // using props.orders and selectedPeriod.value
  // Update chartData.value and periodStats.value
  console.log('Recalculating chart for', selectedPeriod.value.label)
  // NOTE: For the refactor, paste the 'buildDailyData' etc functions here
}

watch(() => props.orders, recalculateData, { deep: true })
onMounted(recalculateData)

// Helper for bar height
const getChartBarHeight = (amount) => {
  const max = Math.max(...chartData.value.map((d) => d.amount), 100)
  return (amount / max) * 80
}
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
}
.chart-bar {
  transition: height 0.4s ease;
}
</style>
