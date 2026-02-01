<template>
  <q-page padding class="bg-grey-1">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="my-card-shadow no-border-radius">
          <q-card-section class="bg-white q-pb-none">
            <div class="row items-center justify-between q-mb-md">
              <div class="row items-center q-gutter-x-sm">
                <q-icon name="table_restaurant" size="2em" color="primary" />
                <div class="text-h5 text-weight-bold text-grey-9">Table Management</div>
              </div>

              <div class="q-gutter-sm">
                <q-btn
                  flat
                  round
                  dense
                  icon="refresh"
                  color="grey-7"
                  @click="forceReload"
                  :loading="isLoading"
                >
                  <q-tooltip>Refresh Data</q-tooltip>
                </q-btn>

                <q-btn
                  color="primary"
                  icon="add"
                  label="Add Table"
                  @click="openAddDialog"
                  :disable="isLoading"
                />
              </div>
            </div>

            <q-separator class="q-mb-md" />

            <q-input
              v-model="searchQuery"
              outlined
              dense
              placeholder="Search tables..."
              class="q-mb-md"
              bg-color="white"
            >
              <template v-slot:prepend><q-icon name="search" class="text-grey-5" /></template>
            </q-input>
          </q-card-section>

          <q-card-section class="bg-grey-1 q-pa-md">
            <div v-if="isLoading" class="row justify-center q-pa-lg">
              <q-spinner-dots size="2em" color="primary" />
              <div class="q-ml-sm text-grey">Verifying Access...</div>
            </div>

            <div v-else-if="filteredTables.length === 0" class="text-center text-grey-6 q-pa-xl">
              <q-icon name="no_meals" size="4em" />
              <div class="q-mt-sm">No tables found.</div>
            </div>

            <div v-else class="row q-col-gutter-md">
              <div
                v-for="table in filteredTables"
                :key="table.id"
                class="col-12 col-sm-6 col-md-4 col-lg-3"
              >
                <q-card class="table-card column">
                  <q-card-section class="q-pb-xs">
                    <div class="row justify-between items-start">
                      <div class="text-h6 text-weight-bold">{{ table.name }}</div>
                      <q-btn
                        flat
                        round
                        dense
                        icon="qr_code"
                        color="dark"
                        @click="showQrCode(table)"
                      />
                    </div>

                    <div class="text-grey-7 q-mb-sm row items-center">
                      <q-icon name="group" class="q-mr-xs" />
                      Capacity: {{ table.capacity || 'Not Set' }}
                    </div>
                  </q-card-section>

                  <q-separator />

                  <q-card-section class="col q-pa-none">
                    <div class="q-pa-sm text-caption text-weight-medium text-grey-8 bg-grey-2">
                      Inclusions ({{ table.products ? table.products.length : 0 }})
                    </div>

                    <q-scroll-area style="height: 150px" class="bg-white">
                      <q-list separator dense v-if="table.products && table.products.length > 0">
                        <q-item v-for="(prod, i) in table.products" :key="i">
                          <q-item-section avatar>
                            <q-avatar rounded size="32px" color="grey-3" text-color="grey-8">
                              <img
                                v-if="prod.productImage"
                                :src="prod.productImage"
                                style="object-fit: cover"
                              />
                              <q-icon v-else name="restaurant_menu" size="20px" />
                            </q-avatar>
                          </q-item-section>

                          <q-item-section>
                            <q-item-label class="text-body2">{{ prod.name }}</q-item-label>
                          </q-item-section>

                          <q-item-section side>
                            <div class="text-weight-bold text-primary">₱{{ prod.price }}</div>
                          </q-item-section>
                        </q-item>
                      </q-list>

                      <div
                        v-else
                        class="row full-height items-center justify-center text-grey-5 q-pa-md"
                      >
                        <q-icon name="do_not_disturb_alt" class="q-mr-xs" /> No products linked
                      </div>
                    </q-scroll-area>
                  </q-card-section>

                  <q-separator />

                  <q-card-actions align="right" class="bg-white">
                    <q-btn
                      flat
                      round
                      dense
                      icon="edit"
                      color="primary"
                      @click="openEditDialog(table)"
                    />
                    <q-btn
                      flat
                      round
                      dense
                      icon="delete"
                      color="negative"
                      @click="confirmDelete(table)"
                    />
                  </q-card-actions>
                </q-card>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="showDialog" position="right" full-height maximized>
      <q-card style="width: 450px; max-width: 100vw" class="column">
        <q-card-section class="row items-center bg-grey-2">
          <div class="text-h6">{{ isEditing ? 'Edit Table' : 'New Table' }}</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-separator />
        <q-card-section class="col scroll q-pt-md">
          <q-form ref="formRef" @submit="saveTable" class="q-gutter-md">
            <q-input
              v-model="form.name"
              label="Table Name (e.g. Table 1)"
              outlined
              dense
              :rules="[(val) => !!val || 'Required']"
            />

            <q-input
              v-model.number="form.capacity"
              label="Capacity"
              type="number"
              outlined
              dense
              :rules="[(val) => val > 0 || 'Must be > 0']"
            />

            <q-separator class="q-my-md" />
            <div class="text-subtitle2 text-grey-8">Table Inclusions</div>

            <div
              v-if="tableStore.availableProducts.length === 0"
              class="text-caption text-negative border-dashed q-pa-sm text-center"
            >
              <q-icon name="warning" /> No products available.
            </div>

            <q-select
              v-else
              v-model="selectedProducts"
              :options="menuOptions"
              label="Select Menu Items"
              outlined
              dense
              multiple
              use-chips
              stack-label
              map-options
              option-label="productName"
            >
              <template v-slot:option="{ itemProps, opt, selected, toggleOption }">
                <q-item v-bind="itemProps">
                  <q-item-section side
                    ><q-checkbox :model-value="selected" @update:model-value="toggleOption(opt)"
                  /></q-item-section>
                  <q-item-section avatar v-if="opt.productImage"
                    ><q-img
                      :src="opt.productImage"
                      style="width: 30px; height: 30px; object-fit: cover"
                  /></q-item-section>
                  <q-item-section>
                    <q-item-label>{{ opt.productName }}</q-item-label>
                    <q-item-label caption>₱{{ opt.productPrice }}</q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>

            <q-list
              bordered
              separator
              v-if="selectedProducts.length > 0"
              class="rounded-borders q-mt-sm"
            >
              <q-item v-for="(prod, index) in selectedProducts" :key="index" dense>
                <q-item-section>{{ prod.productName || prod.name }}</q-item-section>
                <q-item-section side>₱{{ prod.productPrice || prod.price }}</q-item-section>
                <q-item-section side
                  ><q-btn flat round dense icon="close" size="sm" @click="removeProduct(index)"
                /></q-item-section>
              </q-item>
            </q-list>
          </q-form>
        </q-card-section>
        <q-separator />
        <q-card-actions align="right" class="bg-grey-1 q-pa-md">
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn :label="isEditing ? 'Update' : 'Create'" color="primary" @click="saveTable" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="qrDialog">
      <q-card style="width: 300px" class="text-center q-pb-md">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">Table QR</div>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section>
          <div class="text-h5 text-weight-bold q-mb-md text-primary">{{ activeQrTable?.name }}</div>
          <img
            :src="`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${activeQrTable?.name}`"
            style="width: 200px"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { useTableStore } from 'src/stores/tableStore'
