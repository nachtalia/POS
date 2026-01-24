<template>
  <q-card class="glass-card full-height">
    <q-expansion-item
      v-model="expanded"
      :hide-expand-icon="!$q.screen.lt.md"
      :class="{ 'non-selectable-header': !$q.screen.lt.md }"
    >
      <template v-slot:header>
        <q-item-section>
          <div class="text-h6 text-weight-bold">Recent Orders</div>
          <div class="text-caption text-grey-7">Last 5 transactions</div>
        </q-item-section>
      </template>

      <q-list separator>
        <q-item v-for="order in orders" :key="order.id" :class="$q.screen.xs ? 'q-py-sm' : 'q-py-md'">
          <q-item-section avatar>
            <q-avatar
              color="blue-1"
              text-color="primary"
              icon="receipt_long"
              :size="$q.screen.xs ? 'md' : '40px'"
            />
          </q-item-section>
          <q-item-section>
            <q-item-label class="text-weight-bold" :class="{ 'text-subtitle2': $q.screen.xs }">
              Order #{{ order.id }}
            </q-item-label>
            <q-item-label caption>
              {{ formatTime(order.createdAt || order.date) }} • {{ getItemCount(order) }} items
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <div class="text-right">
              <div
                class="text-weight-bold"
                :class="$q.screen.xs ? 'text-caption' : 'text-subtitle2'"
              >
                {{ formatCurrency(orderTotal(order)) }}
              </div>
              <q-badge
                :color="getOrderStatusColor(order.status)"
                :label="order.status"
                outline
                class="q-mt-xs"
                :class="{ 'text-caption': $q.screen.xs }"
              />
            </div>
          </q-item-section>
        </q-item>
      </q-list>

      <q-card-actions align="center" class="q-pa-md">
        <q-btn
          outline
          color="primary"
          label="View All Orders"
          to="/orders"
          class="full-width"
          no-caps
        />
      </q-card-actions>
    </q-expansion-item>
  </q-card>
</template>

<script setup>
import { useFormatters } from 'src/composables/useFormatters'
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

defineProps({
  orders: { type: Array, default: () => [] },
})

const $q = useQuasar()
const { formatCurrency, formatTime } = useFormatters()

const mobileExpanded = ref(true)

const expanded = computed({
  get() {
    return !$q.screen.lt.md || mobileExpanded.value
  },
  set(val) {
    if ($q.screen.lt.md) {
      mobileExpanded.value = val
    }
  },
})

const getItemCount = (order) => {
  return order.itemCount || (Array.isArray(order.items) ? order.items.length : 0)
}

const getOrderStatusColor = (status) => {
  const colors = {
    Completed: 'positive',
    Preparing: 'warning',
    Pending: 'info',
    Cancelled: 'negative',
  }
  return colors[status] || 'grey'
}

const orderTotal = (order) => {
  const t = order.totalAmount ?? order.total
  if (typeof t === 'number') return t
  // Fallback calculation logic if needed
  return 0
}
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
}
.non-selectable-header :deep(.q-item) {
  cursor: default !important;
}
.non-selectable-header :deep(.q-focus-helper) {
  display: none !important;
}
</style>
