<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    maximized
    transition-show="slide-up"
    transition-hide="slide-down"
  >
    <q-layout view="hHh lpR fFf" container class="bg-grey-1 font-inter">
      <q-header class="bg-white text-dark shadow-1 q-py-xs" height-hint="70">
        <q-toolbar class="q-px-md">
          <q-btn flat round dense icon="arrow_back" color="grey-8" v-close-popup />

          <q-toolbar-title class="row items-center text-weight-bold">
            <div class="q-pa-sm bg-primary text-white rounded-borders q-mr-md shadow-2">
              <q-icon name="point_of_sale" size="24px" />
            </div>
            <div class="column justify-center">
              <div class="text-subtitle1 text-weight-bolder leading-tight">POS Terminal</div>
              <div class="text-caption text-grey-6" style="font-size: 11px">
                Premium Edition v2.0
              </div>
            </div>
          </q-toolbar-title>

          <div class="row items-center q-gutter-x-md">
            <div class="row items-center bg-grey-2 rounded-capsule q-px-md q-py-xs">
              <q-icon name="schedule" color="primary" class="q-mr-sm" />
              <div class="column">
                <span class="text-caption text-grey-6" style="font-size: 10px">Session Time</span>
                <span class="text-weight-bold text-caption">{{ currentDate }}</span>
              </div>
            </div>

            <div
              class="row items-center bg-grey-2 rounded-capsule q-px-md q-py-xs cursor-pointer v-ripple"
            >
              <q-avatar
                size="28px"
                color="primary"
                text-color="white"
                class="q-mr-sm font-weight-bold"
                >A</q-avatar
              >
              <div class="column">
                <span class="text-caption text-grey-6" style="font-size: 10px">Operator</span>
                <span class="text-weight-bold text-caption">Admin</span>
              </div>
            </div>
          </div>
        </q-toolbar>
      </q-header>

      <q-page-container>
        <q-page class="row no-wrap fit q-pa-md q-col-gutter-md">
          <div class="col-12 col-md-8 column no-wrap">
            <div class="row q-col-gutter-sm q-mb-md items-center">
              <div class="col-grow">
                <q-input
                  v-model="search"
                  outlined
                  dense
                  placeholder="Search by name or SKU..."
                  bg-color="white"
                  class="search-input rounded-borders"
                >
                  <template v-slot:prepend>
                    <q-icon name="search" color="grey-5" />
                  </template>
                  <template v-slot:append v-if="search">
                    <q-icon
                      name="cancel"
                      class="cursor-pointer"
                      color="grey-5"
                      @click="search = ''"
                    />
                  </template>
                </q-input>
              </div>
            </div>

            <div class="q-mb-md">
              <q-scroll-area horizontal style="height: 50px" class="rounded-borders">
                <div class="row no-wrap q-gutter-x-sm">
                  <q-btn
                    v-for="cat in dynamicCategories"
                    :key="cat"
                    :label="cat"
                    unelevated
                    no-caps
                    rounded
                    :color="selectedCategory === cat ? 'primary' : 'white'"
                    :text-color="selectedCategory === cat ? 'white' : 'grey-8'"
                    class="q-px-lg shadow-sm"
                    @click="selectedCategory = cat"
                  />
                </div>
              </q-scroll-area>
            </div>

            <q-scroll-area class="col relative-position rounded-borders bg-transparent">
              <q-inner-loading :showing="loadingProducts" class="bg-grey-1">
                <q-spinner-dots size="50px" color="primary" />
              </q-inner-loading>

              <div class="row q-col-gutter-md q-pb-md">
                <div
                  v-for="product in filteredProducts"
                  :key="product.id"
                  class="col-12 col-sm-6 col-lg-4 col-xl-3"
                >
                  <div class="product-card-wrapper fit transition-generic">
                    <product-card :product="product" @add-to-cart="promptAddToCart" />
                  </div>
                </div>
              </div>

              <div
                v-if="!loadingProducts && filteredProducts.length === 0"
                class="absolute-full flex flex-center column"
              >
                <q-icon name="production_quantity_limits" size="60px" color="grey-4" />
                <div class="text-grey-5 text-h6 q-mt-md">No products found</div>
              </div>
            </q-scroll-area>
          </div>

          <div class="col-12 col-md-4 column no-wrap">
            <div class="bg-white rounded-borders shadow-2 column fit overflow-hidden">
              <div class="q-pa-md bg-grey-1 border-bottom">
                <customer-details v-model="customer" />
              </div>

              <q-scroll-area class="col bg-white">
                <q-list separator class="q-pa-sm">
                  <transition-group name="list">
                    <q-item
                      v-for="(item, index) in cart"
                      :key="index"
                      class="q-py-md cart-item rounded-borders"
                    >
                      <q-item-section avatar>
                        <q-img
                          :src="item.product.image"
                          style="width: 56px; height: 56px; border-radius: 12px"
                          fit="cover"
                          class="shadow-1"
                        >
                          <template v-slot:error>
                            <div class="absolute-full flex flex-center bg-grey-3">
                              <q-icon name="image" color="grey-5" />
                            </div>
                          </template>
                        </q-img>
                      </q-item-section>

                      <q-item-section>
                        <div class="row justify-between items-start">
                          <div class="text-subtitle2 text-weight-bold ellipsis-2-lines">
                            {{ item.product.productName }}
                          </div>
                          <div class="text-subtitle2 text-primary">
                            ${{ (item.unitPrice * item.quantity).toFixed(2) }}
                          </div>
                        </div>

                        <div class="text-caption text-grey-7 q-mt-xs line-height-tight">
                          <q-badge
                            v-if="item.selectedSize"
                            color="blue-1"
                            text-color="primary"
                            label="SIZE"
                            class="q-mr-xs"
                            rounded
                            dense
                          />
                          <span v-if="item.selectedSize" class="text-weight-medium q-mr-sm">{{
                            item.selectedSize.label
                          }}</span>

                          <div
                            v-if="item.selectedAddons?.length"
                            class="text-grey-6 text-xs q-mt-xs"
                          >
                            + {{ item.selectedAddons.map((a) => a.name || a.label).join(', ') }}
                          </div>
                          <div v-if="item.note" class="text-italic text-grey-5 q-mt-xs">
                            "{{ item.note }}"
                          </div>
                        </div>
                      </q-item-section>

                      <q-item-section side>
                        <div class="column items-center bg-grey-2 rounded-borders q-pa-xs">
                          <q-btn
                            flat
                            dense
                            round
                            size="xs"
                            icon="add"
                            color="grey-8"
                            @click="updateQuantity(index, 1)"
                          />
                          <div class="text-caption text-weight-bold q-py-xs">
                            {{ item.quantity }}
                          </div>
                          <q-btn
                            flat
                            dense
                            round
                            size="xs"
                            icon="remove"
                            color="grey-8"
                            @click="updateQuantity(index, -1)"
                          />
                        </div>
                      </q-item-section>
                    </q-item>
                  </transition-group>

                  <div v-if="cart.length === 0" class="column flex-center q-pa-xl text-grey-4">
                    <q-icon name="shopping_cart_checkout" size="60px" />
                    <div class="text-body1 q-mt-sm text-grey-5">Your cart is empty</div>
                    <div class="text-caption text-grey-4">Select products to begin</div>
                  </div>
                </q-list>
              </q-scroll-area>

              <div class="bg-white shadow-up-3 z-top">
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
                  class="q-px-md q-pb-md q-pt-sm"
                />
              </div>
            </div>
          </div>
        </q-page>
      </q-page-container>

      <q-dialog v-model="customizationDialog" position="bottom">
        <q-card
          style="width: 600px; max-width: 100vw; border-radius: 20px 20px 0 0"
          class="shadow-up-5"
        >
          <div v-if="activeProduct">
            <q-card-section class="row items-start q-pb-none">
              <q-img
                :src="activeProduct.image"
                class="rounded-borders shadow-1 col-3"
                style="height: 80px; width: 80px"
                fit="cover"
              />
              <div class="col q-pl-md">
                <div class="text-h6 text-weight-bold">{{ activeProduct.productName }}</div>
                <div class="text-caption text-grey-7 ellipsis-2-lines">
                  {{ activeProduct.description }}
                </div>
                <div class="text-h5 text-primary text-weight-bolder q-mt-xs">
                  ${{ customizedPrice.toFixed(2) }}
                </div>
              </div>
              <q-btn icon="close" flat round color="grey-7" v-close-popup />
            </q-card-section>

            <q-separator class="q-my-md" />

            <q-card-section style="max-height: 50vh" class="scroll q-pt-none">
              <div v-if="activeProduct.sizes && activeProduct.sizes.length > 0" class="q-mb-lg">
                <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">Select Size</div>
                <div class="row q-gutter-sm">
                  <q-btn
                    v-for="size in activeProduct.sizes"
                    :key="size.label"
                    :label="size.label"
                    :class="
                      customizationForm.size?.label === size.label
                        ? 'bg-primary text-white'
                        : 'bg-grey-2 text-grey-8'
                    "
                    class="col-grow rounded-borders q-py-sm"
                    flat
                    no-caps
                    @click="customizationForm.size = size"
                  >
                    <div class="column items-center">
                      <span>{{ size.label }}</span>
                      <span class="text-xs opacity-80" v-if="size.price > 0"
                        >+${{ size.price }}</span
                      >
                    </div>
                  </q-btn>
                </div>
              </div>

              <div v-if="filteredActiveAddons.length > 0" class="q-mb-lg">
                <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">Customize</div>
                <div class="row q-col-gutter-sm">
                  <div v-for="addon in filteredActiveAddons" :key="addon.id" class="col-6">
                    <q-item
                      tag="label"
                      class="bg-grey-1 rounded-borders border-transparent transition-generic"
                      :class="{
                        'bg-blue-1 border-primary': customizationForm.addons.includes(addon),
                      }"
                    >
                      <q-item-section side top>
                        <q-checkbox v-model="customizationForm.addons" :val="addon" dense />
                      </q-item-section>
                      <q-item-section>
                        <q-item-label class="text-weight-medium">{{
                          addon.name || addon.label
                        }}</q-item-label>
                        <q-item-label caption class="text-primary"
                          >+${{ Number(addon.price || 0).toFixed(2) }}</q-item-label
                        >
                      </q-item-section>
                    </q-item>
                  </div>
                </div>
              </div>

              <div>
                <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">
                  Special Instructions
                </div>
                <q-input
                  v-model="customizationForm.note"
                  outlined
                  type="textarea"
                  rows="2"
                  dense
                  placeholder="e.g. Less ice, warm..."
                  bg-color="grey-1"
                />
              </div>
            </q-card-section>

            <q-card-actions
              class="q-pa-md bg-white border-top row items-center no-wrap q-gutter-x-md"
            >
              <div class="row items-center bg-grey-2 rounded-capsule q-px-sm" style="height: 48px">
                <q-btn
                  round
                  flat
                  dense
                  icon="remove"
                  color="grey-8"
                  @click="customizationForm.quantity > 1 ? customizationForm.quantity-- : null"
                />
                <div class="q-px-md text-h6 text-weight-bold">{{ customizationForm.quantity }}</div>
                <q-btn
                  round
                  flat
                  dense
                  icon="add"
                  color="grey-8"
                  @click="customizationForm.quantity++"
                />
              </div>

              <q-btn
                color="primary"
                class="col-grow shadow-2 rounded-capsule text-weight-bold"
                size="lg"
                no-caps
                @click="confirmAddToCart"
              >
                <div class="row items-center justify-between full-width">
                  <span>Add to Order</span>
                  <span>${{ (customizedPrice * customizationForm.quantity).toFixed(2) }}</span>
                </div>
              </q-btn>
            </q-card-actions>
          </div>
        </q-card>
      </q-dialog>
    </q-layout>
    <ReceiptDialog v-model="showReceipt" :order="receiptOrder" />
  </q-dialog>
