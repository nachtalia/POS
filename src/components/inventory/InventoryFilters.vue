<template>
  <div class="row q-col-gutter-md q-mb-md">
    <div class="col-12">
      <div class="bg-white rounded-borders shadow-1 q-pa-xs">
        <q-tabs
          v-model="selectedInventoryTab"
          active-color="primary"
          indicator-color="primary"
          align="left"
          dense
          class="text-grey-7"
        >
          <q-tab name="products" label="Products" icon="inventory_2" />
          <q-tab name="addons" label="Add-ons" icon="extension" />
        </q-tabs>
      </div>
    </div>
    <div class="col-12 col-md-4">
      <q-input v-model="searchQuery" outlined dense placeholder="Search">
        <template v-slot:prepend><q-icon name="search" /></template>
      </q-input>
    </div>
    <div class="col-12 col-md-4" v-if="selectedInventoryTab === 'products'">
      <q-select
        v-model="selectedCategory"
        :options="categoryOptions"
        outlined
        dense
        label="Category"
        emit-value
      />
    </div>
    <div class="col-12 col-md-4" v-if="selectedInventoryTab === 'products'">
      <q-btn-toggle
        v-model="selectedProductView"
        spread
        toggle-color="primary"
        unelevated
        :options="[
          { label: 'Catalog', value: 'catalog', icon: 'grid_on' },
          { label: 'Table', value: 'table', icon: 'table_rows' },
        ]"
      />
    </div>
    <div class="col-12 col-md-4" v-if="selectedInventoryTab === 'addons'">
      <q-select
        v-model="selectedAddonAvailability"
        :options="addonAvailabilityOptions"
        outlined
        dense
        label="Availability"
        emit-value
      />
    </div>
    <div class="col-12 col-md-4" v-if="selectedInventoryTab === 'addons'">
      <q-select
        v-model="selectedAddonCategory"
        :options="addonCategoryFilterOptions"
        outlined
        dense
        label="Add-on Category"
        emit-value
      />
    </div>
    <div class="col-12" v-if="selectedInventoryTab === 'products'">
      <!-- Mobile Dropdown -->
      <div v-if="$q.screen.xs">
        <q-btn-dropdown
          color="primary"
          label="Manage Products"
          class="full-width"
          icon="settings"
          no-caps
        >
          <q-list>
            <q-item clickable v-close-popup @click="$emit('add-category')" v-if="canAddCategory">
              <q-item-section avatar>
                <q-icon name="category" color="primary" />
              </q-item-section>
              <q-item-section>Add Category</q-item-section>
            </q-item>

            <q-item clickable v-close-popup @click="$emit('add-product')" v-if="canAddProduct">
              <q-item-section avatar>
                <q-icon name="add" color="primary" />
              </q-item-section>
              <q-item-section>Add Product</q-item-section>
            </q-item>

            <q-separator />

            <q-item clickable v-close-popup @click="$emit('export')">
              <q-item-section avatar>
                <q-icon name="download" color="secondary" />
              </q-item-section>
              <q-item-section>Export Data</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <!-- Desktop Buttons -->
      <div v-else class="row q-gutter-sm">
        <q-btn
          color="primary"
          icon="category"
          label="Add Category"
          @click="$emit('add-category')"
          v-if="canAddCategory"
        />
        <q-btn
          color="primary"
          icon="add"
          label="Add Product"
          @click="$emit('add-product')"
          v-if="canAddProduct"
        />
        <q-btn
          color="secondary"
          icon="download"
          label="Export"
          @click="$emit('export')"
        />
      </div>
    </div>

    <div class="col-12" v-if="selectedInventoryTab === 'addons'">
      <!-- Mobile Dropdown -->
      <div v-if="$q.screen.xs">
        <q-btn-dropdown
          color="primary"
          label="Manage Add-ons"
          class="full-width"
          icon="settings"
          no-caps
        >
          <q-list>
            <q-item clickable v-close-popup @click="$emit('add-addon')" v-if="canAddAddon">
              <q-item-section avatar>
                <q-icon name="add" color="primary" />
              </q-item-section>
              <q-item-section>Add Add-on</q-item-section>
            </q-item>

            <q-item
              clickable
              v-close-popup
              @click="$emit('add-addon-category')"
              v-if="canAddAddon"
            >
              <q-item-section avatar>
                <q-icon name="category" color="primary" />
              </q-item-section>
              <q-item-section>Add Category</q-item-section>
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </div>

      <!-- Desktop Buttons -->
      <div v-else class="row q-gutter-sm">
        <q-btn
          color="primary"
          icon="add"
          label="Add Add-on"
          @click="$emit('add-addon')"
          v-if="canAddAddon"
        />
        <q-btn
          color="primary"
          icon="category"
          label="Add Add-on Category"
          @click="$emit('add-addon-category')"
          v-if="canAddAddon"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  categoryOptions: {
    type: Array,
    default: () => [],
  },
  addonAvailabilityOptions: {
    type: Array,
    default: () => [],
  },
  addonCategoryFilterOptions: {
    type: Array,
    default: () => [],
  },
  canAddCategory: {
    type: Boolean,
    default: false,
  },
  canAddProduct: {
    type: Boolean,
    default: false,
  },
  canAddAddon: {
    type: Boolean,
    default: false,
  },
})

defineEmits([
  'update:selectedInventoryTab',
  'update:searchQuery',
  'update:selectedCategory',
  'update:selectedProductView',
  'update:selectedAddonAvailability',
  'update:selectedAddonCategory',
  'add-category',
  'add-product',
  'export',
  'add-addon',
  'add-addon-category',
])

const selectedInventoryTab = defineModel('selectedInventoryTab', {
  type: String,
  default: 'products',
})
const searchQuery = defineModel('searchQuery', { type: String, default: '' })
const selectedCategory = defineModel('selectedCategory', { type: String, default: 'All' })
const selectedProductView = defineModel('selectedProductView', { type: String, default: 'catalog' })
const selectedAddonAvailability = defineModel('selectedAddonAvailability', {
  type: String,
  default: 'All',
})
const selectedAddonCategory = defineModel('selectedAddonCategory', { type: String, default: 'All' })
</script>
