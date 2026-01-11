<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="glass-card">
          <q-card-section>
            <div class="text-h6">Inventory Management</div>
            <div class="text-subtitle2">Manage your products and stock levels</div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <div class="row q-col-gutter-md q-mb-md">
              <div class="col-12 col-md-4">
                <q-input v-model="searchQuery" outlined dense placeholder="Search">
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
                </q-input>
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="selectedCategory"
                  :options="categoryOptions"
                  outlined
                  dense
                  label="Category"
                  emit-value
                />
              </div>
              <div class="col-12 col-md-4">
                <q-select
                  v-model="selectedStock"
                  :options="stockOptions"
                  outlined
                  dense
                  label="Stock"
                  emit-value
                />
              </div>
              <div class="col-12">
                <q-btn color="primary" icon="category" label="Add Category" class="q-mr-sm" @click="showAddCategoryDialog = true" />
                <q-btn color="primary" icon="add" label="Add Product" @click="showAddProductDialog = true" />
                <q-btn color="secondary" icon="download" label="Export" class="q-ml-sm" @click="exportInventory" />
              </div>
            </div>

            <q-table
              :rows="filteredProducts"
              :columns="columns"
              row-key="id"
              :loading="productStore.loading"
              flat
              bordered
            >
              <template v-slot:no-data="{ filter }">
                <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-8">
                  <q-icon size="2em" :name="filter ? 'filter_list_off' : 'inventory_2'" />
                  <span>
                    {{ filter ? 'No matches found for your search' : 'No products found in inventory' }}
                  </span>
                  <q-btn
                    v-if="!filter"
                    flat
                    color="primary"
                    label="Add your first product"
                    @click="showAddProductDialog = true"
                  />
                </div>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props">
                  <q-btn
                    flat round dense
                    icon="edit"
                    color="primary"
                    @click="openEditDialog(props.row)"
                  />
                  <q-btn
                    flat round dense
                    icon="delete"
                    color="negative"
                    @click="confirmDelete(props.row)"
                  />
                </q-td>
              </template>

              <template v-slot:body-cell-stock="props">
                <q-td :props="props">
                  <q-chip
                    :color="props.row.stock < 10 ? 'negative' : props.row.stock < 50 ? 'warning' : 'positive'"
                    text-color="white"
                    dense
                  >
                    {{ props.row.stock }}
                  </q-chip>
                </q-td>
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
          <q-form @submit.prevent="handleSaveProduct" id="productForm">
            <q-input v-model="productForm.name" label="Product Name" outlined dense class="q-mb-md" required />
            <q-input v-model="productForm.sku" label="SKU" outlined dense class="q-mb-md" required />
            <q-input v-model.number="productForm.price" label="Price" type="number" outlined dense class="q-mb-md" required />
            <q-input v-model.number="productForm.stock" label="Stock Quantity" type="number" outlined dense class="q-mb-md" required />
            <q-select v-model="productForm.category" :options="categoriesForForm" label="Category" outlined dense class="q-mb-md" required />
            <q-input v-model="productForm.description" label="Description" type="textarea" outlined dense class="q-mb-md" />
          </q-form>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeProductDialog" />
          <q-btn
            flat
            label="Save"
            color="primary"
            type="submit"
            form="productForm"
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
            <q-input v-model="categoryForm.name" label="Name" outlined dense class="q-mb-md" required />
            <q-input v-model="categoryForm.description" label="Description" type="textarea" outlined dense class="q-mb-md" />
          </q-form>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" @click="closeCategoryDialog" />
          <q-btn flat label="Save" color="primary" type="submit" form="categoryForm" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useProductStore } from '../../stores/productStore'
import { useCategoryStore } from '../../stores/categoryStore'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const productStore = useProductStore()
const categoryStore = useCategoryStore()

const searchQuery = ref('')
const selectedCategory = ref('All')
const selectedStock = ref('All')
const showAddProductDialog = ref(false)
const editingProduct = ref(null)
const showAddCategoryDialog = ref(false)

const productForm = reactive({
  name: '',
  sku: '',
  price: 0,
  stock: 0,
  category: '',
  description: '',
})

const categoryForm = reactive({ name: '', description: '' })

const columns = [
  { name: 'name', label: 'Product Name', field: 'name', align: 'left', sortable: true },
  { name: 'sku', label: 'SKU', field: 'sku', align: 'left', sortable: true },
  { name: 'category', label: 'Category', field: 'category', align: 'left', sortable: true },
  {
    name: 'price',
    label: 'Price',
    field: 'price',
    align: 'right',
    sortable: true,
    format: (val) => `$${Number(val).toFixed(2)}`,
  },
  { name: 'stock', label: 'Stock', field: 'stock', align: 'center', sortable: true },
  { name: 'actions', label: 'Actions', field: 'actions', align: 'center' },
]

onMounted(() => {
  productStore.fetchProducts()
  categoryStore.fetchCategories()
})

const categoryOptions = computed(() => ['All', ...((categoryStore.categories || []).map(c => c.name))])
const categoriesForForm = computed(() => (categoryStore.categories || []).map(c => c.name))

const stockOptions = ['All', 'Out of Stock', 'Low', 'Medium', 'High']

const filteredProducts = computed(() => {
  let items = productStore.products || []
  if (selectedCategory.value !== 'All') {
    items = items.filter(p => p.category === selectedCategory.value)
  }
  if (selectedStock.value !== 'All') {
    items = items.filter(p => {
      const s = Number(p.stock) || 0
      if (selectedStock.value === 'Out of Stock') return s === 0
      if (selectedStock.value === 'Low') return s > 0 && s < 10
      if (selectedStock.value === 'Medium') return s >= 10 && s < 50
      if (selectedStock.value === 'High') return s >= 50
      return true
    })
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    items = items.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    )
  }
  return items
})

const openEditDialog = (product) => {
  editingProduct.value = product
  Object.assign(productForm, product)
  showAddProductDialog.value = true
}

const handleSaveProduct = async () => {
  try {
    if (editingProduct.value) {
      await productStore.updateProduct(editingProduct.value.id, { ...productForm })
      $q.notify({ color: 'positive', message: 'Product updated successfully', icon: 'check' })
    } else {
      await productStore.addProduct({ ...productForm })
      $q.notify({ color: 'positive', message: 'Product added successfully', icon: 'add' })
    }
    closeProductDialog()
  } catch {
    $q.notify({ color: 'negative', message: 'Error saving product', icon: 'report_problem' })
  }
}

const confirmDelete = (product) => {
  $q.dialog({
    title: 'Delete Product',
    message: `Are you sure you want to remove ${product.name}?`,
    cancel: true,
    persistent: true
  }).onOk(async () => {
    try {
      await productStore.deleteProduct(product.id)
      $q.notify({ color: 'positive', message: 'Product deleted', icon: 'delete' })
    } catch {
      $q.notify({ color: 'negative', message: 'Error deleting product' })
    }
  })
}

const closeProductDialog = () => {
  showAddProductDialog.value = false
  editingProduct.value = null
  Object.assign(productForm, {
    name: '',
    sku: '',
    price: 0,
    stock: 0,
    category: '',
    description: '',
  })
}

const exportInventory = () => {
  console.log('Exporting data:', productStore.products)
}

const handleSaveCategory = async () => {
  if (!categoryForm.name) return
  await categoryStore.addCategory({ ...categoryForm })
  $q.notify({ color: 'positive', message: 'Category created', icon: 'check' })
  closeCategoryDialog()
}
const closeCategoryDialog = () => {
  showAddCategoryDialog.value = false
  Object.assign(categoryForm, { name: '', description: '' })
}
</script>
