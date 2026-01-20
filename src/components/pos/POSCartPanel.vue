<template>
  <div class="bg-white rounded-borders shadow-2 column fit overflow-hidden">
    <div class="row items-center justify-between q-px-md q-py-sm border-bottom bg-white z-top">
      <div class="row items-center">
        <div class="text-subtitle2 text-weight-bold row items-center">
          <q-icon
            :name="isCheckout ? 'payments' : 'shopping_bag'"
            color="primary"
            class="q-mr-sm"
            size="18px"
          />
          {{ isCheckout ? 'Payment Summary' : 'Current Order' }}
        </div>
        <q-badge color="grey-2" text-color="grey-8" class="q-ml-sm text-weight-bold">
          {{ totalItems }}
        </q-badge>
      </div>
      <q-btn
        v-if="isCheckout"
        flat
        round
        dense
        icon="close"
        color="grey-7"
        @click="isCheckout = false"
      />
    </div>

    <div v-if="!isCheckout" class="q-pa-md bg-grey-1 border-bottom">
      <q-input
        v-model="localCustomer.name"
        dense
        outlined
        label="Customer Name"
        bg-color="white"
        class="q-mb-sm"
      />
      <div class="row q-col-gutter-xs">
        <div class="col">
          <q-input
            v-model="localCustomer.address"
            dense
            outlined
            label="Address"
            bg-color="white"
          />
        </div>
      </div>
    </div>

    <q-scroll-area class="col bg-white">
      <q-list separator class="q-pa-sm">
        <q-item v-for="(item, index) in cart" :key="index" class="q-py-md rounded-borders">
          <q-item-section avatar>
            <q-img
              :src="imgMap[item.product.id] || PLACEHOLDER_IMG"
              style="width: 50px; height: 50px; border-radius: 8px"
              fit="cover"
            />
          </q-item-section>

          <q-item-section>
            <div class="row justify-between">
              <div class="text-subtitle2 text-weight-bold">{{ item.product.productName }}</div>
              <div class="text-subtitle2 text-primary">
                ₱{{ (item.unitPrice * item.quantity).toFixed(2) }}
              </div>
            </div>
            <div class="text-caption text-grey-7">
              {{ item.quantity }}x {{ item.selectedSize?.label || 'Standard' }}
            </div>
          </q-item-section>

          <q-item-section side>
            <div
              v-if="!isCheckout"
              class="column items-center bg-grey-2 rounded-borders q-pa-sm"
              style="min-width: 45px"
            >
              <q-btn
                flat
                dense
                round
                size="md"
                icon="add"
                class="bg-white shadow-1"
                @click="$emit('update-quantity', { index, delta: 1 })"
              />
              <div class="text-subtitle2 text-weight-bolder q-py-sm">{{ item.quantity }}</div>
              <q-btn
                flat
                dense
                round
                size="md"
                icon="remove"
                class="bg-white shadow-1"
                @click="$emit('update-quantity', { index, delta: -1 })"
              />
            </div>

            <q-btn
              v-else
              flat
              color="negative"
              icon="delete_sweep"
              label="Void"
              class="bg-red-1"
              size="md"
              @click="voidItem(index)"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <div class="bg-white shadow-up-3 q-pa-md">
      <div v-if="isCheckout" class="q-mb-md bg-grey-1 q-pa-md rounded-borders border-dashed">
        <q-input
          v-model.number="cashReceived"
          type="number"
          outlined
          label="Cash Received"
          bg-color="white"
          prefix="₱"
          class="q-mb-sm text-h6"
          autofocus
          @keyup.enter="handleCompleteOrder"
        />
        <div
          class="row justify-between text-subtitle1 text-weight-bold"
          :class="change < 0 ? 'text-negative' : 'text-positive'"
        >
          <span>Change:</span>
          <span>₱{{ Math.max(0, change).toFixed(2) }}</span>
        </div>
      </div>

      <div class="q-gutter-y-xs q-mb-md">
        <div class="row justify-between text-grey-7">
          <span>Subtotal</span>
          <span>₱{{ subtotal.toFixed(2) }}</span>
        </div>
        <div class="row justify-between text-grey-7">
          <span>Tax ({{ (taxRate * 100).toFixed(0) }}%)</span>
          <span>₱{{ taxAmount.toFixed(2) }}</span>
        </div>
        <div class="row justify-between text-negative" v-if="dbDiscount > 0">
          <span>Discount</span>
          <span>-₱{{ dbDiscount.toFixed(2) }}</span>
        </div>
        <q-separator class="q-my-xs" />
        <div class="row justify-between text-h6 text-primary text-weight-bolder">
          <span>Total</span>
          <span>₱{{ finalTotal.toFixed(2) }}</span>
        </div>
      </div>

      <div class="row q-gutter-sm">
        <q-btn
          v-if="isCheckout"
          flat
          color="grey-7"
          icon="arrow_back"
          label="Back"
          class="col-4"
          @click="isCheckout = false"
        />
        <q-btn
          v-else
          flat
          color="negative"
          icon="delete"
          label="Clear"
          class="col-4"
          @click="$emit('clear-cart')"
        />

        <q-btn
          :color="isCheckout ? 'positive' : 'primary'"
          :icon="isCheckout ? 'check_circle' : 'payments'"
          :label="isCheckout ? 'Complete Order' : 'Pay Now'"
          class="col-grow shadow-2"
          :disable="cart.length === 0 || (isCheckout && cashReceived < finalTotal)"
          @click="isCheckout ? handleCompleteOrder() : (isCheckout = true)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { db } from 'src/services/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { useQuasar } from 'quasar'

