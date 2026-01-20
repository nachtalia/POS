<template>
  <div class="cart-items-container bg-grey-2">
    <div class="q-px-md q-py-sm bg-white border-bottom row justify-between items-center">
      <div class="text-subtitle1 text-weight-bold text-grey-8">
        <q-icon name="shopping_cart" class="q-mr-sm" color="primary" />
        Items: {{ items.length }}
      </div>
      <div class="text-caption text-grey-6">Scroll to see more</div>
    </div>

    <q-scroll-area class="fit q-pr-sm">
      <q-list class="q-pa-sm q-gutter-y-sm">
        <div v-if="items.length === 0" class="column flex-center text-grey-5" style="height: 400px">
          <q-icon name="add_shopping_cart" size="80px" color="grey-4" />
          <div class="text-h6 q-mt-md">Order is Empty</div>
          <div class="text-caption">Select products from the menu</div>
        </div>

        <transition-group name="list-anim">
          <q-item
            v-for="item in items"
            :key="item.id || item.product?.id"
            class="bg-white rounded-borders shadow-1 q-py-md"
            clickable
          >
            <q-item-section avatar>
              <q-avatar rounded size="80px" color="grey-2">
                <q-img
                  :src="item.product?.image || item.image || ''"
                  ratio="1"
                  class="rounded-borders"
                  style="height: 100%; width: 100%"
                >
                  <template v-slot:loading>
                    <div class="text-grey-4 flex flex-center full-height">
                      <q-spinner size="20px" />
                    </div>
                  </template>

                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-2 text-grey-4">
                      <q-icon name="fastfood" size="40px" />
                    </div>
                  </template>
                </q-img>
              </q-avatar>
            </q-item-section>
            <q-item-section class="column justify-between" style="min-height: 80px">
              <div>
                <div class="text-h6 text-weight-bold text-grey-9 lh-tight">
                  {{ item.product?.productName || item.productName || 'Unknown' }}
                </div>
                <div class="text-caption text-grey-6">
                  {{ item.product?.productCategory || item.category || 'General' }}
                </div>
              </div>

              <div class="row items-baseline q-mt-sm">
                <span class="text-h6 text-primary text-weight-bolder">
                  ₱{{
                    (
                      (item.product?.productPrice || item.price || 0) * item.quantity
                    ).toLocaleString()
                  }}
                </span>
                <span class="text-caption text-grey-5 q-ml-xs">
                  (₱{{ item.product?.productPrice || item.price || 0 }} ea)
                </span>
              </div>
            </q-item-section>

            <q-item-section side>
              <div class="column items-end justify-between" style="height: 100%">
                <q-btn
                  flat
                  round
                  dense
                  icon="close"
                  color="grey-4"
                  class="hover-red q-mb-xs"
                  @click.stop="$emit('remove-item', item)"
                  size="sm"
                />

                <div class="row items-center bg-grey-2 rounded-borders">
                  <q-btn
                    round
                    flat
                    dense
                    color="grey-8"
                    icon="remove"
                    size="lg"
                    class="q-pa-xs"
                    @click.stop="$emit('update-quantity', item, -1)"
                    :disable="item.quantity <= 1"
                  />
                  <span
                    class="text-h5 text-weight-bold q-mx-md"
                    style="min-width: 25px; text-align: center"
                  >
                    {{ item.quantity }}
                  </span>
                  <q-btn
                    round
                    unelevated
                    color="primary"
                    text-color="white"
                    icon="add"
                    size="md"
                    class="q-ma-xs shadow-1"
                    @click.stop="$emit('update-quantity', item, 1)"
                  />
                </div>
              </div>
            </q-item-section>
          </q-item>
        </transition-group>

        <div style="height: 20px"></div>
      </q-list>
    </q-scroll-area>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})
defineEmits(['update-quantity', 'remove-item'])
</script>

<style scoped>
.cart-items-container {
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}
.lh-tight {
  line-height: 1.1;
}
.hover-red:hover {
  color: #d32f2f !important;
  background: #ffebee;
}
.list-anim-enter-active,
.list-anim-leave-active {
  transition: all 0.3s ease;
}
.list-anim-enter-from,
.list-anim-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
