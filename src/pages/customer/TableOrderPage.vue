<template>
  <q-page class="bg-grey-1 column no-wrap window-height">
    <div v-if="loading" class="flex flex-center col">
      <q-spinner size="3em" color="primary" />
    </div>

    <div v-else-if="error" class="flex flex-center col text-negative">
      <q-icon name="error" size="3em" class="q-mb-sm" />
      <div>{{ error }}</div>
    </div>

    <template v-else-if="table">
      <!-- Header -->
      <div class="bg-white q-pa-md shadow-1 z-top relative-position flex-shrink-0">
        <div class="row items-center justify-between">
          <div>
            <div class="text-h6 text-weight-bold">{{ table.name }}</div>
            <div class="text-caption text-grey">
              <q-icon name="group" size="xs" /> Capacity: {{ table.capacity || 'N/A' }}
            </div>
          </div>
          <q-btn
            color="primary"
            icon="shopping_cart"
            :label="`Cart (${cartTotalItems})`"
            @click="showCart = true"
            unelevated
            rounded
          />
        </div>
      </div>

      <!-- Product Browser -->
      <div class="col relative-position">
        <ProductBrowser
          :products="table.products || []"
          :loading="loading"
          :img-map="imgMap"
          @select-product="handleProductSelect"
        />
      </div>

      <q-dialog
        v-model="showCart"
        position="bottom"
        maximized
        transition-show="slide-up"
        transition-hide="slide-down"
      >
        <q-card class="column full-height bg-grey-1">
          <q-card-section
            class="row items-center justify-between bg-white text-dark shadow-1 z-top"
          >
            <div class="row items-center">
              <q-icon name="shopping_bag" color="primary" size="sm" class="q-mr-sm" />
              <div class="text-h6 text-weight-bold">Your Order</div>
            </div>
            <q-btn icon="close" flat round dense v-close-popup color="grey-7" />
          </q-card-section>

          <q-card-section class="col scroll q-pa-none">
            <div v-if="cart.length === 0" class="flex flex-center full-height text-grey-6 column">
              <q-icon name="remove_shopping_cart" size="4em" class="q-mb-md opacity-50" />
              <div class="text-h6">Cart is empty</div>
              <div class="text-caption">Add some delicious items to get started!</div>
              <q-btn
                label="Browse Menu"
                color="primary"
                flat
                class="q-mt-md"
                @click="showCart = false"
              />
            </div>

            <div v-else class="q-pa-md q-gutter-y-md">
              <q-card
                v-for="(item, index) in cart"
                :key="index"
                flat
                bordered
                class="bg-white rounded-borders"
              >
                <q-card-section class="row q-pa-sm">
                  <div class="col-auto q-mr-md">
                    <q-img
                      :src="imgMap[item.productId]"
                      style="height: 80px; width: 80px"
                      class="rounded-borders bg-grey-2"
                      fit="cover"
                    >
                      <template v-slot:error>
                        <div class="absolute-full flex flex-center bg-grey-2 text-grey-5">
                          <q-icon name="restaurant" size="md" />
                        </div>
                      </template>
                      <template v-slot:loading>
                        <q-spinner color="primary" />
                      </template>
                    </q-img>
                  </div>

                  <div class="col column justify-between">
                    <div>
                      <div class="text-subtitle2 text-weight-bold ellipsis-2-lines leading-tight">
                        {{ item.name }}
                      </div>
                      <div class="text-caption text-grey-7">₱{{ item.price }} / item</div>
                      <div
                        v-if="item.notes"
                        class="q-mt-xs bg-orange-1 text-orange-9 q-px-sm q-py-xs rounded-borders text-caption inline-block"
                      >
                        <q-icon name="edit_note" size="xs" /> "{{ item.notes }}"
                      </div>
                    </div>
                  </div>

                  <div class="col-auto column items-end justify-between q-ml-sm">
                    <div class="text-subtitle1 text-primary text-weight-bold">
                      ₱{{ (item.price * item.quantity).toFixed(2) }}
                    </div>

                    <div class="row items-center bg-grey-2 rounded-borders q-mt-sm">
                      <q-btn
                        flat
                        round
                        dense
                        size="sm"
                        :icon="item.quantity === 1 ? 'delete_outline' : 'remove'"
                        :color="item.quantity === 1 ? 'negative' : 'grey-8'"
                        @click="updateQuantity(index, -1)"
                      />
                      <div
                        class="q-px-sm text-weight-bold text-body2"
                        style="min-width: 20px; text-align: center"
                      >
                        {{ item.quantity }}
                      </div>
                      <q-btn
                        flat
                        round
                        dense
                        size="sm"
                        icon="add"
                        color="primary"
                        @click="updateQuantity(index, 1)"
                      />
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </q-card-section>

          <q-card-section class="bg-white shadow-up-2 z-top">
            <div class="q-mb-md">
              <div class="text-caption text-grey-7 q-mb-xs text-weight-medium">
                CUSTOMER DETAILS
              </div>
              <q-input
                v-model="customerName"
                outlined
                dense
                placeholder="Enter your name"
                bg-color="grey-1"
              >
                <template v-slot:prepend>
                  <q-icon name="person" color="grey-6" />
                </template>
              </q-input>
            </div>

            <div class="row items-center q-mb-md bg-blue-1 text-blue-9 q-pa-sm rounded-borders">
              <q-icon name="info" class="q-mr-sm" />
              <div class="text-caption">Payment will be collected at the cashier.</div>
            </div>

            <div class="row justify-between items-end q-mb-md">
              <div class="text-grey-8">Total Amount</div>
              <div class="text-h5 text-primary text-weight-bolder">
                ₱{{ cartTotalAmount.toFixed(2) }}
              </div>
            </div>

            <q-btn
              color="primary"
              class="full-width q-py-md shadow-2"
              size="lg"
              unelevated
              rounded
              :disable="cart.length === 0 || placingOrder || !customerName"
              :loading="placingOrder"
              @click="placeOrder"
            >
              <div class="row items-center no-wrap">
                <span>Place Order</span>
                <q-icon name="arrow_forward" size="xs" class="q-ml-sm" />
              </div>
            </q-btn>
          </q-card-section>
        </q-card>
      </q-dialog>

      <!-- Add to Cart Dialog -->
      <q-dialog v-model="showProductDialog" position="bottom">
        <q-card style="width: 100%" v-if="selectedProduct">
          <q-img
            v-if="imgMap[selectedProduct.id]"
            :src="imgMap[selectedProduct.id]"
            style="height: 200px"
            fit="cover"
          />
          <q-card-section>
            <div class="text-h6">{{ selectedProduct.productName || selectedProduct.name }}</div>
            <div class="text-primary text-h6 text-weight-bold">
              ₱{{ selectedProduct.productPrice || selectedProduct.price }}
            </div>
            <div class="text-grey-7 q-mt-sm">{{ selectedProduct.description }}</div>
          </q-card-section>

          <q-card-section>
            <q-input v-model="itemNotes" label="Special Instructions" outlined dense autogrow />
          </q-card-section>

          <q-card-section class="row items-center justify-between">
            <div class="row items-center bg-grey-2 rounded-borders q-pa-xs">
              <q-btn flat round dense icon="remove" @click="itemQty > 1 ? itemQty-- : null" />
              <div class="text-h6 q-px-md">{{ itemQty }}</div>
              <q-btn flat round dense icon="add" @click="itemQty++" />
            </div>
            <q-btn
              color="primary"
              label="Add to Order"
              icon="add_shopping_cart"
              @click="addToCart"
              unelevated
              class="q-px-lg"
            />
          </q-card-section>
        </q-card>
      </q-dialog>
    </template>
  </q-page>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTableStore } from 'src/stores/tableStore'
