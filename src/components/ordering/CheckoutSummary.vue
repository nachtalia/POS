<template>
  <div class="checkout-summary bg-white">
    <div class="q-px-md q-pt-md q-pb-sm">
      <div class="row items-center justify-between q-mb-xs">
        <span class="text-caption text-grey-7">Subtotal</span>
        <span class="text-subtitle2 text-grey-9">₱{{ formatPrice(subtotal) }}</span>
      </div>

      <div class="row items-center justify-between q-mb-xs" style="height: 28px">
        <span class="text-caption text-grey-7">Tax</span>
        <div class="row items-center">
          <div class="row items-center bg-grey-1 rounded-borders q-px-xs q-mr-sm transition-bg">
            <q-input
              v-model.number="taxValue"
              type="number"
              dense
              borderless
              class="no-padding text-center"
              input-class="text-center text-primary text-weight-bold text-caption"
              style="width: 35px; height: 24px"
              min="0"
            />
            <span class="text-caption text-grey-6" style="font-size: 10px">%</span>
          </div>
          <span class="text-caption text-grey-8" style="min-width: 60px; text-align: right">
            + ₱{{ formatPrice(taxAmount) }}
          </span>
        </div>
      </div>

      <div class="row items-center justify-between q-mb-sm" style="height: 28px">
        <div class="row items-center cursor-pointer" @click="toggleDiscountMode">
          <span class="text-caption text-grey-7">Disc.</span>
          <q-icon
            name="swap_horiz"
            size="12px"
            class="q-ml-xs text-orange-8"
            style="opacity: 0.7"
          />
        </div>

        <div class="row items-center">
          <div class="row items-center bg-grey-1 rounded-borders q-px-xs q-mr-sm transition-bg">
            <span v-if="discountMode === 'amount'" class="text-caption text-grey-6 q-mr-xs">₱</span>
            <q-input
              v-model.number="discountValue"
              type="number"
              dense
              borderless
              class="no-padding text-center"
              input-class="text-center text-orange-8 text-weight-bold text-caption"
              style="width: 35px; height: 24px"
              min="0"
            />
            <span
              v-if="discountMode === 'percent'"
              class="text-caption text-grey-6"
              style="font-size: 10px"
              >%</span
            >
          </div>
          <span
            class="text-caption text-orange-9 text-weight-medium"
            style="min-width: 60px; text-align: right"
          >
            - ₱{{ formatPrice(discountAmount) }}
          </span>
        </div>
      </div>

      <q-separator class="q-my-sm" />

      <div class="row justify-between items-center">
        <span class="text-subtitle1 text-grey-9 text-weight-bold">Total</span>
        <span class="text-h5 text-primary text-weight-bolder">₱{{ formatPrice(totalAmount) }}</span>
      </div>
    </div>

    <div class="q-px-md q-pb-md">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-5">
          <q-select
            v-model="paymentMode"
            :options="paymentOptions"
            outlined
            dense
            options-dense
            label="Pay Via"
            class="bg-white"
            behavior="menu"
            hide-bottom-space
          />
        </div>
        <div class="col-7">
          <q-input
            v-model.number="amountPaid"
            outlined
            dense
            type="number"
            label="Cash Received"
            class="bg-white"
            input-class="text-right text-weight-bold text-primary font-size-16"
            hide-bottom-space
            @focus="$event.target.select()"
            placeholder="0.00"
          >
            <template v-slot:prepend>
              <span class="text-caption text-grey-5">₱</span>
            </template>
          </q-input>
        </div>
      </div>

      <div class="row q-col-gutter-sm">
        <div class="col-4">
          <q-btn
            outline
            color="negative"
            class="full-width"
            label="VOID"
            icon="delete_forever"
            @click="handleVoid"
            :disable="loading || cartLength === 0"
            style="border-radius: 8px; height: 48px"
          />
        </div>

        <div class="col-8">
          <q-btn
            unelevated
            color="primary"
            class="full-width shadow-1"
            @click="openPaymentModal"
            :loading="loading"
            :disable="cartLength === 0"
            style="border-radius: 8px; height: 48px"
          >
            <div class="column items-center" style="line-height: 1.1">
              <span class="text-weight-bold" style="font-size: 0.9rem">PROCEED PAYMENT</span>
              <span class="text-caption text-white" style="opacity: 0.8">
                ₱{{ formatPrice(totalAmount) }}
              </span>
            </div>
          </q-btn>
        </div>
      </div>
    </div>

    <q-dialog v-model="showPaymentDialog" persistent>
      <q-card style="min-width: 350px; max-width: 450px">
        <q-card-section class="bg-primary text-white q-py-sm">
          <div class="text-h6">Confirm Order</div>
        </q-card-section>

        <q-card-section class="q-pt-lg">
          <div class="column items-center q-gutter-y-md">
            <div class="row full-width justify-between text-subtitle1">
              <span class="text-grey-7">Total Due:</span>
              <span class="text-weight-bold">₱{{ formatPrice(totalAmount) }}</span>
            </div>

            <div class="row full-width justify-between text-subtitle1">
              <span class="text-grey-7">Paid Amount:</span>
              <span class="text-weight-bold">₱{{ formatPrice(amountPaid) }}</span>
            </div>

            <q-separator class="full-width" />

            <div class="column items-center">
              <span class="text-caption text-uppercase text-grey-6">Change Due</span>
              <span class="text-h3 text-positive text-weight-bolder">
                ₱{{ formatPrice(change) }}
              </span>
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn flat label="Back" color="grey-8" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="COMPLETE ORDER"
            size="lg"
            icon="print"
            @click="completeOrder"
            :loading="loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue' // Removed 'watch' import
