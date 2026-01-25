<template>
  <q-header
    class="bg-white text-dark shadow-1"
    :class="$q.screen.lt.sm ? 'q-py-none' : 'q-py-xs'"
    height-hint="70"
  >
    <q-toolbar class="q-px-sm q-px-md-md">
      <q-btn flat round dense icon="arrow_back" color="grey-8" @click="goToOrdering" />

      <div class="row items-center no-wrap q-ml-sm">
        <div
          class="bg-primary text-white rounded-borders shadow-2 row flex-center"
          :class="$q.screen.lt.sm ? 'q-pa-xs q-mr-sm' : 'q-pa-sm q-mr-md'"
        >
          <q-icon name="point_of_sale" :size="$q.screen.lt.sm ? '20px' : '24px'" />
        </div>

        <div class="column justify-center">
          <div
            class="text-weight-bolder leading-tight"
            :class="$q.screen.lt.sm ? 'text-body1' : 'text-subtitle1'"
          >
            POS Terminal
          </div>
          <div class="text-caption text-grey-6 gt-xs" style="font-size: 11px">System v2.0</div>
        </div>
      </div>

      <q-space />

      <div
        class="row items-center no-wrap"
        :class="$q.screen.lt.sm ? 'q-gutter-x-xs' : 'q-gutter-x-md'"
      >
        <div class="row items-center bg-grey-2 rounded-capsule q-px-md q-py-xs gt-sm">
          <q-icon name="schedule" color="primary" class="q-mr-sm" />
          <div class="column">
            <span class="text-caption text-grey-6" style="font-size: 10px">Session Time</span>
            <span class="text-weight-bold text-caption">{{ timeString }}</span>
          </div>
        </div>

        <div
          class="row items-center"
          :class="$q.screen.gt.xs ? 'bg-grey-2 rounded-capsule q-px-md q-py-xs' : ''"
        >
          <q-avatar
            :size="$q.screen.lt.sm ? '32px' : '28px'"
            color="primary"
            text-color="white"
            class="text-weight-bold"
          >
            {{ userInitial }}
          </q-avatar>

          <div class="column q-ml-sm gt-xs">
            <span class="text-caption text-grey-6" style="font-size: 10px">{{ userRole }}</span>
            <span class="text-weight-bold text-caption">{{ userName }}</span>
          </div>
        </div>

        <div class="row items-center bg-grey-2 rounded-capsule q-py-xs q-px-xs">
          <q-btn
            round
            flat
            dense
            :color="isConnected ? 'positive' : 'primary'"
            icon="settings_bluetooth"
            :size="$q.screen.lt.sm ? 'sm' : 'md'"
            class="q-mr-xs"
            @click="initPrinter"
          />
          <q-btn
            round
            flat
            dense
            color="negative"
            icon="exit_to_app"
            :size="$q.screen.lt.sm ? 'sm' : 'md'"
            @click="onLogout"
          />
        </div>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup>
import PrintHub from 'printhub'
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { date } from 'quasar'
import { useRouter } from 'vue-router'
import { signOut } from 'firebase/auth'
import { auth } from 'src/services/firebase'
import { useAuthStore } from 'src/features/index.js'

const authStore = useAuthStore()
const props = defineProps({
  user: {
    type: Object,
    default: () => ({ displayName: 'Guest', role: 'Cashier' }),
  },
  cart: {
    type: Array,
    default: () => [],
  },
})

const $q = useQuasar()
const router = useRouter()

const goToOrdering = () => {
  router.push('/ordering')
}

const timeString = computed(() => date.formatDate(Date.now(), 'hh:mm A'))
const userName = computed(() => props.user?.displayName || props.user?.email || 'Unknown')
const userRole = computed(() => props.user?.role || 'Cashier')
const userInitial = computed(() => (userName.value ? userName.value.charAt(0).toUpperCase() : '?'))
const emit = defineEmits(['printerSetup'])

const isConnected = ref(false)
let printer = null

const initPrinter = () => {
  printer = new PrintHub({ paperSize: '58' })
  printer.connectToPrint({
    onReady: () => {
      isConnected.value = true
      emit('printerSetup', { connected: true, printerInstance: printer })
    },
    onFailed: (error) => {
      isConnected.value = false
      console.error('Connection failed:', error)
    },
  })
}

const onLogout = async () => {
  $q.loading.show({ message: 'Signing out...' })
  try {
    await signOut(auth)
    authStore.$reset()
    router.replace('/')
  } catch (error) {
    console.error('Logout Error:', error)
    $q.notify({ color: 'negative', message: 'Failed to sign out', icon: 'warning' })
  } finally {
    $q.loading.hide()
  }
}
</script>

<style scoped>
.rounded-capsule {
  border-radius: 50px;
}
/* Utility class to keep line-height tight on titles */
.leading-tight {
  line-height: 1.1;
}
</style>
