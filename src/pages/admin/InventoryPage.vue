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
            <inventory-filters
              v-model:selectedInventoryTab="selectedInventoryTab"
              v-model:searchQuery="searchQuery"
              v-model:selectedCategory="selectedCategory"
              v-model:selectedProductView="selectedProductView"
              v-model:selectedAddonAvailability="selectedAddonAvailability"
              v-model:selectedAddonCategory="selectedAddonCategory"
              :category-options="categoryOptions"
              :addon-availability-options="addonAvailabilityOptions"
              :addon-category-filter-options="addonCategoryFilterOptions"
              :can-add-category="canAddCategory"
              :can-add-product="canAddProduct"
              :can-add-addon="canAddAddon"
              :can-view-addons="canViewAddons"
              @add-category="showAddCategoryDialog = true"
              @add-product="showAddProductDialog = true"
              @export="showExportDialog = true"
              @add-addon="showAddAddonDialog = true"
              @add-addon-category="showAddAddonCategoryDialog = true"
            />

            <products-table
              v-if="selectedInventoryTab === 'products' && selectedProductView === 'table'"
              :products="filteredProducts"
              :loading="productStore.loading"
              :can-edit-product="canEditProduct"
              :can-delete-product="canDeleteProduct"
              @edit="openEditDialog"
              @delete="confirmDelete"
            />

            <products-catalog
              v-if="selectedInventoryTab === 'products' && selectedProductView === 'catalog'"
              :products="filteredProducts"
              :placeholder-image="placeholderImage"
              :can-edit-product="canEditProduct"
              :can-delete-product="canDeleteProduct"
              @edit="openEditDialog"
              @delete="confirmDelete"
            />

            <addons-table
              v-if="selectedInventoryTab === 'addons' && canViewAddons"
              :addons="filteredAddons"
              :loading="addonStore.loading"
              :can-edit-addon="canEditAddon"
              :can-delete-addon="canDeleteAddon"
              @edit="openEditAddonDialog"
              @delete="confirmDeleteAddon"
            />
          </q-card-section>
        </q-card>
      </div>
    </div>

    <product-dialog
      v-model="showAddProductDialog"
      :editing-product="editingProduct"
      :categories="categoriesForForm"
      :addon-category-options="addonCategoryOptions"
      :addon-options="addonOptions"
      :specific-addons-hint="specificAddonsHint"
      :loading="productStore.loading"
      @save="handleSaveProduct"
      @cancel="closeProductDialog"
      @clear-image="clearImage"
    />

    <addon-category-dialog
      v-model="showAddAddonCategoryDialog"
      @save="handleSaveAddonCategory"
      @cancel="closeAddonCategoryDialog"
    />

    <category-dialog
      v-model="showAddCategoryDialog"
      @save="handleSaveCategory"
      @cancel="closeCategoryDialog"
    />

    <export-dialog
      v-model="showExportDialog"
      :category-options="categoryOptions"
      @export="executeExport"
    />

    <addon-dialog
      v-model="showAddAddonDialog"
      :editing-addon="editingAddon"
      :addon-category-options="addonCategoryOptions"
      :status-options="statusOptions"
      :loading="addonStore.loading"
      @save="handleSaveAddon"
      @cancel="closeAddonDialog"
    />
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { useProductStore } from '../../stores/productStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useAddonStore } from '../../stores/addonStore'
import { useAuthStore } from 'src/features/index.js'
import { useQuasar } from 'quasar'
import InventoryFilters from 'src/components/inventory/InventoryFilters.vue'
import ProductsTable from 'src/components/inventory/ProductsTable.vue'
import ProductsCatalog from 'src/components/inventory/ProductsCatalog.vue'
import AddonsTable from 'src/components/inventory/AddonsTable.vue'
import ProductDialog from 'src/components/inventory/dialog/ProductDialog.vue'
import CategoryDialog from 'src/components/inventory/dialog/CategoryDialog.vue'
import AddonDialog from 'src/components/inventory/dialog/AddonDialog.vue'
import AddonCategoryDialog from 'src/components/inventory/dialog/AddonCategoryDialog.vue'
import ExportDialog from 'src/components/inventory/dialog/ExportDialog.vue'