import { auth, db } from 'src/services/firebase'
import { doc, getDoc } from 'firebase/firestore'

const $q = useQuasar()
const tableStore = useTableStore()

const isLoading = ref(true)
const currentTargetId = ref(null)
const debugInfo = ref(null)

const searchQuery = ref('')
const showDialog = ref(false)
const isEditing = ref(false)
const formRef = ref(null)
const qrDialog = ref(false)
const activeQrTable = ref(null)
const selectedProducts = ref([])

const form = reactive({
  id: null,
  name: '',
  capacity: null,
  products: [],
})

const resolveUserIdentity = async () => {
  isLoading.value = true
  try {
    const currentUser = auth.currentUser
    if (!currentUser) {
      isLoading.value = false
      return
    }

    const uid = currentUser.uid
    const userDocRef = doc(db, 'user', uid)
    const userSnap = await getDoc(userDocRef)

    let finalId = uid
    let isSuperAdmin = false

    if (userSnap.exists()) {
      const data = userSnap.data()
      const role = (data.role || '').toLowerCase()
      if (role === 'superadmin') {
        isSuperAdmin = true
      }

      if (data.branchId) finalId = data.branchId
      else if (data.orgOwnerUid) finalId = data.orgOwnerUid
    }

    currentTargetId.value = finalId
    debugInfo.value = {
      authUid: uid,
      role: userSnap.exists() ? userSnap.data().role : 'No Doc',
      isSuperAdmin: isSuperAdmin,
    }

    await tableStore.initData(finalId, isSuperAdmin)
  } catch (error) {
    console.error('Error loading user:', error)
    $q.notify({ type: 'negative', message: 'Failed to verify user permissions.' })
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  setTimeout(() => {
    resolveUserIdentity()
  }, 500)
})

