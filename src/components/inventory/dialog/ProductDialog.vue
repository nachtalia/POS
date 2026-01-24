<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    persistent
  >
    <q-card :style="$q.screen.lt.sm ? 'width: 100vw; margin: 1px; padding: 17px;' : 'min-width: 400px'">
      <q-card-section class="row items-center justify-between" :class="$q.screen.lt.sm ? 'q-pa-sm' : ''">
        <div class="text-h6">{{ editingProduct ? 'Edit Product' : 'Add Product' }}</div>
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section :class="$q.screen.lt.sm ? 'q-pa-sm' : ''">
        <q-form ref="myForm" :class="$q.screen.lt.sm ? 'q-gutter-sm' : 'q-gutter-md'" @submit.prevent="$emit('save', productForm)">
          <!-- Mobile-only Image Upload Section -->
          <div v-if="$q.screen.lt.md" class="column items-center q-mb-md">
            <div
              class="relative-position cursor-pointer shadow-1"
              style="
                width: 150px;
                height: 150px;
                border-radius: 12px;
                overflow: hidden;
                border: 2px dashed #ccc;
              "
              @click="$refs.mobileFilePicker.pickFiles()"
            >
              <q-img
                v-if="productImagePreview || productForm.productImage"
                :src="productImagePreview || productForm.productImage"
                style="width: 100%; height: 100%"
                fit="cover"
              />
              <div v-else class="absolute-full flex flex-center column bg-grey-2 text-grey-7">
                <q-icon name="add_a_photo" size="40px" />
                <div class="text-caption q-mt-sm">Add Photo</div>
              </div>
              
              <!-- Hidden File Input for Mobile -->
              <q-file
                ref="mobileFilePicker"
                v-model="productImageFile"
                accept="image/*"
                class="hidden"
                @update:model-value="handleImageSelect"
              />
            </div>
            
            <q-btn
              v-if="productImagePreview || productForm.productImage"
              flat
              dense
              color="negative"
              icon="delete"
              label="Remove Image"
              size="sm"
              class="q-mt-sm"
              @click.stop="clearImage"
            />
          </div>

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

          <q-select
            v-model="productForm.productCategory"
            :options="categories"
            label="Category"
            outlined
            dense
            :rules="[(val) => !!val || 'Category is required']"
          />

          <div class="row q-col-gutter-sm items-center" v-if="!$q.screen.lt.md">
            <div class="col-12">
              <q-file
                v-model="productImageFile"
                accept="image/*"
                outlined
                dense
                label="Product Image"
                @update:model-value="handleImageSelect"
                clearable
              >
                <template v-slot:prepend><q-icon name="image" /></template>
              </q-file>
            </div>

            <div class="col-12" v-if="productImagePreview || productForm.productImage">
              <div class="text-caption text-grey-7 q-mb-xs">Image Preview:</div>
              <div
                class="flex flex-center q-pa-sm"
                style="border: 1px solid #e0e0e0; border-radius: 8px; background: #f5f5f5"
              >
                <q-img
                  :src="productImagePreview || productForm.productImage"
                  style="max-height: 200px; max-width: 100%; object-fit: contain"
                  class="rounded-borders"
                  spinner-color="primary"
                >
                  <template v-slot:error>
                    <div class="absolute-full flex flex-center bg-grey-3 text-grey">
                      <q-icon name="image_not_supported" size="xl" />
                    </div>
                  </template>
                </q-img>
              </div>
              <div class="text-center q-mt-xs">
                <q-btn
                  flat
                  dense
                  color="negative"
                  icon="delete"
                  label="Remove Image"
                  size="sm"
                  @click="clearImage"
                />
              </div>
            </div>
          </div>

          <div class="row q-col-gutter-sm">
            <div class="col-12">
              <div class="text-subtitle2 q-mb-sm text-grey-8">Add-ons</div>

              <q-select
                v-model="productForm.allowedAddonCategories"
                :options="addonCategoryOptions"
                label="Filter by Add-on Categories"
                outlined
                dense
                multiple
                use-chips
                stack-label
                hint="Filters add-on options by selected categories"
                class="q-mb-md"
                @update:model-value="triggerAddonFilter"
              />

              <div
                v-if="(productForm.allowedAddonCategories || []).length > 0"
                class="text-caption text-grey-7 q-mb-xs"
              >
                Showing add-ons from: {{ productForm.allowedAddonCategories.join(', ') }}
              </div>

              <q-select
                v-model="productForm.allowedAddons"
                :options="filteredAddonOptions"
                label="Select Add-ons"
                outlined
                dense
                multiple
                use-chips
                stack-label
                option-value="value"
                option-label="label"
                emit-value
                map-options
                use-input
                @filter="filterAddons"
                :hint="specificAddonsHint"
              >
                <template v-slot:no-option>
                  <q-item>
                    <q-item-section class="text-grey"> No results found </q-item-section>
                  </q-item>
                </template>
                <template v-slot:option="scope">
                  <q-item v-bind="scope.itemProps">
                    <q-item-section>
                      <q-item-label>{{ scope.opt.label }}</q-item-label>
                      <q-item-label caption>{{ scope.opt.category }}</q-item-label>
                    </q-item-section>
                  </q-item>
                </template>
              </q-select>
            </div>
          </div>
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
import { useFormatters } from 'src/composables/useFormatters'

