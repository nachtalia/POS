<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-1 font-inter">
    <POSHeader
      @close="$router.push({ name: 'OrderManagement' })"
      :cart="cart"
      @showCart="showMobileCart = true"
      @printerSetup="setPrinterReady"
    />

    <q-page-container>
      <q-page
        class="row fit q-pa-md q-col-gutter-md"
        :class="{ 'no-wrap': $q.screen.gt.sm, wrap: !$q.screen.gt.sm }"
      >
        <div
          class="col-12 col-md-8 column no-wrap"
          :style="$q.screen.lt.md ? 'height: calc(100vh - 80px)' : ''"
        >
          <ProductBrowser
            :products="products"
            :loading="loadingProducts"
            :img-map="imgMap"
            @select-product="openCustomizer"
          />
        </div>

        <div v-if="$q.screen.gt.sm" class="col-12 col-md-4 column no-wrap">
          <POSCartPanel
            v-model:customer="customer"
            :cart="cart"
            :img-map="imgMap"
            @update-quantity="updateQuantity"
            @remove-item="removeItem"
            @clear-cart="clearCart"
            @submit-order="submitOrder"
            @save-draft="saveAsDraft"
          />
        </div>
      </q-page>
    </q-page-container>

    <q-page-sticky position="bottom-right" :offset="[18, 18]" v-if="$q.screen.lt.md">
      <q-btn
        fab
        icon="shopping_cart"
        color="primary"
        class="shadow-4"
        @click="showMobileCart = true"
      >
        <q-badge v-if="cartTotalItems > 0" color="red" floating rounded :label="cartTotalItems" />
      </q-btn>
    </q-page-sticky>

    <q-dialog
      v-model="showMobileCart"
      persistent
      maximized
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="column full-height bg-grey-1">
        <q-card-section
          class="row items-center justify-between bg-white text-primary shadow-1 z-top"
        >
          <div class="text-h6 text-weight-bold">Current Order</div>
          <q-btn flat round dense icon="close" v-close-popup color="grey-7" />
        </q-card-section>

        <q-card-section class="col q-pa-none scroll">
          <POSCartPanel
            v-model:customer="customer"
            :cart="cart"
            :img-map="imgMap"
            @update-quantity="updateQuantity"
            @remove-item="removeItem"
            @clear-cart="clearCart"
            @submit-order="submitOrder"
            @save-draft="saveAsDraft"
            class="full-height"
          />
        </q-card-section>
      </q-card>
    </q-dialog>

    <ProductCustomizer
      v-model="showCustomizer"
      :product="activeProduct"
      :img-map="imgMap"
      @add-to-cart="handleAddToCart"
    />
  </q-layout>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useQuasar } from 'quasar'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { db } from 'src/services/firebase'
import { collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage'
import moment from 'moment'

// Stores
import { useAddonStore } from 'src/stores/addonStore'
import { useOrderStore } from 'src/stores/orderStore'
import { useSystemSettingsStore } from 'src/stores/systemSettingsStore'

// Services
import { logAudit } from 'src/services/auditService'
import { useAuthStore } from 'src/features/index'

// Components
import POSHeader from 'src/components/pos/POSHeader.vue'
import ProductBrowser from 'src/components/pos/ProductBrowser.vue'
import POSCartPanel from 'src/components/pos/POSCartPanel.vue'
import ProductCustomizer from 'src/components/pos/ProductCustomizer.vue'

// --- SETUP ---
const $q = useQuasar()
useRouter()
const addonStore = useAddonStore()
const orderStore = useOrderStore()
const authStore = useAuthStore()
const systemSettingsStore = useSystemSettingsStore()
const { settings } = storeToRefs(systemSettingsStore)

// --- STATE ---
const cart = ref([])
const products = ref([])
const loadingProducts = ref(true)
const imgMap = ref({})
const customer = ref({ name: '', email: '', phone: '' })
let unsubscribeProducts = null

const showCustomizer = ref(false)
const showMobileCart = ref(false)
const activeProduct = ref(null)

const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// --- COMPUTED ---
const cartTotalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

// --- IMAGE HANDLING ---
const resolveImages = async () => {
  const storage = getStorage()
  for (const product of products.value) {
    const id = product.id
    if (imgMap.value[id]) continue
    const imagePath = product.productImage || product.image
    if (!imagePath) {
      imgMap.value[id] = PLACEHOLDER_IMG
      continue
    }
    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      imgMap.value[id] = imagePath
      continue
    }
    try {
      const url = await getDownloadURL(storageRef(storage, imagePath))
      imgMap.value[id] = url
    } catch {
      imgMap.value[id] = PLACEHOLDER_IMG
    }
  }
}
watch(products, resolveImages, { deep: true })

// --- CART ACTIONS ---
const openCustomizer = (product) => {
  activeProduct.value = product
  showCustomizer.value = true
}

const handleAddToCart = (cartItem) => {
  cart.value.push(cartItem)
  $q.notify({
    message: `${cartItem.product.productName || cartItem.product.name} added`,
    color: 'positive',
    icon: 'check',
    position: 'top',
    timeout: 800,
  })
  showCustomizer.value = false
}

