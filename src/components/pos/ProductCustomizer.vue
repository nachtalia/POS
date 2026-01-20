<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    position="bottom"
  >
    <q-card
      style="width: 600px; max-width: 100vw; border-radius: 20px 20px 0 0"
      class="shadow-up-5"
    >
      <div v-if="product">
        <q-card-section class="row items-start q-pb-none">
          <q-img
            :src="imgMap[product.id] || PLACEHOLDER_IMG"
            class="rounded-borders shadow-1 col-3 bg-grey-2"
            style="height: 80px; width: 80px"
            fit="cover"
          />
          <div class="col q-pl-md">
            <div class="text-h6 text-weight-bold">{{ product.productName }}</div>
            <div class="text-caption text-grey-7 ellipsis-2-lines">{{ product.description }}</div>
            <div class="text-h5 text-primary text-weight-bolder q-mt-xs">
              ₱{{ currentPrice.toFixed(2) }}
            </div>
          </div>
          <q-btn icon="close" flat round color="grey-7" v-close-popup />
        </q-card-section>

        <q-separator class="q-my-md" />

        <q-card-section style="max-height: 50vh" class="scroll q-pt-none">
          <div v-if="product.sizes && product.sizes.length > 0" class="q-mb-lg">
            <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">Select Size</div>
            <div class="row q-gutter-sm">
              <q-btn
                v-for="size in product.sizes"
                :key="size.label"
                :label="size.label"
                :class="
                  form.size?.label === size.label
                    ? 'bg-primary text-white'
                    : 'bg-grey-2 text-grey-8'
                "
                class="col-grow rounded-borders q-py-sm"
                flat
                no-caps
                @click="form.size = size"
              >
                <div class="column items-center">
                  <span>{{ size.label }}</span>
                  <span class="text-xs opacity-80" v-if="size.price > 0">+₱{{ size.price }}</span>
                </div>
              </q-btn>
            </div>
          </div>

          <div v-if="availableAddons.length > 0" class="q-mb-lg">
            <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">
              Customize (Add-ons)
            </div>
            <div class="row q-col-gutter-sm">
              <div v-for="addon in availableAddons" :key="addon.id" class="col-6">
                <q-item
                  tag="label"
                  class="bg-grey-1 rounded-borders border-transparent transition-generic"
                  :class="{
                    'bg-blue-1 border-primary': form.addons.some((a) => a.id === addon.id),
                  }"
                >
                  <q-item-section side>
                    <q-checkbox v-model="form.addons" :val="addon" dense color="primary" />
                  </q-item-section>
                  <q-item-section>
                    <q-item-label class="text-weight-medium">
                      {{ addon.name }}
                    </q-item-label>
                    <q-item-label caption class="text-primary">
                      +₱{{ Number(addon.price || 0).toFixed(2) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </div>
            </div>
          </div>

          <div class="q-mb-lg">
            <div class="text-subtitle2 text-grey-8 q-mb-sm font-weight-bold">Notes</div>
            <q-input
              v-model="form.note"
              outlined
              dense
              placeholder="e.g. Less ice, separate sauce..."
              bg-color="white"
            />
          </div>
        </q-card-section>

        <q-card-actions class="q-pa-md bg-white border-top row items-center no-wrap q-gutter-x-md">
          <div class="row items-center bg-grey-2 rounded-capsule q-px-sm" style="height: 56px">
            <q-btn
              round
              flat
              dense
              size="lg"
              icon="remove"
              color="grey-9"
              @click="form.quantity > 1 ? form.quantity-- : null"
            />
            <div class="q-px-md text-h5 text-weight-bold">{{ form.quantity }}</div>
            <q-btn round flat dense size="lg" icon="add" color="grey-9" @click="form.quantity++" />
          </div>

          <q-btn
            color="primary"
            class="col-grow shadow-2 rounded-capsule text-weight-bold"
            size="lg"
            no-caps
            @click="confirm"
          >
            <div class="row items-center justify-between full-width">
              <span>Add to Order</span>
              <span>₱{{ (currentPrice * form.quantity).toFixed(2) }}</span>
            </div>
          </q-btn>
        </q-card-actions>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { reactive, computed, watch } from 'vue'
import { useAddonStore } from 'src/stores/addonStore'

const props = defineProps({
  modelValue: Boolean,
  product: Object,
  imgMap: Object,
})
const emit = defineEmits(['update:modelValue', 'add-to-cart'])

const addonStore = useAddonStore()
const PLACEHOLDER_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='

// State
const form = reactive({
  size: null,
  addons: [],
  quantity: 1,
  note: '',
})

// Reset form whenever a new product is opened
watch(
  () => props.product,
  (newP) => {
    if (newP) {
      form.size = newP.sizes?.[0] || null
      form.addons = []
      form.quantity = 1
      form.note = ''
    }
  },
)

// Add-ons filtering based on Firestore status and allowedProductIds
const availableAddons = computed(() => {
  if (!props.product) return []
  return addonStore.addons.filter((a) => {
    // Only 'Available' status
    const isAvailable = a.status === 'Available'
    // Current product ID must be in the allowed list
    const isAllowed = a.allowedProductIds && a.allowedProductIds.includes(props.product.id)
    return isAvailable && isAllowed
  })
})

// Calculate total unit price based on base price, size, and addons
const currentPrice = computed(() => {
  if (!props.product) return 0
  let total = Number(props.product.productPrice || props.product.price) || 0
  if (form.size) total += Number(form.size.price) || 0
  // Sum up addon prices
  form.addons.forEach((a) => (total += Number(a.price || 0)))
  return total
})

// Submit to parent component
const confirm = () => {
  emit('add-to-cart', {
    product: { ...props.product },
    selectedSize: form.size,
    selectedAddons: [...form.addons],
    quantity: form.quantity,
    unitPrice: currentPrice.value,
    note: form.note,
  })
  emit('update:modelValue', false)
}
</script>

<style scoped>
.rounded-capsule {
  border-radius: 50px;
}
.border-transparent {
  border: 1px solid transparent;
}
.border-primary {
  border: 1px solid var(--q-primary);
}
.transition-generic {
  transition: all 0.2s ease-in-out;
}
</style>
