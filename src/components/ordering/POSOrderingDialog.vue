<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-layout view="hHh lpR fFf" container class="bg-grey-2">
      <q-header class="bg-gradient-primary text-white shadow-2">
        <q-toolbar>
          <q-btn flat round dense icon="close" v-close-popup size="sm" />
          <q-toolbar-title class="text-weight-bold row items-center">
            <q-icon name="point_of_sale" size="32px" class="q-mr-sm" />
            <div>
              <div>POS Terminal</div>
              <div class="text-caption text-blue-1">V.2.0 • Premium Edition</div>
            </div>
          </q-toolbar-title>

          <div class="row items-center q-gutter-x-lg">
            <div class="text-center">
              <div class="text-caption text-blue-1">Current Session</div>
              <div class="text-subtitle1">{{ currentDate }}</div>
            </div>
            <q-separator vertical dark />
            <div class="text-center">
              <div class="text-caption text-blue-1">Operator</div>
              <div class="text-subtitle1">Admin</div>
            </div>
            <q-btn round flat icon="notifications" size="sm">
              <q-badge color="red" floating rounded>3</q-badge>
            </q-btn>
          </div>
        </q-toolbar>
      </q-header>

      <q-page-container>
        <q-page class="row no-wrap fit">
          <div class="col-8 column q-pa-md">
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-6">
                <div class="bg-white rounded-borders shadow-1 q-pa-sm">
                  <q-tabs
                    v-model="selectedCategory"
                    active-color="primary"
                    indicator-color="primary"
                    align="justify"
                    dense
                    class="text-grey-7"
                  >
                    <q-tab v-for="cat in dynamicCategories" :key="cat" :name="cat" :label="cat" />
                  </q-tabs>
                </div>
              </div>

              <div class="col-12 col-md-6">
                <div class="row q-col-gutter-sm">
                  <div class="col-8">
                    <q-input
                      v-model="search"
                      outlined
                      dense
                      placeholder="Search products..."
                      bg-color="white"
                      class="shadow-1"
                    >
                      <template v-slot:prepend>
                        <q-icon name="search" color="primary" />
                      </template>
                      <template v-slot:append v-if="search">
                        <q-icon name="close" class="cursor-pointer" @click="search = ''" />
                      </template>
                    </q-input>
                  </div>
                  <div class="col-4">
                    <q-select
                      v-model="sortBy"
                      :options="sortOptions"
                      outlined
                      dense
                      bg-color="white"
                      class="shadow-1"
                      label="Sort by"
                    />
                  </div>
                </div>
              </div>
            </div>

            <q-scroll-area class="col q-pr-sm relative-position">
              <q-inner-loading :showing="loadingProducts">
                <q-spinner-gears size="50px" color="primary" />
                <div class="text-primary q-mt-sm">Loading Inventory...</div>
              </q-inner-loading>

              <div class="row q-col-gutter-md">
                <div
                  v-for="product in sortedProducts"
                  :key="product.id"
                  class="col-12 col-sm-6 col-md-4 col-xl-3"
                >
                  <product-card :product="product" @add-to-cart="promptAddToCart" />
                </div>
              </div>
            </q-scroll-area>
          </div>

          <div class="col-4 bg-white column shadow-3-left">
            <customer-details v-model="customer" class="q-pa-md" />

            <q-separator />

            <q-scroll-area class="col q-px-md">
              <q-list separator>
                <q-item v-for="(item, index) in cart" :key="index" class="q-py-md">
                  <q-item-section avatar>
                    <q-img
                      :src="item.product.image"
                      style="width: 50px; height: 50px"
                      class="rounded-borders"
                      fit="cover"
                    >
                      <template v-slot:error>
                        <div class="absolute-full flex flex-center bg-grey-3 text-grey">
                          <q-icon name="image_not_supported" />
                        </div>
                      </template>
                    </q-img>
                  </q-item-section>

                  <q-item-section>
                    <div class="row items-center justify-between">
                      <div class="text-subtitle2">{{ item.product.productName }}</div>
                      <div class="text-weight-bold">
                        ${{ (item.unitPrice * item.quantity).toFixed(2) }}
                      </div>
                    </div>

                    <div class="text-caption text-grey-7">
                      <span
                        v-if="item.selectedSize"
                        class="q-mr-xs text-primary text-weight-medium"
                      >
                        {{ item.selectedSize.label }}
                      </span>
                      <span v-if="item.selectedAddons && item.selectedAddons.length > 0">
                        + {{ item.selectedAddons.map((a) => a.name || a.label).join(', ') }}
                      </span>
                    </div>
                    <div v-if="item.note" class="text-caption text-italic text-grey-6">
                      "{{ item.note }}"
                    </div>
                  </q-item-section>

                  <q-item-section side>
                    <div class="row items-center no-wrap bg-grey-2 rounded-borders">
                      <q-btn
                        flat
                        dense
                        size="sm"
                        icon="remove"
                        @click="updateQuantity(index, -1)"
                      />
                      <div class="q-px-sm text-caption text-weight-bold">{{ item.quantity }}</div>
                      <q-btn flat dense size="sm" icon="add" @click="updateQuantity(index, 1)" />
                    </div>
                  </q-item-section>
                </q-item>

                <div v-if="cart.length === 0" class="text-center text-grey q-pa-xl">
                  <q-icon name="shopping_cart" size="40px" color="grey-4" />
                  <div class="q-mt-sm">Cart is empty</div>
                </div>
              </q-list>
            </q-scroll-area>

            <checkout-summary
              :subtotal="subtotal"
              :tax-rate="taxRate"
              :discount-rate="discountRate"
              :cart-length="cart.length"
              :customer-name="customer.name"
              :total-items="totalItems"
              @clear-cart="clearCart"
              @pay-now="submitOrder"
              @save-draft="saveAsDraft"
            />
          </div>
        </q-page>
      </q-page-container>

      <q-dialog v-model="customizationDialog" position="bottom">
        <q-card style="width: 500px; max-width: 100vw" class="rounded-borders-top">
          <div v-if="activeProduct">
            <q-card-section class="row items-center q-pb-none">
              <div class="text-h6">{{ activeProduct.productName }}</div>
              <q-space />
              <q-btn icon="close" flat round dense v-close-popup />
            </q-card-section>

            <q-card-section class="row q-col-gutter-md">
              <div class="col-4">
                <q-img
                  :src="activeProduct.image"
                  class="rounded-borders"
                  style="height: 100px; object-fit: cover"
                >
                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-3">
                      <q-icon name="fastfood" color="grey" />
                    </div>
                  </template>
                </q-img>
              </div>

              <div class="col-8 column justify-center">
                <div class="text-grey-7 text-caption">{{ activeProduct.description }}</div>
                <div class="text-h5 text-primary q-mt-sm text-weight-bold">
                  ${{ customizedPrice.toFixed(2) }}
                </div>
              </div>
            </q-card-section>

            <q-separator />

            <q-card-section style="max-height: 50vh" class="scroll">
              <div v-if="activeProduct.sizes && activeProduct.sizes.length > 0" class="q-mb-md">
                <div class="text-subtitle2 q-mb-xs">Size</div>
                <div class="row q-gutter-sm">
                  <q-btn
                    v-for="size in activeProduct.sizes"
                    :key="size.label"
                    :label="`${size.label} ${size.price > 0 ? '(+$' + size.price + ')' : ''}`"
                    :outline="customizationForm.size?.label !== size.label"
                    :color="customizationForm.size?.label === size.label ? 'primary' : 'grey-7'"
                    unelevated
                    @click="customizationForm.size = size"
                    no-caps
                    class="col-auto"
                  />
                </div>
              </div>

              <div v-if="filteredActiveAddons.length > 0" class="q-mb-md">
                <div class="text-subtitle2 q-mb-xs">Add-ons</div>
                <q-list bordered separator class="rounded-borders">
                  <q-item
                    v-for="addon in filteredActiveAddons"
                    :key="addon.id || addon.label"
                    tag="label"
                    v-ripple
                    dense
                    :class="addon.status === 'Unavailable' ? 'text-grey-6' : ''"
                  >
                    <q-item-section avatar>
                      <q-checkbox
                        v-model="customizationForm.addons"
                        :val="addon"
                        :disable="addon.status === 'Unavailable'"
                      />
                    </q-item-section>
                    <q-item-section>
                      <q-item-label>{{ addon.name || addon.label }}</q-item-label>
                      <q-item-label caption>{{ addon.category }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <div class="column items-end">
                        <div>+${{ Number(addon.price || 0).toFixed(2) }}</div>
                        <q-badge
                          v-if="addon.status"
                          :color="addon.status === 'Available' ? 'positive' : 'grey-6'"
                          class="q-mt-xs"
                          outline
                          dense
                        >
                          {{ addon.status }}
                        </q-badge>
                      </div>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>

              <div>
                <div class="text-subtitle2 q-mb-xs">Notes</div>
                <q-input
                  v-model="customizationForm.note"
                  outlined
                  dense
                  placeholder="e.g. Less ice, warm..."
                />
              </div>
            </q-card-section>

            <q-separator />

            <q-card-actions align="between" class="q-pa-md bg-grey-1">
              <div class="row items-center bg-white shadow-1 rounded-borders">
                <q-btn
                  flat
                  dense
                  icon="remove"
                  color="primary"
                  @click="customizationForm.quantity > 1 ? customizationForm.quantity-- : null"
                />
                <div class="q-px-md text-weight-bold">{{ customizationForm.quantity }}</div>
                <q-btn
                  flat
                  dense
                  icon="add"
                  color="primary"
                  @click="customizationForm.quantity++"
                />
              </div>

              <q-btn
                color="primary"
                icon="add_shopping_cart"
                :label="`Add - $${(customizedPrice * customizationForm.quantity).toFixed(2)}`"
                class="q-px-lg"
                @click="confirmAddToCart"
              />
            </q-card-actions>
          </div>
        </q-card>
      </q-dialog>
    </q-layout>
  </q-dialog>
</template>

<script setup>
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { date, useQuasar } from 'quasar'

// --- FIREBASE IMPORTS ---
import { db } from 'src/services/firebase' // Adjust path to your firebase config
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAddonStore } from 'src/stores/addonStore'
import { useOrderStore } from 'src/stores/orderStore'

