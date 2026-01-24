<template>
  <div class="row q-col-gutter-md">
    <div v-for="product in products" :key="product.id" class="col-6 col-sm-4 col-md-3 col-lg-2">
      <q-card class="shadow-1 catalog-card">
        <q-img
          :src="product.productImage || placeholderImage"
          class="rounded-borders"
          style="height: 120px"
        >
          <div
            class="absolute-bottom-left q-ma-xs rounded-borders"
            v-if="$q.screen.lt.md"
            style="background: rgba(0, 0, 0, 0.5); backdrop-filter: blur(4px); padding: 2px 6px"
          >
            <div class="text-weight-bold text-white text-subtitle2">
              ₱{{ Number(product.productPrice || 0).toFixed(2) }}
            </div>
          </div>
          <template v-slot:error>
            <div class="absolute-full flex flex-center bg-grey-3 text-grey">
              <q-icon name="image_not_supported" />
            </div>
          </template>
        </q-img>
        <q-card-section>
          <div class="text-weight-bold text-grey-9">{{ product.productName }}</div>
          
          <div class="row items-center justify-between q-mt-xs">
            <q-chip dense color="grey-3" text-color="grey-8" v-if="product.productCategory">
              {{ product.productCategory }}
            </q-chip>
            <div class="text-subtitle1 text-weight-bold text-primary q-mt-xs" v-if="$q.screen.gt.sm">
            ₱{{ Number(product.productPrice || 0).toFixed(2) }}
          </div>
          </div>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn
            flat
            round
            dense
            icon="edit"
            color="primary"
            @click="$emit('edit', product)"
            v-if="canEditProduct"
          />
          <q-btn
            flat
            round
            dense
            icon="delete"
            color="negative"
            @click="$emit('delete', product)"
            v-if="canDeleteProduct"
          />
        </q-card-actions>
      </q-card>
    </div>
  </div>
</template>

<script setup>
defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  placeholderImage: {
    type: String,
    default: '',
  },
  canEditProduct: {
    type: Boolean,
    default: false,
  },
  canDeleteProduct: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit', 'delete'])
</script>

<style scoped>
.catalog-card .q-card__section {
  padding: 8px;
}
.catalog-card .q-card__actions {
  padding: 8px;
}
.catalog-card .text-weight-bold {
  font-size: 13px;
}
</style>
