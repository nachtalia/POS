<template>
  <q-table :rows="addons" :columns="columns" row-key="id" :loading="loading" flat bordered>
    <template v-slot:body-cell-status="props">
      <q-td :props="props">
        <q-badge :color="props.row.status === 'Available' ? 'positive' : 'grey-7'">
          {{ props.row.status }}
        </q-badge>
      </q-td>
    </template>
    <template v-slot:body-cell-actions="props">
      <q-td :props="props">
        <q-btn
          flat
          round
          dense
          icon="edit"
          color="primary"
          @click="$emit('edit', props.row)"
          v-if="canEditAddon"
        />
        <q-btn
          flat
          round
          dense
          icon="delete"
          color="negative"
          @click="$emit('delete', props.row)"
          v-if="canDeleteAddon"
        />
      </q-td>
    </template>
    <template v-slot:no-data>
      <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-8">
        <q-icon size="2em" name="extension" />
        <span>No add-ons</span>
      </div>
    </template>
  </q-table>
</template>

<script setup>
defineProps({
  addons: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  canEditAddon: {
    type: Boolean,
    default: false,
  },
  canDeleteAddon: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['edit', 'delete'])

const columns = [
  { name: 'name', label: 'Add-On Name', field: 'name', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true },
  {
    name: 'price',
    label: 'Price',
    field: 'price',
    align: 'right',
    sortable: true,
    format: (v) => `₱${Number(v || 0).toFixed(2)}`,
  },

  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
</script>
<style scoped>
/* Sticky Actions Column */
:deep(.q-table th:last-child),
:deep(.q-table td:last-child) {
  position: sticky;
  right: 0;
  z-index: 1;
  background-color: #fff; /* Match your table background */
  box-shadow: -1px 0 2px rgba(0, 0, 0, 0.1); /* subtle shadow separator */
}
</style>
