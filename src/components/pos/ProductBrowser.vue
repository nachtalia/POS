<template>
  <div class="column no-wrap fit">
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
      <q-inner-loading :showing="loading" class="bg-grey-1">
        <q-spinner-dots size="50px" color="primary" />
      </q-inner-loading>

      <div class="row q-col-gutter-sm q-pb-md">
        <div
          v-for="product in filteredProducts"
          :key="product.id"
          class="col-6 col-sm-4 col-md-4 col-lg-3"
        >
          <div class="product-card-wrapper fit transition-generic">
            <q-card class="cursor-pointer fit column" @click="$emit('select-product', product)">
              <q-img :src="imgMap[product.id] || PLACEHOLDER_IMG" :style="$q.screen.lt.md ? 'height: 100px' : 'height: 140px'" fit="cover">
                <template v-slot:error
                  ><div class="absolute-full flex flex-center bg-grey-3 text-grey">
                    No Img
                  </div></template
                >
              </q-img>
              <q-card-section class="q-pa-sm col column">
                <div class="text-weight-bold text-subtitle2 ellipsis-2-lines">
                  {{ product.productName || product.name }}
                </div>
                <div class="q-mt-auto text-primary text-weight-bolder">
                  ₱{{ product.productPrice || product.price }}
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
</template>

<script setup>
import { ref, computed } from 'vue'

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

const dynamicCategories = computed(() => {
  const cats = new Set(['All'])
  props.products.forEach((p) => {
    const cat = p.productCategory || p.category
    if (cat) cats.add(cat)
  })
  return Array.from(cats)
})

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
.product-card-wrapper {
  transition: transform 0.2s;
}
.product-card-wrapper:hover {
  transform: translateY(-4px);
}
.search-input :deep(.q-field__control) {
  border-radius: 12px;
}
</style>