const props = defineProps({
  cart: Array,
  imgMap: Object,
  customer: Object,
})

const emit = defineEmits(['update:customer', 'update-quantity', 'clear-cart', 'submit-order'])
const $q = useQuasar()

// --- State ---
const isCheckout = ref(false)
const cashReceived = ref(0)
const taxRate = ref(0)
const dbDiscount = ref(0)
const localCustomer = ref({ ...props.customer })

const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// --- Database Real-time Sync ---
onMounted(() => {
  // Syncing with collection: systemSettings | Document: cfuEV4yQICQAzB1aTnzQ
  const settingsRef = doc(db, 'systemSettings', 'cfuEV4yQICQAzB1aTnzQ')
  onSnapshot(settingsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data()
      // Treating defaultTax (e.g. 60) as a percentage
      taxRate.value = (data.defaultTax || 0) / 100
      dbDiscount.value = data.defaultDiscount || 0
    }
  })
})

// --- Calculations ---
const subtotal = computed(() => props.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0))
const taxAmount = computed(() => subtotal.value * taxRate.value)
const finalTotal = computed(() => Math.max(0, subtotal.value + taxAmount.value - dbDiscount.value))
const totalItems = computed(() => props.cart.reduce((t, i) => t + i.quantity, 0))
const change = computed(() => (cashReceived.value || 0) - finalTotal.value)

// --- Methods ---
const voidItem = (index) => {
  $q.dialog({
    title: 'Void Item',
    message: 'Remove this item from the checkout list?',
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Void' },
  }).onOk(() => {
    // Delta -999 effectively removes the item regardless of current quantity
    emit('update-quantity', { index, delta: -999 })
  })
}

const handleCompleteOrder = () => {
  if (cashReceived.value < finalTotal.value) {
    $q.notify({ type: 'negative', message: 'Insufficient cash amount provided.' })
    return
  }

  emit('submit-order', {
    subtotal: subtotal.value,
    taxAmount: taxAmount.value,
    discountAmount: dbDiscount.value,
    totalAmount: finalTotal.value,
    itemCount: totalItems.value,
    taxRate: taxRate.value,
    cashReceived: cashReceived.value,
    changeAmount: change.value,
    paymentMethod: 'Cash',
  })

  // Reset local state
  isCheckout.value = false
  cashReceived.value = 0
}

// Watchers
watch(localCustomer, (val) => emit('update:customer', val), { deep: true })
watch(
  () => props.cart.length,
  (newLen) => {
    if (newLen === 0) {
      isCheckout.value = false
      cashReceived.value = 0
    }
  },
)
</script>

<style scoped>
.border-bottom {
  border-bottom: 1px solid #f0f0f0;
}
.border-dashed {
  border: 2px dashed #e0e0e0;
}
</style>