// Components
import ProductCard from 'src/components/ordering/ProductCard.vue'
import CustomerDetails from 'src/components/ordering/CustomerDetails.vue'
import CheckoutSummary from 'src/components/ordering/CheckoutSummary.vue'

// Initialize
const $q = useQuasar()
const addonStore = useAddonStore()
const orderStore = useOrderStore()

// Props & Emits
defineProps({
  modelValue: Boolean,
})
const emit = defineEmits(['update:modelValue', 'create'])

// State
const search = ref('')
const selectedCategory = ref('All')
const sortBy = ref('name')
const cart = ref([])
const products = ref([]) // Now empty initially
const loadingProducts = ref(true)
let unsubscribeProducts = null // For cleanup

const customer = ref({
  name: '',
  email: '',
  phone: '',
})

// --- Customization State ---
const customizationDialog = ref(false)
const activeProduct = ref(null)
const customizationForm = reactive({
  size: null,
  addons: [],
  quantity: 1,
  note: '',
})

// Constants
const taxRate = 0.08
const discountRate = 0.05

const sortOptions = [
  { label: 'Name A-Z', value: 'name' },
  { label: 'Price Low-High', value: 'price-asc' },
  { label: 'Price High-Low', value: 'price-desc' },
  { label: 'Category', value: 'category' },
]