import { useOrderStore } from 'src/stores/orderStore'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'
import { useQuasar } from 'quasar'

const $q = useQuasar()

// --- Props & Emits ---
const props = defineProps({
  subtotal: { type: Number, default: 0 },
  cartLength: { type: Number, default: 0 },
  totalItems: { type: Number, default: 0 },
})

const emit = defineEmits(['pay-now', 'clear-cart'])

// --- Stores ---
const orderStore = useOrderStore()
const settingsStore = useSystemSettingsStore()

// --- State ---
const loading = computed(() => orderStore.loading)
const taxValue = ref(0)
const discountMode = ref('percent')
const discountValue = ref(0)
const paymentMode = ref('Cash')
const amountPaid = ref(0) // Initialize as 0
const showPaymentDialog = ref(false)

const paymentOptions = ['Cash', 'GCash', 'Card', 'Bank Transfer']

// --- Initialization ---
onMounted(async () => {
  await settingsStore.fetchSettings()
  if (settingsStore.settings) {
    taxValue.value = settingsStore.settings.defaultTax || 0
    discountValue.value = settingsStore.settings.defaultDiscount || 0
  }
})

// --- Computeds ---
const taxAmount = computed(() => (props.subtotal * (taxValue.value || 0)) / 100)

const discountAmount = computed(() => {
  if (discountMode.value === 'percent') {
    return (props.subtotal * (discountValue.value || 0)) / 100
  }
  return Number(discountValue.value || 0)
})

const totalAmount = computed(() => {
  const result = props.subtotal + taxAmount.value - discountAmount.value
  return Math.max(0, result)
})

const change = computed(() => Math.max(0, amountPaid.value - totalAmount.value))

// --- Note: The watcher that auto-filled amountPaid is removed here ---

// --- Methods ---
const formatPrice = (val) => {
  return (Number(val) || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

const toggleDiscountMode = () => {
  discountMode.value = discountMode.value === 'percent' ? 'amount' : 'percent'
}

const handleVoid = () => {
  $q.dialog({
    title: 'Void Transaction',
    message: 'Are you sure you want to void this entire order?',
    cancel: true,
    persistent: true,
    ok: { label: 'Void Order', color: 'negative', flat: true },
  }).onOk(() => {
    emit('clear-cart')
    // Reset inputs
    amountPaid.value = 0
  })
}

const openPaymentModal = () => {
  // Logic: Ensure payment is sufficient
  if (amountPaid.value < totalAmount.value) {
    $q.notify({
      type: 'warning',
      message: `Insufficient payment. Need ₱${formatPrice(totalAmount.value - amountPaid.value)} more.`,
    })
    return
  }
  showPaymentDialog.value = true
}

const completeOrder = async () => {
  const orderSummary = {
    subtotal: props.subtotal,
    taxAmount: taxAmount.value,
    discountAmount: discountAmount.value,
    totalAmount: totalAmount.value,
    itemCount: props.totalItems,
    taxDetails: { value: taxValue.value, type: 'percent' },
    discountDetails: { value: discountValue.value, type: discountMode.value },
    paymentMode: paymentMode.value,
    amountPaid: amountPaid.value,
    change: change.value,
  }

  emit('pay-now', orderSummary)
  showPaymentDialog.value = false
  printReceipt(orderSummary)

  // Optional: Reset amountPaid after successful order
  amountPaid.value = 0
}

const printReceipt = (summary) => {
  console.log('Printing Receipt...', summary)
  $q.notify({
    type: 'positive',
    icon: 'print',
    message: 'Order Completed. Printing Receipt...',
    position: 'top',
  })
}
</script>

<style scoped>
.checkout-summary {
  position: sticky;
  bottom: 0;
  z-index: 100;
  border-top: 1px solid #e0e0e0;
}

.transition-bg {
  transition: background-color 0.2s ease;
}
.transition-bg:hover,
.transition-bg:focus-within {
  background-color: #e3e3e3 !important;
}

:deep(input::-webkit-outer-spin-button),
:deep(input::-webkit-inner-spin-button) {
  -webkit-appearance: none;
  margin: 0;
}
:deep(input[type='number']) {
  -moz-appearance: textfield;
}

:deep(.font-size-16) {
  font-size: 1.1rem !important;
}
</style>