const updateQuantity = ({ index, delta }) => {
  const item = cart.value[index]
  item.quantity += delta
  if (item.quantity <= 0) removeItem(index)
}

const removeItem = (index) => {
  $q.dialog({
    title: 'Remove Item',
    message: 'Are you sure you want to remove this item?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    cart.value.splice(index, 1)
  })
}

const clearCart = () => {
  $q.dialog({
    title: 'Clear Cart',
    message: 'Clear all items?',
    cancel: true,
    persistent: true,
  }).onOk(() => {
    cart.value = []
    customer.value = { name: '', email: '', phone: '' }
    showMobileCart.value = false // Close mobile modal on clear
  })
}

const saveAsDraft = () => {
  // Implementation for saving draft (if needed later)
  $q.notify({ message: 'Draft saved (Feature placeholder)', color: 'orange-8', icon: 'save' })
}

// --- ORDER SUBMISSION ---
const submitOrder = async (summaryData) => {
  const orderData = {
    customer: customer.value,
    customerName: customer.value.name || 'Walk-in Customer',
    status: 'Paid',
    ...summaryData,
    items: cart.value.map((item) => ({
      productId: item.product.id,
      name: item.product.productName || item.product.name,
      sku: item.product.sku || 'N/A',
      category: item.product.productCategory || 'Other',
      image: item.product.productImage || item.product.image,
      variant: item.selectedSize ? item.selectedSize.label : 'Standard',
      addons: item.selectedAddons.map((a) => ({ name: a.name || a.label, price: a.price })),
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      note: item.note,
    })),
    createdAt: serverTimestamp(),
  }

  try {
    const finalOrder = await orderStore.addOrder(orderData)

    // Attempt Print
    handlePrint(finalOrder)

    // Audit Log
    await logAudit({
      module: 'ordering',
      action: 'add',
      entityType: 'order',
      entityId: finalOrder.id,
      details: { orderNumber: finalOrder.orderNumber, total: finalOrder.totalAmount },
      branchId: authStore.branchId,
      orgOwnerUid: authStore.orgOwnerUid,
    })

    // Success & Reset
    $q.notify({ type: 'positive', message: 'Order submitted successfully!' })
    cart.value = []
    customer.value = { name: '', email: '', phone: '' }
    showMobileCart.value = false
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Failed to submit order: ' + err.message })
  }
}

// --- PRINTER LOGIC ---
let printer = null

const setPrinterReady = (ready) => {
  printer = ready.printerInstance
}

const handlePrint = async (orderData) => {
  if (!printer) {
    // Optional: Notify if printer not connected, or just silent fail
    // $q.notify({ message: 'Printer not connected', color: 'warning' })
    return
  }

  printer.connectToPrint({
    onReady: async (print) => {
      await print.writeText(`${settings?.value?.storeName || 'My POS Store'}`, {
        align: 'center',
        bold: true,
        size: 'double',
      })
      await print.writeText(`Official Receipt`, { align: 'center' })
      await print.writeTextWith2Column('Date', moment().format('MM/DD/YYYY hh:mm A'))
      await print.writeTextWith2Column('Order #', orderData.orderNumber || 'N/A')
      await print.writeDashLine()

      await print.writeTextWith2Column('Payment', orderData.paymentMethod || 'Cash')

      for (const item of orderData.items) {
        const itemName = `${item.name} x${item.quantity}`
        const itemPrice = `${(item.unitPrice * item.quantity).toFixed(2)}`
        await print.writeTextWith2Column(itemName, itemPrice, { size: 'small' })

        if (item.addons && item.addons.length > 0) {
          for (const addon of item.addons) {
            await print.writeTextWith2Column(`  + ${addon.name}`, `${addon.price.toFixed(2)}`, {
              size: 'small',
            })
          }
        }
      }

      await print.writeLineBreak()
      await print.writeTextWith2Column('Sub-Total', `${orderData.subtotal.toFixed(2)}`)
      if (orderData.discountAmount > 0) {
        await print.writeTextWith2Column('Discount', `-${orderData.discountAmount.toFixed(2)}`)
      }
      await print.writeTextWith2Column('Total', `${orderData.totalAmount.toFixed(2)}`, {
        bold: true,
      })

      await print.writeDashLine()
      await print.writeText('Thank you for your purchase!', { align: 'center' })
      await print.writeLineBreak({ count: 3 })
    },
  })
}

// --- LIFECYCLE ---
onMounted(() => {
  if (!addonStore.addons.length) addonStore.fetchAddons()
  const branchId = authStore.branchId
  if (!branchId) {
    products.value = []
    loadingProducts.value = false
    return
  }
  unsubscribeProducts = onSnapshot(query(collection(db, 'products')), (snap) => {
    const all = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    products.value = all.filter((p) => !p.branchId || p.branchId === branchId)
    loadingProducts.value = false
  })
})

onUnmounted(() => {
  if (unsubscribeProducts) unsubscribeProducts()
})
</script>

<style scoped>
.font-inter {
  font-family: 'Inter', sans-serif;
}
.z-top {
  z-index: 2000; /* Higher than Quasar defaults to ensure visibility */
}
</style>