// --- Computed Properties ---

const currentDate = computed(() => {
  return date.formatDate(Date.now(), 'ddd, DD MMM YYYY • hh:mm A')
})

// Dynamically generate categories based on available products
const dynamicCategories = computed(() => {
  const cats = new Set(['All'])
  products.value.forEach((p) => {
    if (p.productCategory) cats.add(p.productCategory)
  })
  return Array.from(cats)
})

const filteredProducts = computed(() => {
  let list = products.value

  if (selectedCategory.value !== 'All') {
    list = list.filter((p) => p.productCategory === selectedCategory.value)
  }

  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) =>
        (p.productName || '').toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q),
    )
  }
  return list
})

const sortedProducts = computed(() => {
  const list = [...filteredProducts.value]
  switch (sortBy.value) {
    case 'price-asc':
      return list.sort((a, b) => a.productPrice - b.productPrice)
    case 'price-desc':
      return list.sort((a, b) => b.productPrice - a.productPrice)
    case 'category':
      return list.sort((a, b) => (a.productCategory || '').localeCompare(b.productCategory || ''))
    default:
      return list.sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
  }
})

const totalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

const customizedPrice = computed(() => {
  if (!activeProduct.value) return 0

  // Base price
  let total = Number(activeProduct.value.productPrice) || 0

  // Add Size Price
  if (customizationForm.size) {
    total += Number(customizationForm.size.price) || 0
  }

  // Add Add-ons Price
  customizationForm.addons.forEach((addon) => {
    total += Number(addon.price) || 0
  })

  return total
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
})

// --- Methods ---

const promptAddToCart = (product) => {
  activeProduct.value = JSON.parse(JSON.stringify(product)) // Deep copy

  // Set Defaults
  customizationForm.size = product.sizes && product.sizes.length > 0 ? product.sizes[0] : null
  customizationForm.addons = []
  customizationForm.quantity = 1
  customizationForm.note = ''

  customizationForm.addons = []

  customizationDialog.value = true
}

const confirmAddToCart = () => {
  const cartItem = {
    product: { ...activeProduct.value },
    selectedSize: customizationForm.size,
    selectedAddons: [...customizationForm.addons],
    note: customizationForm.note,
    quantity: customizationForm.quantity,
    unitPrice: customizedPrice.value,
  }

  cart.value.push(cartItem)

  $q.notify({
    message: `${activeProduct.value.productName} added`,
    caption: `+ $${(cartItem.unitPrice * cartItem.quantity).toFixed(2)}`,
    color: 'positive',
    icon: 'add_shopping_cart',
    position: 'top-right',
    timeout: 1000,
  })

  customizationDialog.value = false
}