const $q = useQuasar()
const productStore = useProductStore()
const categoryStore = useCategoryStore()
const addonStore = useAddonStore()
const authStore = useAuthStore()

// State
const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedInventoryTab = ref('products')
const selectedProductView = ref('catalog')
const placeholderImage = 'https://via.placeholder.com/300?text=No+Image'
const showAddProductDialog = ref(false)
const editingProduct = ref(null)
const showAddCategoryDialog = ref(false)
const showAddAddonDialog = ref(false)
const editingAddon = ref(null)
const showAddAddonCategoryDialog = ref(false)
const showExportDialog = ref(false)
const exportFormat = ref('csv')
const exportUseTableFilters = ref(true)
const exportCategory = ref('All')

// Forms
const productForm = reactive({
  productName: '',
  productPrice: 0,
  productCost: 0,
  productCategory: '',
  productImage: '',
  allowedAddons: [],
  allowedAddonCategories: [],
})

const productImageFile = ref(null)
const productImagePreview = ref('')

// Computed Permissions
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

// --- ADDONS PERMISSIONS ---
// Added the view permission check
const canViewAddons = computed(() => authStore.can('view', 'addons') || has('addons:view'))
const canAddAddon = computed(() => authStore.can('add', 'addons') || has('addons:create'))
const canEditAddon = computed(() => authStore.can('edit', 'addons') || has('addons:edit'))
const canDeleteAddon = computed(() => authStore.can('delete', 'addons') || has('addons:delete'))

const categoryOptions = computed(() => [
  'All',
  ...(categoryStore.categories || []).map((c) => c.name),
])

const categoriesForForm = computed(() => (categoryStore.categories || []).map((c) => c.name))

const addonCategoryOptions = computed(() => (addonStore.addonCategories || []).map((c) => c.name))

const statusOptions = ['Available', 'Unavailable']

const addonOptions = computed(() => {
  const cats = productForm.allowedAddonCategories || []
  const list = (addonStore.addons || []).filter(
    (a) => cats.length === 0 || cats.includes(a.category),
  )
  return list.map((a) => ({ label: a.name, value: a.id, category: a.category }))
})

const selectedAddonAvailability = ref('All')
const selectedAddonCategory = ref('All')
const addonAvailabilityOptions = ['All', 'Available', 'Unavailable']
const addonCategoryFilterOptions = computed(() => ['All', ...addonCategoryOptions.value])

const specificAddonsHint = computed(() => {
  const cats = productForm.allowedAddonCategories || []
  const count = addonOptions.value.length
  return cats.length
    ? `Choose add-ons to include (${count} available)`
    : 'Choose add-ons to include for this product'
})

