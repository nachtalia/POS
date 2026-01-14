<template>
  <q-card class="glass-card header-card">
    <q-card-section class="row items-center justify-between dashboard-hero">
      <div>
        <div class="text-h5 text-weight-bold gradient-text">Coffee Shop Dashboard</div>
        <div class="text-subtitle2 text-grey-8">
          Good {{ timeGreeting }}, Admin! Here's your business overview
        </div>
      </div>

      <div class="row q-gutter-sm">
        <q-btn flat color="primary" icon="refresh" @click="$emit('refresh')" round dense>
          <q-tooltip>Refresh Data</q-tooltip>
        </q-btn>

        <q-btn-dropdown color="primary" icon="cloud_download" label="Export" flat dense no-caps>
          <q-list>
            <q-item clickable v-close-popup @click="$emit('open-export')">
              <q-item-section avatar><q-icon name="filter_alt" color="positive" /></q-item-section>
              <q-item-section>
                <q-item-label>Export Sales Report</q-item-label>
                <q-item-label caption>Filter by days</q-item-label>
              </q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="$emit('download-inventory')">
              <q-item-section avatar><q-icon name="inventory" color="info" /></q-item-section>
              <q-item-section><q-item-label>Export Inventory</q-item-label></q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>

        <q-btn
          color="grey-9"
          flat
          icon="logout"
          label="Logout"
          no-caps
          @click="$emit('logout')"
          dense
        />
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
import { computed } from 'vue'

const timeGreeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
})

defineEmits(['refresh', 'open-export', 'download-inventory', 'logout'])
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  border-radius: 16px;
}
.gradient-text {
  background: linear-gradient(45deg, #1976d2, #26a69a);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
</style>
