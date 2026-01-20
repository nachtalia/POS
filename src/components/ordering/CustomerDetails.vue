<template>
  <div class="customer-details bg-white q-pa-md shadow-1" style="z-index: 10">
    <div class="text-subtitle2 text-grey-8 q-mb-xs row items-center">
      <q-icon name="account_circle" class="q-mr-sm" color="primary" />
      Customer Information
    </div>

    <div class="row q-col-gutter-sm">
      <div class="col-12">
        <q-input
          :model-value="modelValue.name"
          @update:model-value="(val) => updateField('name', val)"
          label="Customer Name *"
          outlined
          dense
          bg-color="grey-1"
          hide-bottom-space
          class="text-weight-bold"
        >
          <template v-slot:prepend>
            <q-icon name="badge" color="grey-6" size="xs" />
          </template>
        </q-input>
      </div>

      <div class="col-12">
        <q-input
          :model-value="modelValue.address"
          @update:model-value="(val) => updateField('address', val)"
          label="Address (Optional)"
          outlined
          dense
          bg-color="grey-1"
          hide-bottom-space
        >
          <template v-slot:prepend>
            <q-icon name="place" color="grey-6" size="xs" />
          </template>
        </q-input>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({ name: '', address: '' }),
  },
})

const emit = defineEmits(['update:modelValue'])

const updateField = (key, value) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}
</script>