const forceReload = () => {
  resolveUserIdentity()
}

const filteredTables = computed(() => {
  return tableStore.tables.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

const menuOptions = computed(() => {
  return tableStore.availableProducts.map((product) => ({
    ...product,
    label: product.productName,
  }))
})

const openAddDialog = () => {
  isEditing.value = false
  selectedProducts.value = []

  Object.assign(form, {
    id: null,
    name: '',
    capacity: null,
    products: [],
  })

  showDialog.value = true
}

const openEditDialog = (table) => {
  isEditing.value = true
  selectedProducts.value = table.products ? [...table.products] : []

  Object.assign(form, {
    id: table.id,
    name: table.name,
    capacity: table.capacity,
    products: table.products || [],
  })

  showDialog.value = true
}

const removeProduct = (index) => {
  selectedProducts.value.splice(index, 1)
}

const showQrCode = (table) => {
  activeQrTable.value = table
  qrDialog.value = true
}

const saveTable = async () => {
  const valid = await formRef.value.validate()
  if (!valid) return

  const mappedProducts = selectedProducts.value.map((p) => ({
    productId: p.id || null,
    name: p.productName || p.name || 'Unnamed Item',
    price: Number(p.productPrice || p.price || 0),
    sku: p.sku || '',
    productImage: p.productImage || null,
  }))

  form.products = mappedProducts

  try {
    if (isEditing.value) {
      const { id, ...updates } = form
      await tableStore.updateTable(id, updates)
      $q.notify({ type: 'positive', message: 'Table Updated' })
    } else {
      await tableStore.addTable({ ...form })
      $q.notify({ type: 'positive', message: 'Table Created' })
    }
    showDialog.value = false
  } catch (err) {
    console.error(err)
    $q.notify({ type: 'negative', message: 'Error: ' + err.message })
  }
}

const confirmDelete = (table) => {
  $q.dialog({
    title: 'Delete',
    message: `Delete ${table.name}?`,
    cancel: true,
  }).onOk(async () => {
    await tableStore.deleteTable(table.id)
    $q.notify({ type: 'positive', message: 'Deleted' })
  })
}
</script>

<style scoped>
.my-card-shadow {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}
.table-card {
  height: 100%;
  transition: transform 0.2s;
}
.table-card:hover {
  transform: translateY(-2px);
}
.border-dashed {
  border: 1px dashed #ccc;
  border-radius: 4px;
}
</style>
