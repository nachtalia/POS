<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="glass-card">
          <q-card-section>
            <div class="text-h6">Inventory Management</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
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
                <q-btn
                  color="primary"
                  icon="category"
                  label="Add Category"
                  class="q-mr-sm"
                  @click="showAddCategoryDialog = true"
                  v-if="canAddCategory"
                />
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Product"
                  @click="showAddProductDialog = true"
                  v-if="canAddProduct"
                />
                <q-btn
                  color="secondary"
                  icon="download"
                  label="Export"
                  class="q-ml-sm"
                  @click="showExportDialog = true"
                />
              </div>
              <div class="col-12" v-if="selectedInventoryTab === 'addons'">
                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Add-on"
                  @click="showAddAddonDialog = true"
                  v-if="canAddAddon"
                />
              </div>
            </div>

            <q-table
              :rows="filteredProducts"
              :columns="columns"
              row-key="id"
              :loading="productStore.loading"
              flat
              bordered
              v-if="selectedInventoryTab === 'products' && selectedProductView === 'table'"
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
                    @click="openEditDialog(props.row)"
                    v-if="canEditProduct"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="confirmDelete(props.row)"
                    v-if="canDeleteProduct"
                  />
                </q-td>
              </template>
              <!-- removed stock cell -->
            </q-table>

            <div v-if="selectedInventoryTab === 'products' && selectedProductView === 'catalog'">
              <div class="row q-col-gutter-md">
                <div
                  v-for="p in filteredProducts"
                  :key="p.id"
                  class="col-6 col-sm-4 col-md-3 col-lg-2"
                >
                  <q-card class="shadow-1 catalog-card">
                    <q-img
                      :src="p.productImage || placeholderImage"
                      class="rounded-borders"
                      style="height: 120px"
                    >
                      <template v-slot:error>
                        <div class="absolute-full flex flex-center bg-grey-3 text-grey">
                          <q-icon name="image_not_supported" />
                        </div>
                      </template>
                    </q-img>
                    <q-card-section>
                      <div class="text-weight-bold text-grey-9">{{ p.productName }}</div>
                      <div class="row items-center justify-between q-mt-xs">
                        <q-chip dense color="grey-3" text-color="grey-8" v-if="p.productCategory">
                          {{ p.productCategory }}
                        </q-chip>
                        <div class="text-weight-bold text-primary">
                          ₱{{ Number(p.productPrice || 0).toFixed(2) }}
                        </div>
                      </div>
                    </q-card-section>
                    <q-card-actions align="right">
                      <q-btn
                        flat
                        round
                        dense
                        icon="edit"
                        color="primary"
                        @click="openEditDialog(p)"
                        v-if="canEditProduct"
                      />
                      <q-btn
                        flat
                        round
                        dense
                        icon="delete"
                        color="negative"
                        @click="confirmDelete(p)"
                        v-if="canDeleteProduct"
                      />
                    </q-card-actions>
                  </q-card>
                </div>
              </div>
            </div>

            <q-table
              :rows="filteredAddons"
              :columns="addonColumns"
              row-key="id"
              :loading="addonStore.loading"
              flat
              bordered
              v-if="selectedInventoryTab === 'addons'"
            >
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
                    @click="openEditAddonDialog(props.row)"
                    v-if="canEditAddon"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    icon="delete"
                    color="negative"
                    @click="confirmDeleteAddon(props.row)"
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
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="showAddProductDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingProduct ? 'Edit Product' : 'Add Product' }}</div>
        </q-card-section>

        <q-card-section>
          <q-form ref="myForm" class="q-gutter-md">
            <q-input
              v-model="productForm.productName"
              label="Product Name"
              outlined
              dense
              :rules="[(val) => !!val || 'Product name is required']"
            />

            <div class="row q-col-gutter-sm">
              <div class="col-6">
                <q-input
                  v-model.number="productForm.productPrice"
                  label="Price"
                  type="number"
                  outlined
                  dense
                  :rules="[
                    (val) => (val !== null && val !== '') || 'Price is required',
                    (val) => val >= 0 || 'Cannot be negative',
                  ]"
                />
              </div>
              <div class="col-6">
                <q-input
                  v-model.number="productForm.productCost"
                  label="Cost"
                  type="number"
                  outlined
                  dense
                  :rules="[
                    (val) => (val !== null && val !== '') || 'Cost is required',
                    (val) => val >= 0 || 'Cannot be negative',
                  ]"
                />
              </div>
            </div>

            <!-- removed stock quantity input -->

            <q-select
              v-model="productForm.productCategory"
              :options="categoriesForForm"
              label="Category"
              outlined
              dense
              :rules="[(val) => !!val || 'Category is required']"
            />
            <div class="row q-col-gutter-sm items-center">
              <div class="col-12">
                <q-file
                  v-model="productImageFile"
                  accept="image/*"
                  outlined
                  dense
                  label="Product Image"
                >
                  <template v-slot:prepend><q-icon name="image" /></template>
                  <template v-slot:append v-if="productImageFile">
                    <q-icon name="close" class="cursor-pointer" @click="clearImage" />
                  </template>
                </q-file>
              </div>
              <div class="col-12" v-if="productImagePreview">
                <q-img :src="productImagePreview" style="height: 140%" class="rounded-borders" />
              </div>
            </div>
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeProductDialog" />
          <q-btn
            flat
            label="Save"
            color="primary"
            @click="submitForm"
            :loading="productStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showAddCategoryDialog" persistent>
      <q-card style="min-width: 360px">
        <q-card-section>
          <div class="text-h6">Add Category</div>
        </q-card-section>
        <q-card-section>
          <q-form @submit.prevent="handleSaveCategory" id="categoryForm">
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
          <q-btn flat label="Cancel" color="primary" @click="closeCategoryDialog" />
          <q-btn flat label="Save" color="primary" type="submit" form="categoryForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showExportDialog">
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
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Export" color="primary" @click="executeExport" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="showAddAddonDialog" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">{{ editingAddon ? 'Edit Add-on' : 'Add Add-on' }}</div>
        </q-card-section>
        <q-card-section>
          <q-form ref="addonFormRef" class="q-gutter-md">
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
            <q-select
              v-model="addonForm.allowedProductIds"
              :options="productOptions"
              label="Allowed Products"
              outlined
              dense
              multiple
              emit-value
              map-options
            />
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeAddonDialog" />
          <q-btn
            flat
            label="Save"
            color="primary"
            @click="submitAddon"
            :loading="addonStore.loading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useProductStore } from '../../stores/productStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useAddonStore } from '../../stores/addonStore'