</template>

<script setup>
// ... (Keep your existing script exactly as it is)
import { ref, computed, reactive, onMounted, onUnmounted } from 'vue'
import { date, useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, onSnapshot, query, addDoc, serverTimestamp } from 'firebase/firestore'
import { useAddonStore } from 'src/stores/addonStore'
import { useOrderStore } from 'src/stores/orderStore'
import { logAudit } from 'src/services/auditService'
import ProductCard from 'src/components/ordering/ProductCard.vue'
import CustomerDetails from 'src/components/ordering/CustomerDetails.vue'
import CheckoutSummary from 'src/components/ordering/CheckoutSummary.vue'
import ReceiptDialog from 'src/components/ordering/ReceiptDialog.vue'

// (Copy the rest of your script setup logic here exactly as provided in the prompt)
// For brevity in the answer, I am assuming the script logic remains 100% identical.
// Just make sure to copy everything from `const $q = useQuasar()` down to `onUnmounted`.

// ... RE-INSERT SCRIPT LOGIC HERE ...

// Props & Emits
defineProps({
  modelValue: Boolean,
})
defineEmits(['update:modelValue', 'create'])

// State
const search = ref('')
const selectedCategory = ref('All')
const cart = ref([])
const products = ref([])
const loadingProducts = ref(true)
let unsubscribeProducts = null

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

