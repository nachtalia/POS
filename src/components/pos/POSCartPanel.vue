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
        :disable="isProcessing"
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
      <q-input v-model="localCustomer.address" dense outlined label="Address" bg-color="white" />
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
                :icon="item.quantity === 1 ? 'delete' : 'remove'"
                :color="item.quantity === 1 ? 'negative' : 'black'"
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
              :disable="isProcessing"
            />
          </q-item-section>
        </q-item>
      </q-list>
    </q-scroll-area>

    <div class="bg-white shadow-up-3 q-pa-sm">
      <div v-if="isCheckout" class="q-mb-sm bg-grey-1 q-pa-sm rounded-borders border-dashed">
        <div class="q-mb-sm row justify-center">
          <q-btn-toggle
            v-model="paymentMethod"
            toggle-color="primary"
            color="white"
            text-color="primary"
            class="shadow-1 full-width"
            spread
            no-caps
            rounded
            unelevated
            :options="[
              { label: 'Cash', value: 'Cash', icon: 'payments' },
              { label: 'G-Cash', value: 'G-Cash', icon: 'account_balance_wallet' },
              { label: 'Bank', value: 'Bank Transfer', icon: 'account_balance' },
            ]"
          />
        </div>

        <div v-if="paymentMethod === 'Cash'" class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model.number="cashReceived"
              type="number"
              outlined
              dense
              label="Cash Received"
              placeholder="0"
              bg-color="white"
              prefix="₱"
              class="text-weight-bold"
              autofocus
              :disable="isProcessing"
              @keyup.enter="handleCompleteOrder"
            />
          </div>
          <div class="col-auto text-right">
            <div class="text-caption text-grey-7">Change</div>
            <div
              class="text-subtitle1 text-weight-bolder"
              :class="change < 0 ? 'text-negative' : 'text-positive'"
            >
              ₱{{ Math.max(0, change).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <div class="q-gutter-y-xs q-mb-md">
        <div class="row justify-between items-center q-mb-xs">
          <div class="text-h6 text-primary text-weight-bolder">Total</div>
          <div class="text-h6 text-primary text-weight-bolder">₱{{ finalTotal.toFixed(2) }}</div>
        </div>
        <div class="row justify-end">
          <q-btn
            flat
            dense
            size="sm"
            :icon="showTaxDetails ? 'expand_less' : 'expand_more'"
            :label="showTaxDetails ? 'Hide Breakdown' : 'Show Breakdown'"
            color="grey-6"
            @click="showTaxDetails = !showTaxDetails"
          />
        </div>
        <q-slide-transition>
          <div v-show="showTaxDetails" class="bg-grey-1 q-pa-sm rounded-borders text-caption">
            <div class="row justify-between text-grey-8">
              <span>Subtotal (Net of VAT)</span>
              <span>₱{{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="row justify-between text-grey-8">
              <span>VAT ({{ (taxRate * 100).toFixed(0) }}%)</span>
              <span>₱{{ taxAmount.toFixed(2) }}</span>
            </div>
            <div class="row justify-between text-negative" v-if="dbDiscount > 0">
              <span>Discount</span>
              <span>-₱{{ dbDiscount.toFixed(2) }}</span>
            </div>
          </div>
        </q-slide-transition>
      </div>

      <div class="row q-gutter-sm">
        <q-btn
          v-if="isCheckout"
          flat
          dense
          color="grey-7"
          icon="arrow_back"
          label="Back"
          class="col-3"
          @click="isCheckout = false"
          :disable="isProcessing"
        />
        <q-btn
          v-else
          flat
          dense
          color="negative"
          icon="delete"
          label="Clear"
          class="col-3"
          @click="$emit('clear-cart')"
          :disable="isProcessing"
        />

        <q-btn
          :color="isCheckout ? 'positive' : 'primary'"
          :icon="isCheckout ? 'check_circle' : 'payments'"
          :label="isProcessing ? 'Processing...' : isCheckout ? 'Complete' : 'Pay Now'"
          class="col-grow shadow-1"
          :loading="isProcessing"
          :disable="cart.length === 0 || isCheckoutDisabled"
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

const props = defineProps({ cart: Array, imgMap: Object, customer: Object })
const emit = defineEmits(['update:customer', 'update-quantity', 'clear-cart', 'submit-order'])
const $q = useQuasar()

// State
const isCheckout = ref(false)
const isProcessing = ref(false)
const showTaxDetails = ref(false)
const paymentMethod = ref('Cash')

// UPDATED: Initialized as null so input is empty
const cashReceived = ref(null)

const taxRate = ref(0.1)
const dbDiscount = ref(0)
const localCustomer = ref({ ...props.customer })
const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// DB Sync
onMounted(() => {
  onSnapshot(doc(db, 'systemSettings', 'cfuEV4yQICQAzB1aTnzQ'), (snap) => {
    if (snap.exists()) {
      taxRate.value = (snap.data().defaultTax || 0) / 100
      dbDiscount.value = snap.data().defaultDiscount || 0
    }
  })
})

// Computeds
const grossTotal = computed(() => props.cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0))
const taxAmount = computed(() => grossTotal.value * taxRate.value)
const subtotal = computed(() => grossTotal.value - taxAmount.value)
const finalTotal = computed(() => Math.max(0, grossTotal.value - dbDiscount.value))
const totalItems = computed(() => props.cart.reduce((t, i) => t + i.quantity, 0))

// UPDATED: Treat null/empty as 0 for calculation
const change = computed(() => (cashReceived.value || 0) - finalTotal.value)

// Disable "Complete" button logic
const isCheckoutDisabled = computed(() => {
  if (!isCheckout.value) return false

  // Only validate amount if paying by Cash
  // UPDATED: Check against (value || 0)
  if (paymentMethod.value === 'Cash') {
    return (cashReceived.value || 0) < finalTotal.value
  }

  return false
})

// Methods
const voidItem = (index) => {
  $q.dialog({
    title: 'Void Item',
    message: 'Remove this item?',
    cancel: true,
    persistent: true,
    ok: { color: 'negative', label: 'Void' },
  }).onOk(() => emit('update-quantity', { index, delta: -999 }))
}

const handleCompleteOrder = async () => {
  // Logic check just in case
  // UPDATED: Check against (value || 0)
  if (paymentMethod.value === 'Cash' && (cashReceived.value || 0) < finalTotal.value) {
    return $q.notify({ type: 'negative', message: 'Insufficient cash.' })
  }

  isProcessing.value = true

  try {
    emit('submit-order', {
      subtotal: subtotal.value,
      taxAmount: taxAmount.value,
      discountAmount: dbDiscount.value,
      totalAmount: finalTotal.value,
      itemCount: totalItems.value,
      taxRate: taxRate.value,

      paymentMethod: paymentMethod.value,

      // UPDATED: Send 0 if null
      cashReceived: paymentMethod.value === 'Cash' ? cashReceived.value || 0 : 0,
      changeAmount: paymentMethod.value === 'Cash' ? change.value : 0,

      referenceNumber: 'N/A',

      items: props.cart,
      customer: localCustomer.value,
    })

    isCheckout.value = false
    // UPDATED: Reset to null
    cashReceived.value = null
    paymentMethod.value = 'Cash'
  } catch (e) {
    console.error(e)
    $q.notify({ type: 'negative', message: 'Error processing order' })
  } finally {
    isProcessing.value = false
  }
}

watch(localCustomer, (val) => emit('update:customer', val), { deep: true })
watch(
  () => props.cart.length,
  (l) => {
    if (l === 0) {
      isCheckout.value = false
      // UPDATED: Reset to null
      cashReceived.value = null
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