import { useAuthStore } from 'src/features/index.js'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const addonStore = useAddonStore()
const authStore = useAuthStore()

const searchQuery = ref('')
const selectedCategory = ref('All')
// removed stock filtering
const selectedInventoryTab = ref('products')
const selectedProductView = ref('catalog')
const placeholderImage = 'https://via.placeholder.com/300?text=No+Image'
const showAddProductDialog = ref(false)
const editingProduct = ref(null)
const showAddCategoryDialog = ref(false)
const showAddAddonDialog = ref(false)
const editingAddon = ref(null)

// Reference to the form element
const myForm = ref(null)
const addonFormRef = ref(null)

const has = (perm) =>
  authStore.isSuperAdmin ||
  authStore.permissions.includes('*') ||
  authStore.permissions.includes(perm)
const canAddCategory = computed(
  () => authStore.can('addCategory', 'inventory') || has('inventory:addCategory'),
)
const canAddProduct = computed(
  () => authStore.can('addProduct', 'inventory') || has('inventory:addProduct'),
)
const canEditProduct = computed(
  () => authStore.can('editProduct', 'inventory') || has('inventory:editProduct'),
)
const canDeleteProduct = computed(
  () => authStore.can('deleteProduct', 'inventory') || has('inventory:deleteProduct'),
)
const canAddAddon = computed(() => authStore.can('add', 'addons') || has('addons:add'))
const canEditAddon = computed(() => authStore.can('edit', 'addons') || has('addons:edit'))
const canDeleteAddon = computed(() => authStore.can('delete', 'addons') || has('addons:delete'))
const productForm = reactive({
  productName: '',
  productPrice: 0,
  productCost: 0,
  productCategory: '',
  productImage: '',
})