const filteredProducts = computed(() => {
  let items = productStore.products || []
  if (selectedCategory.value !== 'All')
    items = items.filter((p) => p.productCategory === selectedCategory.value)
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

// Lifecycle
onMounted(() => {
  productStore.fetchProducts()
  categoryStore.fetchCategories()
  // Only fetch addons if user has permission (optimization)
  if (canViewAddons.value) {
    addonStore.fetchAddons()
    addonStore.fetchAddonCategories()
  }
})

// Watchers
watch(
  () => productForm.allowedAddonCategories,
  (cats) => {
    const idsAllowedByCats = (addonStore.addons || [])
      .filter((a) => (cats || []).includes(a.category))
      .map((a) => a.id)
    if ((cats || []).length > 0) {
      productForm.allowedAddons = (productForm.allowedAddons || []).filter((id) =>
        idsAllowedByCats.includes(id),
      )
    }
  },
  { deep: true },
)

// Security Watcher: Redirect if user is on addons tab but permission is revoked
watch(
  [selectedInventoryTab, canViewAddons],
  ([tab, hasPerm]) => {
    if (tab === 'addons' && !hasPerm) {
      selectedInventoryTab.value = 'products'
    }
  },
  { immediate: true },
)

// Methods
const openEditDialog = (product) => {
  editingProduct.value = product
  Object.assign(productForm, {
    productName: product.productName,
    productPrice: product.productPrice,
    productCost: product.productCost,
    productCategory: product.productCategory,
    productImage: product.productImage || '',
    allowedAddons: Array.isArray(product.allowedAddons) ? [...product.allowedAddons] : [],
    allowedAddonCategories: Array.isArray(product.allowedAddonCategories)
      ? [...product.allowedAddonCategories]
      : [],
  })

  productImageFile.value = null
  productImagePreview.value = ''

  showAddProductDialog.value = true
}

const openEditAddonDialog = (addon) => {
  editingAddon.value = addon
  showAddAddonDialog.value = true
}

const handleSaveProduct = async (formData) => {
  try {
    if (editingProduct.value) {
      await productStore.updateProduct(editingProduct.value.id, formData)
      $q.notify({ color: 'positive', message: 'Product updated successfully', icon: 'check' })
    } else {
      await productStore.addProduct(formData)
      $q.notify({ color: 'positive', message: 'Product added successfully', icon: 'add' })
    }
    closeProductDialog()
  } catch (error) {
    console.error(error)
    $q.notify({ color: 'negative', message: 'Error saving product', icon: 'report_problem' })
  }
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

const clearImage = () => {
  productImageFile.value = null
  productImagePreview.value = ''
  productForm.productImage = ''
}

const closeProductDialog = () => {
  showAddProductDialog.value = false
  editingProduct.value = null
  Object.assign(productForm, {
    productName: '',
    productPrice: 0,
    productCost: 0,
    productCategory: '',
    productImage: '',
    allowedAddons: [],
    allowedAddonCategories: [],
  })
  clearImage()
}

const handleSaveAddon = async (formData) => {
  try {
    if (editingAddon.value) {
      await addonStore.updateAddon(editingAddon.value.id, formData)
      $q.notify({ color: 'positive', message: 'Add-on updated', icon: 'check' })
    } else {
      await addonStore.addAddon(formData)
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
}

const getRowsForExport = () => {
  if (exportUseTableFilters.value) {
    return filteredProducts.value || []
  }
  let items = productStore.products || []
  if (exportCategory.value !== 'All') {
    items = items.filter((p) => p.productCategory === exportCategory.value)
  }
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

const executeExport = (params) => {
  exportFormat.value = params.format
  exportUseTableFilters.value = params.useFilters
  exportCategory.value = params.category
  showExportDialog.value = false

  if (params.format === 'pdf') {
    exportInventoryPDF()
  } else {
    exportInventoryCSV()
  }
}

const handleSaveCategory = async (formData) => {
  try {
    if (!formData.name) {
      $q.notify({
        color: 'negative',
        message: 'Category name is required',
        icon: 'warning',
      })
      return
    }

    await categoryStore.addCategory(formData)

    $q.notify({
      color: 'positive',
      message: 'Category created successfully',
      icon: 'check',
    })

    closeCategoryDialog()
    await categoryStore.fetchCategories()
  } catch (e) {
    console.error(e)
    $q.notify({
      color: 'negative',
      message: 'Permission denied. Check your console or Firestore Rules.',
      icon: 'report_problem',
    })
  }
}

const closeCategoryDialog = () => {
  showAddCategoryDialog.value = false
}

const handleSaveAddonCategory = async (formData) => {
  try {
    if (!formData.name) {
      $q.notify({ color: 'negative', message: 'Name is required', icon: 'warning' })
      return
    }
    await addonStore.addAddonCategory(formData)
    $q.notify({ color: 'positive', message: 'Add-on category added', icon: 'category' })
    closeAddonCategoryDialog()
    await addonStore.fetchAddonCategories()
  } catch (e) {
    console.error(e)
    $q.notify({
      color: 'negative',
      message: 'Error adding add-on category',
      icon: 'report_problem',
    })
  }
}

const closeAddonCategoryDialog = () => {
  showAddAddonCategoryDialog.value = false
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
