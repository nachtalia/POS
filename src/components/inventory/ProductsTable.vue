<template>
  <q-table
    :rows="products"
    :columns="columns"
    row-key="id"
    :loading="loading"
    flat
    bordered
    :grid="$q.screen.xs"
  >
    <template v-slot:no-data="{ filter }">
      <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-8">
        <q-icon size="2em" :name="filter ? 'filter_list_off' : 'inventory_2'" />
        <span>{{ filter ? 'No matches found' : 'No products found' }}</span>
      </div>
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
          v-if="canEditProduct"
        />
        <q-btn
          flat
          round
          dense
          icon="delete"
          color="negative"
          @click="$emit('delete', props.row)"
          v-if="canDeleteProduct"
        />
      </q-td>
    </template>
  </q-table>
</template>

<script setup>
defineProps({
  products: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
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

const columns = [
  { name: 'name', label: 'Product Name', field: 'productName', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'productCategory', align: 'left', sortable: true },
  {
    name: 'price',
    label: 'Price',
    field: 'productPrice',
    align: 'right',
    sortable: true,
    format: (val) => `₱${Number(val).toFixed(2)}`,
  },
  {
    name: 'cost',
    label: 'Cost',
    field: 'productCost',
    align: 'right',
    sortable: true,
    format: (val) => `₱${Number(val).toFixed(2)}`,
  },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
</script>