const categoryForm = reactive({ name: '', description: '' })
const addonForm = reactive({
  name: '',
  category: '',
  price: 0,
  stock: null,
  status: 'Available',
  allowedProductIds: [],
})
const productImageFile = ref(null)
const productImagePreview = ref('')

const clearImage = () => {
  productImageFile.value = null
  productImagePreview.value = ''
}

watch(productImageFile, (file) => {
  const chosen = Array.isArray(file) ? file[0] : file
  if (chosen && chosen instanceof File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      productImagePreview.value = e.target.result
    }
    reader.readAsDataURL(chosen)
  } else {
    productImagePreview.value = ''
  }
})

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
  // removed stock column
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]
const addonColumns = [
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
  { name: 'stock', label: 'Stock', field: 'stock', align: 'center', sortable: true },
  { name: 'status', label: 'Status', field: 'status', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

onMounted(() => {
  productStore.fetchProducts()
  categoryStore.fetchCategories()
  addonStore.fetchAddons()
})

const categoryOptions = computed(() => [
  'All',
  ...(categoryStore.categories || []).map((c) => c.name),
])
const categoriesForForm = computed(() => (categoryStore.categories || []).map((c) => c.name))
// removed stock options
const addonCategoryOptions = ['Toppings', 'Extras']
const statusOptions = ['Available', 'Unavailable']
const productOptions = computed(() =>
  (productStore.products || []).map((p) => ({ label: p.productName, value: p.id })),
)
const selectedAddonAvailability = ref('All')
const selectedAddonCategory = ref('All')
const addonAvailabilityOptions = ['All', 'Available', 'Unavailable']
const addonCategoryFilterOptions = ['All', ...addonCategoryOptions]
const showExportDialog = ref(false)
const exportFormat = ref('csv')
const formatOptions = [
  { label: 'CSV', value: 'csv' },
  { label: 'PDF', value: 'pdf' },
]
const exportUseTableFilters = ref(true)
const exportCategory = ref('All')
// removed export stock filter

const filteredProducts = computed(() => {
  let items = productStore.products || []
  if (selectedCategory.value !== 'All')
    items = items.filter((p) => p.productCategory === selectedCategory.value)
  // removed stock filtering
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(
      (p) =>
        p.productName?.toLowerCase().includes(q) || p.productCategory?.toLowerCase().includes(q),
    )
  }
  return items
})

const filteredAddons = computed(() => {
  let list = addonStore.addons || []
  if (selectedAddonAvailability.value !== 'All') {
    list = list.filter((a) => a.status === selectedAddonAvailability.value)
  }
  if (selectedAddonCategory.value !== 'All') {
    list = list.filter((a) => a.category === selectedAddonCategory.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (a) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.status && a.status.toLowerCase().includes(q)),
    )
  }
  return list
})

const openEditDialog = (product) => {
  editingProduct.value = product
  Object.assign(productForm, {
    productName: product.productName,
    productPrice: product.productPrice,
    productCost: product.productCost,
    productCategory: product.productCategory,
    productImage: product.productImage || '',
  })
  showAddProductDialog.value = true
}

