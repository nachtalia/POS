<template>
  <q-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)">
    <q-card style="min-width: 360px">
      <q-card-section>
        <div class="text-h6">Export Inventory</div>
        <div class="text-caption">Choose export format</div>
      </q-card-section>
      <q-card-section>
        <q-option-group v-model="exportFormat" :options="formatOptions" color="primary" inline />
        <q-separator spaced />
        <q-toggle v-model="exportUseTableFilters" label="Use current table filters" />
        <div v-if="!exportUseTableFilters" class="q-mt-md row q-col-gutter-sm">
          <div class="col-12">
            <q-select
              v-model="exportCategory"
              :options="categoryOptions"
              label="Category"
              outlined
              dense
              emit-value
            />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn flat label="Cancel" color="primary" @click="handleCancel" />
        <q-btn flat label="Export" color="primary" @click="handleExport" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { ref } from 'vue'

export default {
  name: 'ExportDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    categoryOptions: {
      type: Array,
      default: () => [],
    },
  },

  emits: ['update:modelValue', 'export', 'cancel'],

  setup(props, { emit }) {
    const exportFormat = ref('csv')
    const exportUseTableFilters = ref(true)
    const exportCategory = ref('All')
    const formatOptions = [
      { label: 'CSV', value: 'csv' },
      { label: 'PDF', value: 'pdf' },
    ]

    const handleExport = () => {
      emit('export', {
        format: exportFormat.value,
        useFilters: exportUseTableFilters.value,
        category: exportCategory.value,
      })
      emit('update:modelValue', false)
    }

    const handleCancel = () => {
      emit('cancel')
    }

    return {
      exportFormat,
      exportUseTableFilters,
      exportCategory,
      formatOptions,
      handleExport,
      handleCancel,
    }
  },
}
</script>
