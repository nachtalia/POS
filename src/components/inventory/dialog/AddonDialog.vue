<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 400px">
      <q-card-section>
        <div class="text-h6">{{ editingAddon ? 'Edit Add-on' : 'Add Add-on' }}</div>
      </q-card-section>
      <q-card-section>
        <q-form ref="addonFormRef" class="q-gutter-md" @submit.prevent="handleSubmit">
          <q-input
            v-model="addonForm.name"
            label="Add-On Name"
            outlined
            dense
            :rules="[(v) => !!v || 'Required']"
          />
          <q-select
            v-model="addonForm.category"
            :options="addonCategoryOptions"
            label="Category"
            outlined
            dense
            emit-value
            :rules="[(v) => !!v || 'Required']"
          />
          <q-input
            v-model.number="addonForm.price"
            label="Price"
            type="number"
            outlined
            dense
            :rules="[
              (v) => (v !== null && v !== '') || 'Required',
              (v) => v >= 0 || 'Cannot be negative',
            ]"
          />
          <q-input
            v-model.number="addonForm.stock"
            label="Stock (optional)"
            type="number"
            outlined
            dense
          />
          <q-select
            v-model="addonForm.status"
            :options="statusOptions"
            label="Status"
            outlined
            dense
            emit-value
            :rules="[(v) => !!v || 'Required']"
          />
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
        <q-btn flat label="Save" color="primary" @click="handleSave" :loading="loading" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref, reactive, watch } from 'vue'
import { useQuasar } from 'quasar'

export default {
  name: 'AddonDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    editingAddon: {
      type: Object,
      default: null,
    },
    addonCategoryOptions: {
      type: Array,
      default: () => [],
    },
    statusOptions: {
      type: Array,
      default: () => ['Available', 'Unavailable'],
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'save', 'cancel'],

  setup(props, { emit }) {
    const $q = useQuasar()
    const addonFormRef = ref(null)

    const addonForm = reactive({
      name: '',
      category: '',
      price: 0,
      stock: null,
      status: 'Available',
    })

    // Watch for editingAddon changes
    watch(
      () => props.editingAddon,
      (addon) => {
        if (addon) {
          Object.assign(addonForm, {
            name: addon.name,
            category: addon.category,
            price: addon.price,
            stock: addon.stock,
            status: addon.status,
          })
        } else {
          // Reset form
          Object.assign(addonForm, {
            name: '',
            category: '',
            price: 0,
            stock: null,
            status: 'Available',
          })
        }
      },
      { immediate: true },
    )

    const handleSubmit = () => {
      handleSave()
    }

    const handleSave = async () => {
      const success = await addonFormRef.value.validate()
      if (success) {
        emit('save', { ...addonForm })
      } else {
        $q.notify({
          color: 'negative',
          message: 'Please fill in all required fields.',
          icon: 'warning',
        })
      }
    }

    const handleCancel = () => {
      emit('cancel')
    }

    return {
      addonFormRef,
      addonForm,
      handleSubmit,
      handleSave,
      handleCancel,
    }
  },
}
</script>