const openEditAddonDialog = (addon) => {
  editingAddon.value = addon
  Object.assign(addonForm, {
    name: addon.name,
    category: addon.category,
    price: addon.price,
    stock: addon.stock,
    status: addon.status,
    allowedProductIds: Array.isArray(addon.allowedProductIds) ? [...addon.allowedProductIds] : [],
  })
  showAddAddonDialog.value = true
}

// 1. New wrapper function to trigger validation manually
const submitForm = async () => {
  // Triggers the :rules on all inputs
  const success = await myForm.value.validate()

  if (success) {
    // If valid, proceed to save
    await handleSaveProduct()
  } else {
    // If invalid, show a toast so the user knows why nothing happened
    $q.notify({
      color: 'negative',
      message: 'Please fill in all required fields.',
      icon: 'warning',
    })
  }
}

const handleSaveProduct = async () => {
  try {
    if (productImagePreview.value) {
      productForm.productImage = productImagePreview.value
    }
    if (editingProduct.value) {
      await productStore.updateProduct(editingProduct.value.id, { ...productForm })
      $q.notify({ color: 'positive', message: 'Product updated successfully', icon: 'check' })
    } else {
      await productStore.addProduct({ ...productForm })
      $q.notify({ color: 'positive', message: 'Product added successfully', icon: 'add' })
    }
    closeProductDialog()
  } catch (error) {
    console.error(error)
    $q.notify({ color: 'negative', message: 'Error saving product', icon: 'report_problem' })
  }
}

const submitAddon = async () => {
  const ok = await addonFormRef.value.validate()
  if (!ok) {
    $q.notify({ color: 'negative', message: 'Please fill all required fields', icon: 'warning' })
    return
  }
  await handleSaveAddon()
}

const handleSaveAddon = async () => {
  try {
    if (editingAddon.value) {
      await addonStore.updateAddon(editingAddon.value.id, { ...addonForm })
      $q.notify({ color: 'positive', message: 'Add-on updated', icon: 'check' })
    } else {
      await addonStore.addAddon({ ...addonForm })
      $q.notify({ color: 'positive', message: 'Add-on added', icon: 'add' })
    }
    closeAddonDialog()
  } catch (e) {
    console.error(e)
    $q.notify({ color: 'negative', message: 'Error saving add-on', icon: 'report_problem' })
  }
}

