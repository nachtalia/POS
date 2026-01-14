<template>
  <div class="row q-col-gutter-md">
    <MetricCard
      title="Today's Sales"
      :value="format(todaySales)"
      footer="vs yesterday"
      icon="payments"
      bg-class="bg-gradient-primary"
    />

    <MetricCard
      title="Orders Today"
      :value="todayOrders"
      footer="Avg per order"
      icon="shopping_bag"
      bg-class="bg-gradient-success"
    />
  </div>
</template>

<script setup>
import MetricCard from './MetricCard.vue'

defineProps(['todaySales', 'todayOrders', 'format'])
</script>
