<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-layout view="hHh lpR fFf" container class="bg-grey-1 font-inter">
      <POSHeader @close="$emit('update:modelValue', false)" />

      <q-page-container>
        <q-page class="row no-wrap fit q-pa-md q-col-gutter-md">
          <div class="col-12 col-md-8 column no-wrap">
            <ProductBrowser
              :products="products"
              :loading="loadingProducts"
              :img-map="imgMap"
              @select-product="openCustomizer"
            />
          </div>

          <div class="col-12 col-md-4 column no-wrap">
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

      <ProductCustomizer
        v-model="showCustomizer"
        :product="activeProduct"
        :img-map="imgMap"
        @add-to-cart="handleAddToCart"
      />
    </q-layout>
  </q-dialog>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, onSnapshot, query, serverTimestamp } from 'firebase/firestore'
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage'
import { useAddonStore } from 'src/stores/addonStore'
import { useOrderStore } from 'src/stores/orderStore'
import { logAudit } from 'src/services/auditService'

// Import New Components
import POSHeader from 'src/components/POSHeader.vue'
import ProductBrowser from 'src/components/pos/ProductBrowser.vue'
import POSCartPanel from 'src/components/pos/POSCartPanel.vue'
import ProductCustomizer from 'src/components/pos/ProductCustomizer.vue'
// ReceiptDialog import removed

const $q = useQuasar()
const addonStore = useAddonStore()
const orderStore = useOrderStore()

// Props & Emits
defineProps({ modelValue: Boolean })
defineEmits(['update:modelValue'])

// --- STATE ---
const cart = ref([])
const products = ref([])
const loadingProducts = ref(true)
const imgMap = ref({}) // Shared Image Cache
const customer = ref({ name: '', email: '', phone: '' })
let unsubscribeProducts = null

// Customizer State
const showCustomizer = ref(false)
const activeProduct = ref(null)

const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// --- LOGIC ---

// 1. Image Resolution (Shared Logic)
const resolveImages = async () => {
  const storage = getStorage()
  for (const product of products.value) {
    const id = product.id
    if (imgMap.value[id]) continue // Skip if cached

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

// 2. Cart Actions
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

const saveAsDraft = () => {
  $q.notify({ message: 'Order saved as draft', color: 'info' })
}

// 3. Order Submission
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
      image: item.product.productImage || item.product.image, // Save raw path
      variant: item.selectedSize ? item.selectedSize.label : 'Standard',
      addons: item.selectedAddons.map((a) => ({ name: a.name || a.label, price: a.price })),
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      note: item.note,
    })),
    createdAt: serverTimestamp(),
    time: serverTimestamp(),
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

    // Simply clear cart and reset customer, no receipt dialog shown
    cart.value = []
    customer.value = { name: '', email: '', phone: '' }
    $q.notify({ type: 'positive', message: 'Order saved successfully' })
  } catch (err) {
    $q.notify({ type: 'negative', message: err.message })
  }
}

// 4. Data Loading
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

<style>
.font-inter {
  font-family: 'Inter', sans-serif;
}
</style>