// --- Computed Properties ---

const currentDate = computed(() => {
  return date.formatDate(Date.now(), 'hh:mm A') // Shortened for UI
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

const totalItems = computed(() => {
  return cart.value.reduce((total, item) => total + item.quantity, 0)
})

const customizedPrice = computed(() => {
  if (!activeProduct.value) return 0
  let total = Number(activeProduct.value.productPrice) || 0
  if (customizationForm.size) {
    total += Number(customizationForm.size.price) || 0
  }
  customizationForm.addons.forEach((addon) => {
    total += Number(addon.price) || 0
  })
  return total
})

const subtotal = computed(() => {
  return cart.value.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
})

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

const promptAddToCart = (product) => {
  activeProduct.value = JSON.parse(JSON.stringify(product))
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

const submitOrder = async (summaryData) => {
  if (!customer.value.name) {
    $q.notify({ type: 'warning', message: 'Please enter customer name' })
    return
  }
  const orderData = {
    customer: customer.value,
    customerName: customer.value.name || '',
    status: 'Paid',
    ...summaryData,
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
    const docRef = await addDoc(collection(db, 'orders'), orderData)
    await logAudit({
      module: 'ordering',
      action: 'add',
      entityType: 'order',
      entityId: docRef.id,
      details: {
        orderNumber: orderData.orderNumber,
        status: orderData.status,
        totalAmount: orderData.totalAmount,
        customerName: orderData.customerName,
      },
    })
    await orderStore.fetchOrders()

    $q.notify({
      type: 'positive',
      message: `Order #${orderData.orderNumber} placed!`,
      icon: 'check_circle',
      position: 'top-right',
    })

    receiptOrder.value = {
      ...orderData,
      customerName: orderData.customerName,
      date: new Date().toISOString(),
    }
    showReceipt.value = true
    clearCartSilently()
  } catch (error) {
    console.error('POS Error:', error)
    $q.notify({
      type: 'negative',
      message: 'Failed to place order: ' + error.message,
      icon: 'error',
    })
  }
}

onMounted(() => {
  if (!addonStore.addons.length) {
    addonStore.fetchAddons()
  }
  const q_products = query(collection(db, 'products'))
  unsubscribeProducts = onSnapshot(
    q_products,
    (snapshot) => {
      products.value = snapshot.docs.map((doc) => {
        const data = doc.data()
        return {
          id: doc.id,
          ...data,
          name: data.productName || data.name || 'Unknown Item',
          price: Number(data.productPrice || data.price || 0),
          category: data.productCategory || data.category || 'Other',
          image: data.image || 'https://via.placeholder.com/150',
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
  if (unsubscribeProducts) unsubscribeProducts()
})

const $q = useQuasar()
const addonStore = useAddonStore()
const orderStore = useOrderStore()
const showReceipt = ref(false)
const receiptOrder = ref(null)
</script>

<style scoped lang="scss">
/* Custom Utility Classes */
.font-inter {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
}

.rounded-capsule {
  border-radius: 50px;
}

.border-bottom {
  border-bottom: 1px solid #f0f0f0;
}

.border-top {
  border-top: 1px solid #f0f0f0;
}

.border-transparent {
  border: 1px solid transparent;
}

.border-primary {
  border: 1px solid var(--q-primary);
}

.search-input :deep(.q-field__control) {
  border-radius: 12px;
}

.product-card-wrapper {
  transition: all 0.2s ease;
  &:hover {
    transform: translateY(-4px);
  }
}

/* List Transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.cart-item {
  transition: background-color 0.2s;
  &:hover {
    background-color: #fafafa;
  }
}
</style>
