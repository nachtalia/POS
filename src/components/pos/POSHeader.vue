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

        <div class="row items-center bg-grey-2 rounded-capsule q-py-xs">
          <!-- <q-btn
            round
            color="secondary"
            icon="shopping_cart"
            @click="$emit('showCart')"
          >
            <q-badge color="primary" floating>{{ cart.length }}</q-badge>
          </q-btn> -->

          <q-btn
            round
            :color="isConnected ? 'positive' : 'primary'"
            icon="settings_bluetooth"
            class="q-mr-sm"
            @click="initPrinter"
          />
          <q-btn
            round
            color="negative"
            icon="exit_to_app"
            @click="onLogout"
          />
        </div>
      </div>
    </q-toolbar>
  </q-header>
</template>

<script setup>
import PrintHub from "printhub";
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { date } from 'quasar'
import { useRouter } from 'vue-router' // Import the router
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

const router = useRouter() // Initialize the router

const goToOrdering = () => {
  // Replace '/ordering' with the actual path defined in your routes
  router.push('/ordering')
}

const timeString = computed(() => date.formatDate(Date.now(), 'hh:mm A'))

const userName = computed(() => props.user?.displayName || props.user?.email || 'Unknown')
const userRole = computed(() => props.user?.role || 'Cashier')
const userInitial = computed(() => (userName.value ? userName.value.charAt(0).toUpperCase() : '?'))
const emit = defineEmits(['printerSetup']);

const isConnected = ref(false);
let printer = null;

// Initialize the PrintHub instance (58mm is standard for mobile BT printers)
const initPrinter = () => {
  printer = new PrintHub({ paperSize: '58' });

  // This opens the browser's Bluetooth device picker
  printer.connectToPrint({
    onReady: () => {
      isConnected.value = true;
      emit('printerSetup', {
        connected: true,
        printerInstance: printer
      });
    },
    onFailed: (error) => {
      isConnected.value = false;
      console.error('Connection failed:', error);
    }
  });
};

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
</style>
