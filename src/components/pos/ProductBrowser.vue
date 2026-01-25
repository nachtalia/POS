<template>
  <div class="fit">
    <div v-if="$q.screen.gt.xs" class="column no-wrap fit bg-grey-1 q-pa-md">
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
            <template v-slot:prepend><q-icon name="search" color="grey-5" /></template>
            <template v-slot:append v-if="search">
              <q-icon name="cancel" class="cursor-pointer" color="grey-5" @click="search = ''" />
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
        <div class="row q-col-gutter-sm q-pb-md">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="col-sm-4 col-md-3 col-lg-2"
          >
            <div class="product-card-wrapper fit transition-generic">
              <q-card class="cursor-pointer fit column" @click="$emit('select-product', product)">
                <q-img
                  :src="imgMap[product.id] || PLACEHOLDER_IMG"
                  style="height: 140px"
                  fit="cover"
                >
                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-3 text-grey">No Img</div>
                  </template>
                </q-img>
                <q-card-section class="q-pa-sm col column">
                  <div class="text-weight-bold text-subtitle2 ellipsis-2-lines">
                    {{ product.productName || product.name }}
                  </div>
                  <div class="q-mt-auto text-primary text-weight-bolder">
                    ₱{{ formatPrice(product.productPrice || product.price) }}
                  </div>
                </q-card-section>
              </q-card>
            </div>
          </div>
        </div>

        <div
          v-if="!loading && filteredProducts.length === 0"
          class="absolute-full flex flex-center column"
        >
          <q-icon name="production_quantity_limits" size="60px" color="grey-4" />
          <div class="text-grey-5 text-h6 q-mt-md">No products found</div>
        </div>
      </q-scroll-area>
    </div>

    <div v-else class="column no-wrap fit bg-grey-1">
      <div class="bg-white q-pb-sm shadow-1 relative-position mobile-header-z">
        <div class="q-pa-md">
          <q-input
            v-model="search"
            outlined
            rounded
            dense
            placeholder="Search item..."
            bg-color="grey-2"
            class="mobile-search-input custom-input"
            clearable
          >
            <template v-slot:prepend><q-icon name="search" color="grey-7" /></template>
          </q-input>
        </div>

        <q-scroll-area horizontal style="height: 40px" class="full-width no-scrollbars q-px-md">
          <div class="row no-wrap q-gutter-x-sm">
            <q-btn
              v-for="cat in dynamicCategories"
              :key="cat"
              rounded
              unelevated
              :color="selectedCategory === cat ? 'green-7' : 'grey-3'"
              :text-color="selectedCategory === cat ? 'white' : 'grey-9'"
              :label="cat"
              no-caps
              class="text-weight-bold"
              @click="selectedCategory = cat"
            />
          </div>
        </q-scroll-area>
      </div>

      <q-scroll-area class="col">
        <div class="q-pb-xl">
          <div class="q-pa-md q-pb-sm">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-h6 text-weight-bolder text-grey-9">Featured</div>
            </div>
            <q-scroll-area horizontal style="height: 200px" class="full-width no-scrollbars">
              <div class="row no-wrap q-gutter-x-md">
                <div v-for="product in featuredProducts" :key="product.id" style="width: 150px">
                  <q-card
                    flat
                    class="bg-transparent cursor-pointer"
                    @click="$emit('select-product', product)"
                  >
                    <q-responsive :ratio="1">
                      <q-img
                        :src="imgMap[product.id] || PLACEHOLDER_IMG"
                        class="rounded-borders-12 shadow-1"
                      >
                        <div class="absolute-top-left q-pa-xs">
                          <q-badge
                            color="orange-7"
                            text-color="white"
                            label="HOT"
                            class="text-bold shadow-1"
                          />
                        </div>
                      </q-img>
                    </q-responsive>
                    <div class="q-mt-sm">
                      <div class="text-subtitle2 text-weight-bold ellipsis text-grey-9">
                        {{ product.productName || product.name }}
                      </div>
                      <div class="text-caption text-primary text-weight-bolder">
                        ₱{{ formatPrice(product.productPrice || product.price) }}
                      </div>
                    </div>
                  </q-card>
                </div>
              </div>
            </q-scroll-area>
          </div>

          <q-separator class="q-my-sm bg-grey-3" />

          <div class="q-px-md q-pt-sm">
            <div class="text-h6 text-weight-bolder text-grey-9 q-mb-md">Menu Items</div>

            <div v-for="product in filteredProducts" :key="product.id" class="q-mb-lg">
              <q-card
                flat
                class="row no-wrap items-start q-gutter-x-md clickable-row bg-transparent"
                @click="$emit('select-product', product)"
              >
                <div style="width: 100px; height: 100px" class="relative-position flex-shrink-0">
                  <q-img
                    :src="imgMap[product.id] || PLACEHOLDER_IMG"
                    class="rounded-borders-12 fit shadow-1"
                    fit="cover"
                  />
                </div>

                <div class="col column justify-between" style="min-height: 100px">
                  <div>
                    <div class="text-subtitle1 text-weight-bold text-grey-10 ellipsis-2-lines">
                      {{ product.productName || product.name }}
                    </div>
                    <div class="text-caption text-grey-6">{{ product.category || 'General' }}</div>
                  </div>
                  <div class="row items-center justify-between q-mt-xs">
                    <div class="text-subtitle1 text-weight-bolder text-primary">
                      ₱{{ formatPrice(product.productPrice || product.price) }}
                    </div>
                    <q-btn round flat icon="add_circle" color="green-7" />
                  </div>
                </div>
              </q-card>
              <q-separator class="q-mt-md bg-grey-2" inset />
            </div>

            <div
              v-if="!loading && filteredProducts.length === 0"
              class="flex flex-center column q-pa-xl text-grey-5"
            >
              <q-icon name="search_off" size="48px" />
              <div class="text-subtitle1 q-mt-sm">No items found</div>
            </div>
          </div>
        </div>
      </q-scroll-area>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useQuasar } from 'quasar'

