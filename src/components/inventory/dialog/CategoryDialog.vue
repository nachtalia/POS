<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card style="min-width: 360px">
      <q-card-section>
        <div class="text-h6">Add Category</div>
      </q-card-section>
      <q-card-section>
        <q-form @submit.prevent="handleSubmit" id="categoryForm">
          <q-input
            v-model="categoryForm.name"
            label="Name"
            outlined
            dense
            class="q-mb-md"
            :rules="[(val) => !!val || 'Required']"
          />
          <q-input
            v-model="categoryForm.description"
            label="Description"
            type="textarea"
            outlined
            dense
          />
        </q-form>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
        <q-btn flat label="Save" color="primary" type="submit" form="categoryForm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { reactive } from 'vue'

export default {
  name: 'CategoryDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'save', 'cancel'],

  setup(props, { emit }) {
    const categoryForm = reactive({ name: '', description: '' })

    const handleSubmit = () => {
      emit('save', { ...categoryForm })
    }

    const handleCancel = () => {
      emit('cancel')
    }

    return {
      categoryForm,
      handleSubmit,
      handleCancel,
    }
  },
}
</script>