import { useCustomerOrdersStore } from 'src/stores/customerOrdersStore'
import ProductBrowser from 'src/components/pos/ProductBrowser.vue'
import { useQuasar } from 'quasar'

const route = useRoute()
const tableStore = useTableStore()
const customerOrdersStore = useCustomerOrdersStore()
const $q = useQuasar()

const table = ref(null)
const loading = ref(true)
const error = ref(null)
const showCart = ref(false)
const placingOrder = ref(false)
const customerName = ref('')

// Product Selection State
const showProductDialog = ref(false)
const selectedProduct = ref(null)
const itemQty = ref(1)
const itemNotes = ref('')

const cart = ref([])

const imgMap = computed(() => {
  const map = {}
  if (table.value && table.value.products) {
    table.value.products.forEach((p) => {
      if (p.productImage) {
        map[p.id] = p.productImage
      }
    })
  }
  return map
})

const cartTotalItems = computed(() => cart.value.reduce((acc, item) => acc + item.quantity, 0))
const cartTotalAmount = computed(() =>
  cart.value.reduce((acc, item) => acc + item.price * item.quantity, 0),
)

onMounted(async () => {
  const tableId = route.params.tableId
  if (!tableId) {
    error.value = 'No table ID provided'
    loading.value = false
    return
  }

  const fetchedTable = await tableStore.fetchTableById(tableId)
  if (fetchedTable) {
    table.value = fetchedTable
  } else {
    error.value = 'Table not found or invalid'
  }
  loading.value = false
})

const handleProductSelect = (product) => {
  selectedProduct.value = product
  itemQty.value = 1
  itemNotes.value = ''
  showProductDialog.value = true
}

const addToCart = () => {
  if (!selectedProduct.value) return

  const price = Number(selectedProduct.value.productPrice || selectedProduct.value.price || 0)

  cart.value.push({
    productId: selectedProduct.value.id || selectedProduct.value.productId,
    name: selectedProduct.value.productName || selectedProduct.value.name,
    price: price,
    quantity: itemQty.value,
    notes: itemNotes.value,
  })

  showProductDialog.value = false
  $q.notify({
    message: 'Added to cart',
    color: 'positive',
    icon: 'check',
    position: 'top',
    timeout: 1000,
  })
}

const updateQuantity = (index, change) => {
  const item = cart.value[index]
  const newQty = item.quantity + change
  if (newQty <= 0) {
    cart.value.splice(index, 1)
  } else {
    item.quantity = newQty
  }
}

const placeOrder = async () => {
  if (cart.value.length === 0 || !customerName.value) return

  placingOrder.value = true
  try {
    const orderData = {
      tableId: table.value.id,
      tableName: table.value.name,
      branchId: table.value.branchId,
      items: cart.value,
      totalAmount: cartTotalAmount.value,
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod: 'cashier',
      customerName: customerName.value,
    }

    await customerOrdersStore.createOrder(orderData)

    $q.notify({
      type: 'positive',
      message: 'Order placed successfully! Please proceed to the cashier.',
      icon: 'check_circle',
      position: 'center',
      timeout: 3000,
    })

    cart.value = []
    customerName.value = ''
    showCart.value = false
  } catch {
    $q.notify({
      type: 'negative',
      message: 'Failed to place order. Please try again.',
    })
  } finally {
    placingOrder.value = false
  }
}
</script>