const confirmDeleteAddon = (addon) => {
  $q.dialog({
    title: 'Delete Add-on',
    message: `Remove ${addon.name}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await addonStore.deleteAddon(addon.id)
      $q.notify({ color: 'positive', message: 'Add-on deleted', icon: 'delete' })
    } catch {
      $q.notify({ color: 'negative', message: 'Error deleting add-on', icon: 'report_problem' })
    }
  })
}

const closeAddonDialog = () => {
  showAddAddonDialog.value = false
  editingAddon.value = null
  Object.assign(addonForm, {
    name: '',
    category: '',
    price: 0,
    stock: null,
    status: 'Available',
    allowedProductIds: [],
  })
}

const confirmDelete = (product) => {
  $q.dialog({
    title: 'Delete Product',
    message: `Are you sure you want to remove ${product.productName}?`,
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await productStore.deleteProduct(product.id)
      $q.notify({ color: 'positive', message: 'Product deleted successfully', icon: 'delete' })
    } catch {
      $q.notify({ color: 'negative', message: 'Error deleting product', icon: 'report_problem' })
    }
  })
}

const closeProductDialog = () => {
  showAddProductDialog.value = false
  editingProduct.value = null
  // Reset form to default values
  Object.assign(productForm, {
    productName: '',
    productPrice: 0,
    productCost: 0,
    productCategory: '',
    productImage: '',
  })
  clearImage()
}

const getRowsForExport = () => {
  if (exportUseTableFilters.value) {
    return filteredProducts.value || []
  }
  let items = productStore.products || []
  if (exportCategory.value !== 'All') {
    items = items.filter((p) => p.productCategory === exportCategory.value)
  }
  // removed export stock filter
  return items
}

const exportInventoryCSV = () => {
  const rows = getRowsForExport()
  if (!rows.length) {
    $q.notify({ color: 'warning', message: 'No products to export', icon: 'warning' })
    return
  }
  const header = ['Product Name', 'Category', 'Price', 'Cost']
  const dataLines = rows.map((p) => [
    p.productName ?? '',
    p.productCategory ?? '',
    Number(p.productPrice ?? 0).toFixed(2),
    Number(p.productCost ?? 0).toFixed(2),
  ])
  const escape = (v) => {
    const s = String(v).replace(/"/g, '""')
    if (/[",\n]/.test(s)) return `"${s}"`
    return s
  }
  const csv = [header, ...dataLines].map((line) => line.map(escape).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `inventory-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  $q.notify({ color: 'positive', message: `Exported ${rows.length} products`, icon: 'download' })
}

const exportInventoryPDF = () => {
  const rows = getRowsForExport()
  if (!rows.length) {
    $q.notify({ color: 'warning', message: 'No products to export', icon: 'warning' })
    return
  }
  const title = `Inventory Report - ${new Date().toLocaleDateString()}`
  const html = `
    <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 16px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ddd; padding: 8px; font-size: 12px; }
          th { background: #f3f4f6; text-align: left; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>Product Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Cost</th>
<<<<<<< HEAD
=======

>>>>>>> 652618933f7dc5e9c1c0875e6e7f01e21d999180
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (p) => `
              <tr>
                <td>${(p.productName ?? '').toString().replace(/</g, '&lt;')}</td>
                <td>${(p.productCategory ?? '').toString().replace(/</g, '&lt;')}</td>
                <td>${Number(p.productPrice ?? 0).toFixed(2)}</td>
                <td>${Number(p.productCost ?? 0).toFixed(2)}</td>
              </tr>`,
              )
              .join('')}
          </tbody>
        </table>
      </body>
    </html>`
  const printWin = window.open('', '_blank')
  if (!printWin) {
    $q.notify({
      color: 'negative',
      message: 'Popup blocked. Allow popups to export PDF.',
      icon: 'report_problem',
    })
    return
  }
  printWin.document.write(html)
  printWin.document.close()
  printWin.focus()
  printWin.print()
  printWin.close()
  $q.notify({
    color: 'positive',
    message: `Prepared PDF for ${rows.length} products`,
    icon: 'download',
  })
}

const executeExport = () => {
  showExportDialog.value = false
  if (exportFormat.value === 'pdf') {
    exportInventoryPDF()
  } else {
    exportInventoryCSV()
  }
}
// Inside InventoryPage.vue <script setup>

const handleSaveCategory = async () => {
  try {
    if (!categoryForm.name) {
      $q.notify({
        color: 'negative',
        message: 'Category name is required',
        icon: 'warning',
      })
      return
    }

    // 1. Attempt to add to Firebase
    await categoryStore.addCategory({ ...categoryForm })

    // 2. Success Feedback
    $q.notify({
      color: 'positive',
      message: 'Category created successfully',
      icon: 'check',
    })

    // 3. Clear and Close
    closeCategoryDialog()

    // 4. (Optional) Refresh list immediately if your store doesn't auto-update
    await categoryStore.fetchCategories()
  } catch (e) {
    console.error(e)
    // 5. SHOW THE ERROR TO THE USER
    $q.notify({
      color: 'negative',
      message: 'Permission denied. Check your console or Firestore Rules.',
      icon: 'report_problem',
    })
  }
}
const closeCategoryDialog = () => {
  showAddCategoryDialog.value = false
  Object.assign(categoryForm, { name: '', description: '' })
}
</script>
<style scoped>
.catalog-card .q-card__section {
  padding: 8px;
}
.catalog-card .q-card__actions {
  padding: 8px;
}
.catalog-card .text-weight-bold {
  font-size: 13px;
}
</style>
