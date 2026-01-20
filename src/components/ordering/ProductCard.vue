<template>
  <q-card
    class="cursor-pointer full-height hover-lift shadow-1"
    @click="$emit('add-to-cart', product)"
    v-ripple
  >
    <div class="relative-position">
      <q-img :src="product.productImage || product.image" :ratio="4 / 3" class="rounded-tops">
      </q-img>
      <div class="absolute-bottom text-white text-center q-pa-xs bg-dark-overlay">
        <div class="text-subtitle2 text-weight-bold">
          ₱{{ product.price.toFixed(2) }}
          <span v-if="product.originalPrice" class="text-caption text-strike q-ml-xs">
            ₱{{ product.originalPrice.toFixed(2) }}
          </span>
        </div>
      </div>
    </div>

    <q-card-section class="q-pb-sm">
      <div class="text-weight-bold ellipsis text-grey-9">
        {{ product.name }}
      </div>
      <div class="text-caption text-grey-6 q-mt-xs ellipsis-2-lines" style="height: 2.8em">
        {{ product.description }}
      </div>
    </q-card-section>
  </q-card>
</template>

<script setup>
defineProps({
  product: {
    type: Object,
    required: true,
  },
})

defineEmits(['add-to-cart'])
</script>

<style scoped>
.hover-lift {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.hover-lift:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
}

.rounded-tops {
  border-radius: 10px 10px 0 0;
}

.bg-dark-overlay {
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
}

.ellipsis-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.text-strike {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