const updateQuantity = (index, delta) => {
  const item = cart.value[index]
  item.quantity += delta

  if (item.quantity <= 0) {
    removeItem(index)
  }
}

const removeItem = (index) => {
  $q.dialog({
    title: 'Remove Item',
    message: 'Remove this item from cart?',
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
  }).onOk(() => {
    cart.value = []
    customer.value.name = ''
    customer.value.email = ''
    customer.value.phone = ''
  })
}

const clearCartSilently = () => {
  cart.value = []
  customer.value.name = ''
  customer.value.email = ''
  customer.value.phone = ''
}

const saveAsDraft = () => {
  $q.notify({
    message: 'Order saved as draft',
    color: 'info',
    icon: 'save',
    position: 'top-right',
  })
}

// Receive calculation summary from CheckoutSummary component
const submitOrder = async (summaryData) => {
  if (!customer.value.name) {
    $q.notify({ type: 'warning', message: 'Please enter customer name' })
    return
  }

  // Prepare data for Firestore
  const orderData = {
    customer: customer.value,
    customerName: customer.value.name || '',
    status: 'Paid',
    ...summaryData, // spread subtotal, tax, total from child
    itemCount: summaryData.itemCount,
    items: cart.value.map((item) => ({
      productId: item.product.id,
      name: item.product.productName || item.product.name || 'Unknown Item',
      sku: item.product.sku || 'N/A',
      category: item.product.productCategory || item.product.category || 'Other',
      image: item.product.productImage || item.product.image || null,
      variant: item.selectedSize ? item.selectedSize.label : 'Standard',
      addons: item.selectedAddons.map((a) => ({
        id: a.id || null,
        name: a.name || a.label,
        price: Number(a.price || 0),
      })),
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      note: item.note,
    })),
    createdAt: serverTimestamp(),
    time: serverTimestamp(),
    orderNumber: `ORD-${Date.now().toString().slice(-6)}`,
  }

  try {
    // 1. Save to Firestore
    await addDoc(collection(db, 'orders'), orderData)
    await orderStore.fetchOrders()

    // 2. (Optional) Update Pinia store if you cache orders there
    // orderStore.addOrder(orderData)

    $q.notify({
      type: 'positive',
      message: `Order #${orderData.orderNumber} placed!`,
      icon: 'check_circle',
      position: 'top-right',
    })

    clearCartSilently()
    emit('update:modelValue', false)
  } catch (error) {
    console.error('POS Error:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to place order: ' + error.message,
      icon: 'error',
    })
  }
}

const filteredActiveAddons = computed(() => {
  const pid = activeProduct.value?.id
  if (!pid) return []
  const all = Array.isArray(addonStore.addons) ? addonStore.addons : []
  return all.filter((a) => {
    if (a.status !== 'Available') return false
    const ids = Array.isArray(a.allowedProductIds) ? a.allowedProductIds : []
    return ids.includes(pid)
  })
})

// --- Lifecycle Hooks ---

onMounted(() => {
  // Fetch add-ons once when POS dialog mounts
  if (!addonStore.addons.length) {
    addonStore.fetchAddons()
  }

  const q = query(collection(db, 'products'))

  unsubscribeProducts = onSnapshot(
    q,
    (snapshot) => {
      products.value = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          // 1. SPREAD original data
          ...data,

          // 2. MAP Firestore fields to UI fields
          // If data.productName exists, use it; otherwise fallback to data.name
          name: data.productName || data.name || 'Unknown Item',

          // Ensure price is a Number. Default to 0 if missing.
          price: Number(data.productPrice || data.price || 0),

          category: data.productCategory || data.category || 'Other',
          image: data.image || 'https://via.placeholder.com/150', // Fallback image

          // 3. SAFEGUARDS for arrays
          sizes: Array.isArray(data.sizes) ? data.sizes : [],
          addons: Array.isArray(data.addons) ? data.addons : [],
        }
      })
      loadingProducts.value = false
    },
    (error) => {
      console.error('Error fetching products:', error)
      loadingProducts.value = false
    },
  )
})
onUnmounted(() => {
  // Stop listening when dialog closes to save bandwidth
  if (unsubscribeProducts) unsubscribeProducts()
})
</script>

<style scoped>
.bg-gradient-primary {
  background: linear-gradient(135deg, #1976d2 0%, #0d47a1 100%);
}

.shadow-3-left {
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.08);
}

.rounded-borders-top {
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}
</style>
