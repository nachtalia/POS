<template>
  <q-layout view="hHh lpR fFf" class="bg-grey-1 font-inter">
    <POSHeader @close="$router.push('/dashboard/orders')" />

    <q-page-container>
      <q-page class="row fit q-pa-md q-col-gutter-md" :class="{ 'no-wrap': $q.screen.gt.sm, 'wrap': !$q.screen.gt.sm }">
        <!-- PRODUCT BROWSER (Always visible, full width on mobile) -->
        <div class="col-12 col-md-8 column no-wrap" :style="$q.screen.lt.md ? 'height: calc(100vh - 150px)' : ''">
          <ProductBrowser
            :products="products"
            :loading="loadingProducts"
            :img-map="imgMap"
            @select-product="openCustomizer"
          />
        </div>

        <!-- CART PANEL (Desktop: Side Panel, Mobile: Hidden/Dialog) -->
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

    <!-- MOBILE CART DIALOG -->
    <q-dialog v-model="showMobileCart" position="bottom" maximized>
      <q-card class="column full-height">
        <q-card-section class="row items-center justify-between bg-primary text-white q-py-sm">
          <div class="text-h6">Current Order</div>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-card-section>

        <q-card-section class="col q-pa-none">
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

    <!-- MOBILE CART FAB (Floating Action Button) -->
    <q-page-sticky position="bottom-right" :offset="[18, 18]" v-if="$q.screen.lt.md">
      <q-btn
        fab
        icon="shopping_cart"
        color="primary"
        @click="showMobileCart = true"
      >
        <q-badge color="red" floating v-if="cart.length > 0">{{ cartTotalItems }}</q-badge>
      </q-btn>
    </q-page-sticky>

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
import { db } from 'src/services/firebase'
import { collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage'
import { useAddonStore } from 'src/stores/addonStore'
import { useOrderStore } from 'src/stores/orderStore'
import { logAudit } from 'src/services/auditService'

// Components
import POSHeader from 'src/components/pos/POSHeader.vue'
import ProductBrowser from 'src/components/pos/ProductBrowser.vue'
import POSCartPanel from 'src/components/pos/POSCartPanel.vue'
import ProductCustomizer from 'src/components/pos/ProductCustomizer.vue'
// Removed ReceiptDialog import

const $q = useQuasar()
useRouter()
const addonStore = useAddonStore()
const orderStore = useOrderStore()

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
// Removed showReceipt and receiptOrder state variables

const cartTotalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// --- IMAGE LOGIC ---
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
    message: `${cartItem.product.productName} added`,
    color: 'positive',
    icon: 'check',
    position: 'top-right',
    timeout: 1000,
  })
  showCustomizer.value = false
}

const updateQuantity = ({ index, delta }) => {
  const item = cart.value[index]
  item.quantity += delta
  if (item.quantity <= 0) removeItem(index)
}

const removeItem = (index) => {
  $q.dialog({ title: 'Remove', message: 'Remove item?', cancel: true }).onOk(() => {
    cart.value.splice(index, 1)
  })
}

const clearCart = () => {
  $q.dialog({ title: 'Clear Cart', message: 'Clear all?', cancel: true }).onOk(() => {
    cart.value = []
    customer.value = { name: '', email: '', phone: '' }
  })
}

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
    await logAudit({
      module: 'ordering',
      action: 'add',
      entityType: 'order',
      entityId: finalOrder.id,
      details: { orderNumber: finalOrder.orderNumber, total: finalOrder.totalAmount },
    })

    // Success logic: Clear cart, Reset customer, Notify user
    cart.value = []
    customer.value = { name: '', email: '', phone: '' }
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}

// --- DATA LOADING ---
onMounted(() => {
  if (!addonStore.addons.length) addonStore.fetchAddons()
  unsubscribeProducts = onSnapshot(query(collection(db, 'products')), (snap) => {
    products.value = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
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
</style>
