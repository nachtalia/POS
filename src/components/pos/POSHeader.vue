<template>
  <q-header class="bg-white text-dark shadow-1 q-py-xs" height-hint="70">
    <q-toolbar class="q-px-md">
      <q-btn flat round dense icon="arrow_back" color="grey-8" @click="goToOrdering" />

      <q-toolbar-title class="row items-center text-weight-bold">
        <div class="q-pa-sm bg-primary text-white rounded-borders q-mr-md shadow-2">
          <q-icon name="point_of_sale" size="24px" />
        </div>
        <div class="column justify-center">
          <div class="text-subtitle1 text-weight-bolder leading-tight">POS Terminal</div>
          <div class="text-caption text-grey-6" style="font-size: 11px">System v2.0</div>
        </div>
      </q-toolbar-title>

      <div class="row items-center q-gutter-x-md">
        <div class="row items-center bg-grey-2 rounded-capsule q-px-md q-py-xs gt-xs">
          <q-icon name="schedule" color="primary" class="q-mr-sm" />
          <div class="column">
            <span class="text-caption text-grey-6" style="font-size: 10px">Session Time</span>
            <span class="text-weight-bold text-caption">{{ timeString }}</span>
          </div>
        </div>

        <div class="row items-center bg-grey-2 rounded-capsule q-px-md q-py-xs">
          <q-avatar size="28px" color="primary" text-color="white" class="q-mr-sm font-weight-bold">
            {{ userInitial }}
          </q-avatar>
          <div class="column gt-xs">
            <span class="text-caption text-grey-6" style="font-size: 10px">{{ userRole }}</span>
            <span class="text-weight-bold text-caption">{{ userName }}</span>
          </div>
        </div>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup>
import { computed } from 'vue'
import { date } from 'quasar'
import { useRouter } from 'vue-router' // Import the router

const props = defineProps({
  user: {
    type: Object,
    default: () => ({ displayName: 'Guest', role: 'Cashier' }),
  },
})

const router = useRouter() // Initialize the router

const goToOrdering = () => {
  // Replace '/ordering' with the actual path defined in your routes
  router.push('/ordering')
}

const timeString = computed(() => date.formatDate(Date.now(), 'hh:mm A'))

const userName = computed(() => props.user?.displayName || props.user?.email || 'Unknown')
const userRole = computed(() => props.user?.role || 'Cashier')
const userInitial = computed(() => (userName.value ? userName.value.charAt(0).toUpperCase() : '?'))
</script>

<style scoped>
.rounded-capsule {
  border-radius: 50px;
}
</style>