const $q = useQuasar()

const props = defineProps({
  products: { type: Array, default: () => [] },
  loading: Boolean,
  imgMap: { type: Object, default: () => ({}) },
})

defineEmits(['select-product'])

const search = ref('')
const selectedCategory = ref('All')
const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

const formatPrice = (val) =>
  Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })

const dynamicCategories = computed(() => {
  const cats = new Set(['All'])
  props.products.forEach((p) => {
    const cat = p.productCategory || p.category
    if (cat) cats.add(cat)
  })
  return Array.from(cats).sort()
})

const featuredProducts = computed(() => props.products.slice(0, 5))

const filteredProducts = computed(() => {
  let list = props.products
  if (selectedCategory.value !== 'All') {
    list = list.filter((p) => (p.productCategory || p.category) === selectedCategory.value)
  }
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) =>
        (p.productName || p.name || '').toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q),
    )
  }
  return list
})
</script>

<style scoped>
/* ========================
   KEY FIX: Z-INDEX
   ======================== */
.mobile-header-z {
  z-index: 5; /* Enough to cast shadow on list, low enough to sit behind Dialogs */
  position: relative;
}

/* ========================
   DESKTOP STYLES
   ======================== */
.product-card-wrapper {
  transition: transform 0.2s;
}
.product-card-wrapper:hover {
  transform: translateY(-4px);
}
.search-input :deep(.q-field__control) {
  border-radius: 12px;
}

/* ========================
   MOBILE STYLES
   ======================== */
.mobile-search-input :deep(.q-field__control) {
  border: none;
  padding-left: 12px;
}
.rounded-borders-12 {
  border-radius: 12px;
}
.clickable-row {
  cursor: pointer;
  transition: opacity 0.1s;
}
.clickable-row:active {
  opacity: 0.7;
}
.no-scrollbars :deep(.q-scrollarea__content) {
  scrollbar-width: none;
}
.no-scrollbars :deep(.q-scrollarea__content::-webkit-scrollbar) {
  display: none;
}
.text-weight-bolder {
  font-weight: 800;
}
</style>
