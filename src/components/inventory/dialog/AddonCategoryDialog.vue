<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 360px">
      <q-card-section>
        <div class="text-h6">Add Add-on Category</div>
      </q-card-section>
      <q-card-section>
        <q-form @submit.prevent="handleSubmit" id="addonCategoryForm">
          <q-input
            v-model="addonCategoryForm.name"
            label="Name"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Required']"
          />
          <q-input
            v-model="addonCategoryForm.description"
            label="Description"
            type="textarea"
            outlined
            dense
          />
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
        <q-btn flat label="Save" color="primary" type="submit" form="addonCategoryForm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { reactive } from 'vue'

export default {
  name: 'AddonCategoryDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'save', 'cancel'],

  setup(props, { emit }) {
    const addonCategoryForm = reactive({ name: '', description: '' })

    const handleSubmit = () => {
      emit('save', { ...addonCategoryForm })
    }

    const handleCancel = () => {
      emit('cancel')
    }

    return {
      addonCategoryForm,
      handleSubmit,
      handleCancel,
    }
  },
}
</script>
