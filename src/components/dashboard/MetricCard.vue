<template>
  <q-card class="text-white glass-card metric-card" :class="gradientClass">
    <q-card-section>
      <div class="row items-start justify-between">
        <div>
          <div :class="textColorClass">{{ title }}</div>
          <div class="text-h5 text-weight-bold q-mt-sm">{{ value }}</div>
        </div>
        <q-icon :name="icon" size="20px" class="opacity-50" />
      </div>

      <div
        v-if="subLabel || $slots['sub-content']"
        :class="`text-caption q-mt-md ${textColorClass}`"
      >
        <slot name="sub-content">
          {{ subLabel }}
        </slot>
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed, useSlots } from 'vue'

const props = defineProps({
  title: String,
  value: [String, Number],
  icon: String,
  gradientClass: String,
  textColor: { type: String, default: 'white' },
  subLabel: String,
})

useSlots()

// Helper to ensure valid class construction
const textColorClass = computed(() => {
  return props.textColor ? `text-${props.textColor}` : 'text-white'
})
</script>

<style scoped>
.glass-card {
  border-radius: 16px;
  /* Fixed: prevents gradient from bleeding out corners */
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(5px);
  transition: transform 0.3s ease;
}

.glass-card:hover {
  transform: translateY(-5px);
}

.opacity-50 {
  opacity: 0.5;
}

/* Gradient definitions */
.bg-gradient-primary {
  background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
}
.bg-gradient-success {
  background: linear-gradient(135deg, #26a69a 0%, #00695c 100%);
}
.bg-gradient-warning {
  background: linear-gradient(135deg, #f2c037 0%, #e65100 100%);
}
.bg-gradient-info {
  background: linear-gradient(135deg, #26c6da 0%, #0097a7 100%);
}
</style>
