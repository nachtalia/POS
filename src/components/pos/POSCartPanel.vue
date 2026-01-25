<template>
  <div
    class="bg-white column fit overflow-hidden"
    :class="{ 'rounded-borders shadow-2': $q.screen.gt.xs }"
  >
    <div
      class="row items-center justify-between q-px-md q-py-sm border-bottom bg-white relative-position"
      style="z-index: 10"
    >
      <div class="row items-center">
        <div class="text-subtitle2 text-weight-bold row items-center">
          <q-icon
            :name="isCheckout ? 'payments' : 'shopping_bag'"
            color="primary"
            class="q-mr-sm"
            size="20px"
          />
          {{ isCheckout ? 'Payment Summary' : 'Current Order' }}
        </div>
        <q-badge color="grey-2" text-color="grey-8" class="q-ml-sm text-weight-bold">
          {{ totalItems }}
        </q-badge>
      </div>

      <q-btn
        v-if="isCheckout || $q.screen.lt.sm"
        flat
        round
        dense
        icon="close"
        color="grey-7"
        @click="isCheckout ? (isCheckout = false) : $emit('close-drawer')"
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
      >
        <template v-slot:prepend><q-icon name="person" color="grey-5" /></template>
      </q-input>
      <q-input v-model="localCustomer.address" dense outlined label="Address" bg-color="white">
        <template v-slot:prepend><q-icon name="place" color="grey-5" /></template>
      </q-input>
    </div>

    <q-scroll-area class="col bg-white">
      <q-list separator class="q-pa-sm">
        <q-item v-for="(item, index) in cart" :key="index" class="q-py-md rounded-borders">
          <q-item-section avatar>
            <q-img
              :src="imgMap[item.product.id] || PLACEHOLDER_IMG"
              style="width: 56px; height: 56px; border-radius: 8px"
              fit="cover"
            />
          </q-item-section>

          <q-item-section>
            <div class="row justify-between items-start">
              <div class="text-subtitle2 text-weight-bold col-8 ellipsis">
                {{ item.product.productName }}
              </div>
              <div class="text-subtitle2 text-primary col-4 text-right">
                ₱{{ (item.unitPrice * item.quantity).toFixed(2) }}
              </div>
            </div>
            <div class="text-caption text-grey-7 q-mt-xs">
              {{ item.selectedSize?.label || 'Standard' }}
            </div>
          </q-item-section>

          <q-item-section side>
            <div
              v-if="!isCheckout"
              class="column items-center bg-grey-2 rounded-borders q-pa-xs"
              style="min-width: 40px"
            >
              <q-btn
                flat
                dense
                round
                size="sm"
                icon="add"
                class="bg-white shadow-1 text-primary"
                @click="$emit('update-quantity', { index, delta: 1 })"
              />
              <div class="text-subtitle2 text-weight-bolder q-py-xs">{{ item.quantity }}</div>
              <q-btn
                flat
                dense
                round
                size="sm"
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
              dense
              class="bg-red-1 q-px-sm"
              size="sm"
              @click="voidItem(index)"
              :disable="isProcessing"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="cart.length === 0" class="column flex-center text-grey-5 q-pa-xl">
        <q-icon name="shopping_basket" size="50px" />
        <div class="q-mt-sm">Cart is empty</div>
      </div>
    </q-scroll-area>

    <div class="bg-white shadow-up-3 q-pa-sm z-top relative-position">
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
            padding="6px 10px"
            :options="[
              { label: 'Cash', value: 'Cash' },
              { label: 'GCash', value: 'G-Cash' },
              { label: 'Bank', value: 'Bank Transfer' },
            ]"
          />
        </div>

        <div v-if="paymentMethod === 'Cash'" class="row items-center q-col-gutter-sm">
          <div class="col">
            <q-input
              v-model.number="cashReceived"
              type="number"
              inputmode="decimal"
              pattern="[0-9]*"
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
            <div class="text-caption text-grey-7" style="font-size: 10px">CHANGE</div>
            <div
              class="text-h6 text-weight-bolder"
              style="line-height: 1.1"
              :class="change < 0 ? 'text-negative' : 'text-positive'"
            >
              ₱{{ Math.max(0, change).toFixed(2) }}
            </div>
          </div>
        </div>
      </div>

      <div class="q-gutter-y-xs q-mb-sm">
        <div class="row justify-between items-end">
          <div class="column">
            <div class="text-caption text-grey-6" v-if="!showTaxDetails">Total Amount</div>
            <q-btn
              flat
              dense
              size="xs"
              :icon="showTaxDetails ? 'expand_less' : 'expand_more'"
              :label="showTaxDetails ? 'Hide Details' : 'View Details'"
              color="grey-6"
              class="q-px-none self-start"
              align="left"
              @click="showTaxDetails = !showTaxDetails"
            />
          </div>
          <div class="text-h5 text-primary text-weight-bolder">₱{{ finalTotal.toFixed(2) }}</div>
        </div>

        <q-slide-transition>
          <div
            v-show="showTaxDetails"
            class="bg-grey-1 q-pa-sm rounded-borders text-caption q-mb-sm"
          >
            <div class="row justify-between text-grey-8">
              <span>Subtotal (Net)</span>
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
          color="grey-8"
          icon="arrow_back"
          label="Back"
          class="col-3 bg-grey-3"
          @click="isCheckout = false"
          :disable="isProcessing"
        />
        <q-btn
          v-else
          flat
          dense
          color="negative"
          icon="delete"
          class="col-auto bg-red-1 q-px-md"
          @click="$emit('clear-cart')"
          :disable="isProcessing || cart.length === 0"
        />

        <q-btn
          unelevated
          :color="isCheckout ? 'positive' : 'primary'"
          :icon="isCheckout ? 'check_circle' : 'payments'"
          :label="isProcessing ? 'Processing' : isCheckout ? 'Confirm Pay' : 'Charge'"
          class="col-grow shadow-1 text-weight-bold"
          size="md"
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
const emit = defineEmits([
  'update:customer',
  'update-quantity',
  'clear-cart',
  'submit-order',
  'close-drawer',
])
const $q = useQuasar()

// State
const isCheckout = ref(false)
const isProcessing = ref(false)
const showTaxDetails = ref(false)
const paymentMethod = ref('Cash')
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

// Live change calculation for display
const change = computed(() => (cashReceived.value || 0) - finalTotal.value)

// Disable "Complete" button logic
const isCheckoutDisabled = computed(() => {
  if (!isCheckout.value) return false
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
  // 1. Validation for Cash
  if (paymentMethod.value === 'Cash' && (cashReceived.value || 0) < finalTotal.value) {
    return $q.notify({ type: 'negative', message: 'Insufficient cash.' })
  }

  isProcessing.value = true

  try {
    const finalPaymentReceived =
      paymentMethod.value === 'Cash' ? cashReceived.value || 0 : finalTotal.value
    const finalChange = paymentMethod.value === 'Cash' ? change.value : 0

    emit('submit-order', {
      subtotal: subtotal.value,
      taxAmount: taxAmount.value,
      discountAmount: dbDiscount.value,
      totalAmount: finalTotal.value,
      itemCount: totalItems.value,
      taxRate: taxRate.value,
      paymentMethod: paymentMethod.value,
      paymentReceived: finalPaymentReceived,
      change: finalChange,
      referenceNumber: 'N/A',
      items: props.cart,
      customer: localCustomer.value,
    })

    isCheckout.value = false
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
/* Ensure footer stays on top of content if scrolling overlap occurs */
.z-top {
  z-index: 20;
}
</style>