export default {
  name: 'ProductDialog',

  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
    editingProduct: {
      type: Object,
      default: null,
    },
    categories: {
      type: Array,
      default: () => [],
    },
    addonCategoryOptions: {
      type: Array,
      default: () => [],
    },
    addonOptions: {
      type: Array,
      default: () => [],
    },
    specificAddonsHint: {
      type: String,
      default: '',
    },
    loading: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['update:modelValue', 'save', 'cancel', 'clear-image'],

  setup(props, { emit }) {
    const $q = useQuasar()
    const { formatCurrency } = useFormatters()
    const myForm = ref(null)
    const productImageFile = ref(null)
    const productImagePreview = ref('')

    // Create a ref for the filtered options
    const filteredAddonOptions = ref([])

    const productForm = reactive({
      productName: '',
      productPrice: 0,
      productCost: 0,
      productCategory: '',
      productImage: '',
      allowedAddons: [],
      allowedAddonCategories: [],
    })

    // Initialize filtered options
    watch(
      () => props.addonOptions,
      (newVal) => {
        filteredAddonOptions.value = newVal
      },
      { immediate: true },
    )

    // Watch for editingProduct changes
    watch(
      () => props.editingProduct,
      (product) => {
        if (product) {
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
        } else {
          // Reset form
          Object.assign(productForm, {
            productName: '',
            productPrice: 0,
            productCost: 0,
            productCategory: '',
            productImage: '',
            allowedAddons: [],
            allowedAddonCategories: [],
          })
        }
        productImageFile.value = null
        productImagePreview.value = ''

        // Reset the addon options list when opening dialog
        filteredAddonOptions.value = props.addonOptions
      },
      { immediate: true },
    )

    // Helper to refresh the list if categories change while the dropdown is closed
    const triggerAddonFilter = () => {
      // We essentially run a filter with an empty string to re-evaluate the category filter
      filterAddons('', (fn) => fn())
    }

    const filterAddons = (val, update) => {
      update(() => {
        // Step 1: Filter by Category (if any categories are selected)
        let available = props.addonOptions

        const selectedCats = productForm.allowedAddonCategories || []
        if (selectedCats.length > 0) {
          available = available.filter((opt) => selectedCats.includes(opt.category))
        }

        // Step 2: Filter by Search Text (Name)
        if (val === '') {
          filteredAddonOptions.value = available
        } else {
          const needle = val.toLowerCase()
          filteredAddonOptions.value = available.filter(
            (v) => v.label.toLowerCase().indexOf(needle) > -1,
          )
        }
      })
    }

    const handleImageSelect = (file) => {
      if (!file) {
        productImagePreview.value = ''
        return
      }

      if (!file.type.startsWith('image/')) {
        $q.notify({
          color: 'negative',
          message: 'Please select an image file',
          icon: 'warning',
        })
        productImageFile.value = null
        productImagePreview.value = ''
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        $q.notify({
          color: 'negative',
          message: 'Image size should be less than 5MB',
          icon: 'warning',
        })
        productImageFile.value = null
        productImagePreview.value = ''
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        productImagePreview.value = e.target.result
        productForm.productImage = e.target.result
      }
      reader.onerror = () => {
        $q.notify({
          color: 'negative',
          message: 'Error reading image file',
          icon: 'error',
        })
        productImageFile.value = null
        productImagePreview.value = ''
      }
      reader.readAsDataURL(file)
    }

    const clearImage = () => {
      productImageFile.value = null
      productImagePreview.value = ''
      productForm.productImage = ''
      emit('clear-image')
    }

    const handleSave = async () => {
      const success = await myForm.value.validate()
      if (success) {
        emit('save', { ...productForm })
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
      myForm,
      productImageFile,
      productImagePreview,
      productForm,
      filteredAddonOptions, // Return this ref
      filterAddons, // Return this function
      triggerAddonFilter, // Return this function
      handleImageSelect,
      clearImage,
      handleSave,
      handleCancel,
      formatCurrency,
    }
  },
}
</script>
