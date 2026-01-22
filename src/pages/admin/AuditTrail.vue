<template>
  <q-page padding class="bg-app">
    <div class="row q-col-gutter-md">
      <div class="col-12">
        <q-card class="glass-card q-pa-sm" flat bordered>
          <q-card-section class="row items-center q-pb-none">
            <div class="text-h6 text-primary text-weight-bold">
              <q-icon name="history" class="q-mr-sm" />Audit Trail
            </div>
            <q-space />
            <q-btn
              color="primary"
              icon="refresh"
              label="Refresh"
              unelevated
              rounded
              @click="fetchLogs"
              :loading="loading"
            />
          </q-card-section>

          <q-card-section>
            <div class="row q-col-gutter-sm q-mb-md">
              <div class="col-12 col-md-3">
                <q-select
                  v-model="filterModule"
                  :options="moduleOptions"
                  outlined
                  dense
                  options-dense
                  label="Filter Module"
                  emit-value
                  bg-color="white"
                >
                  <template v-slot:prepend><q-icon name="filter_list" /></template>
                </q-select>
              </div>
              <div class="col-12 col-md-3">
                <q-select
                  v-model="filterAction"
                  :options="actionOptions"
                  outlined
                  dense
                  options-dense
                  label="Filter Action"
                  emit-value
                  bg-color="white"
                >
                  <template v-slot:prepend><q-icon name="filter_alt" /></template>
                </q-select>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="searchQuery"
                  outlined
                  dense
                  placeholder="Search by name, email, or type..."
                  bg-color="white"
                  clearable
                >
                  <template v-slot:prepend><q-icon name="search" /></template>
                </q-input>
              </div>
            </div>

            <q-table
              :rows="filteredLogs"
              :columns="columns"
              row-key="id"
              :loading="loading"
              flat
              bordered
              v-model:pagination="pagination"
              binary-state-sort
            >
              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ formatDate(props.row.timestamp) }}</div>
                </q-td>
              </template>

              <template v-slot:body-cell-entityName="props">
                <q-td :props="props">
                  <div
                    v-if="props.row.entityName || props.row.productName"
                    class="text-weight-bold text-grey-9"
                  >
                    {{ props.row.entityName || props.row.productName }}
                  </div>
                  <div v-else class="text-grey-5 text-caption font-mono">
                    {{ props.row.entityId || 'N/A' }}
                  </div>
                </q-td>
              </template>

              <template v-slot:body-cell-action="props">
                <q-td :props="props">
                  <q-chip
                    :color="getActionColor(props.row.action)"
                    text-color="white"
                    size="sm"
                    dense
                    class="text-uppercase text-weight-bold shadow-1"
                  >
                    {{ props.row.action }}
                  </q-chip>
                </q-td>
              </template>

              <template v-slot:body-cell-actions="props">
                <q-td :props="props" align="center">
                  <q-btn
                    round
                    dense
                    flat
                    color="grey-7"
                    icon="visibility"
                    @click="openViewModal(props.row)"
                  >
                    <q-tooltip>View Details & History</q-tooltip>
                  </q-btn>
                </q-td>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog
      v-model="viewDialog"
      full-width
      transition-show="slide-up"
      transition-hide="slide-down"
    >
      <q-card class="bg-grey-1 column" style="max-height: 90vh">
        <q-toolbar class="bg-primary text-white">
          <q-icon name="analytics" size="sm" />
          <q-toolbar-title class="text-subtitle1 text-weight-bold">
            Activity Inspector
          </q-toolbar-title>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-toolbar>

        <q-card-section class="col q-pa-none scroll">
          <div class="row fit">
            <div class="col-12 col-md-8 q-pa-md bg-white border-right">
              <div class="row items-center q-mb-lg no-wrap bg-blue-1 q-pa-md rounded-borders">
                <q-avatar
                  size="48px"
                  font-size="24px"
                  color="white"
                  text-color="primary"
                  icon="person"
                  class="shadow-1"
                />
                <div class="q-ml-md">
                  <div class="text-subtitle1 text-weight-bold">
                    {{ selectedLog?.userEmail || 'System' }}
                  </div>
                  <div class="text-caption text-grey-8 flex items-center">
                    <q-icon name="schedule" size="xs" class="q-mr-xs" />
                    {{ formatDate(selectedLog?.timestamp) }}
                  </div>
                </div>
                <q-space />
                <q-chip
                  :color="getActionColor(selectedLog?.action)"
                  text-color="white"
                  class="text-uppercase"
                >
                  {{ selectedLog?.action }}
                </q-chip>
              </div>

              <div class="row q-col-gutter-sm q-mb-lg">
                <div class="col-12">
                  <div class="text-caption text-grey-6 uppercase">Module</div>
                  <div class="text-body1 text-weight-medium">{{ selectedLog?.module }}</div>
                </div>
              </div>

              <q-separator class="q-my-md" />

              <div class="text-h6 q-mb-md text-primary">
                <q-icon name="compare_arrows" class="q-mr-sm" />
                {{ selectedLog?.action === 'edit' ? 'Data Changes' : 'Data Details' }}
              </div>

              <div v-if="computedChanges.length > 0">
                <q-markup-table flat bordered dense class="bg-grey-1" separator="cell">
                  <thead>
                    <tr>
                      <th class="text-left bg-grey-3">Field</th>
                      <th v-if="hasOldValues" class="text-left bg-red-1 text-red-9">Old Value</th>
                      <th class="text-left bg-green-1 text-green-9">
                        {{ selectedLog?.action === 'delete' ? 'Deleted Value' : 'New Value' }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(change, index) in computedChanges" :key="index">
                      <td class="text-weight-bold text-grey-8">{{ formatKey(change.key) }}</td>

                      <td
                        v-if="hasOldValues"
                        class="text-red-9"
                        style="max-width: 200px; word-wrap: break-word"
                      >
                        {{ formatDetailValue(change.key, change.oldValue, 'old') }}
                      </td>

                      <td class="text-green-9" style="max-width: 200px; word-wrap: break-word">
                        {{ formatDetailValue(change.key, change.newValue, 'new') }}
                      </td>
                    </tr>
                  </tbody>
                </q-markup-table>
              </div>
              <div v-else class="q-pa-lg text-center text-grey-5 border-dashed">
                <q-icon name="fact_check" size="md" />
                <div class="q-mt-sm">No significant data changes detected.</div>
              </div>
            </div>

            <div class="col-12 col-md-4 q-pa-md bg-grey-2 border-left">
              <div class="text-subtitle1 text-weight-bold q-mb-md text-grey-8">
                <q-icon name="history_edu" class="q-mr-xs" /> Entity History
              </div>

              <div v-if="loadingHistory" class="row justify-center q-py-lg">
                <q-spinner-dots color="primary" size="2em" />
              </div>

              <q-timeline color="primary" v-else-if="entityHistory.length">
                <q-timeline-entry
                  v-for="hist in entityHistory"
                  :key="hist.id"
                  :title="hist.action.toUpperCase()"
                  :subtitle="formatDate(hist.timestamp)"
                  :color="getActionColor(hist.action)"
                  :icon="getActionIcon(hist.action)"
                  :class="{ 'opacity-50': hist.id !== selectedLog?.id }"
                >
                  <div class="text-caption text-grey-8">By: {{ hist.userEmail }}</div>
                  <div
                    v-if="hist.id === selectedLog?.id"
                    class="text-caption text-weight-bold text-primary q-mt-xs"
                  >
                    (Currently Viewing)
                  </div>
                </q-timeline-entry>
              </q-timeline>

              <div v-else class="text-center text-grey-6 q-mt-lg">
                No history found for this item.
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, getDocs, query, orderBy, where, limit } from 'firebase/firestore'

const $q = useQuasar()

// --- State ---
const loading = ref(false)
const logs = ref([])
const filterModule = ref('All')
const filterAction = ref('All')
const searchQuery = ref('')

// Modal State
const viewDialog = ref(false)
const selectedLog = ref(null)
const entityHistory = ref([])
const loadingHistory = ref(false)

// --- Options & Config ---
const moduleOptions = ['All', 'inventory', 'products', 'ordering', 'userManagement', 'system']
const actionOptions = ['All', 'Add', 'Edit', 'Delete']

const columns = [
  { name: 'timestamp', label: 'Time', field: 'timestamp', align: 'left', sortable: true },
  { name: 'module', label: 'Module', field: 'module', align: 'left', sortable: true },
  {
    name: 'entityName',
    label: 'Item Name',
    field: (row) => row.entityName || row.productName || 'N/A',
    align: 'left',
    sortable: true,
  },
  { name: 'action', label: 'Action', field: 'action', align: 'left', sortable: true },
  { name: 'userEmail', label: 'User', field: 'userEmail', align: 'left', sortable: true },
  { name: 'actions', label: 'View', field: 'actions', align: 'center', sortable: false },
]

const pagination = ref({ rowsPerPage: 10 })

// --- Main Fetch ---
const fetchLogs = async () => {
  loading.value = true
  try {
    const qRef = query(collection(db, 'audit_logs'), orderBy('timestamp', 'desc'), limit(100))
    const snap = await getDocs(qRef)
    logs.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error(e)
    $q.notify({ color: 'negative', message: 'Error loading audit trail' })
  } finally {
    loading.value = false
  }
}

// --- Fetch Entity History ---
const fetchEntityHistory = async (entityId) => {
  if (!entityId) {
    entityHistory.value = []
    return
  }
  loadingHistory.value = true
  try {
    const qRef = query(
      collection(db, 'audit_logs'),
      where('entityId', '==', entityId),
      orderBy('timestamp', 'desc'),
    )
    const snap = await getDocs(qRef)
    entityHistory.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  } catch (e) {
    console.error('History fetch error:', e)
  } finally {
    loadingHistory.value = false
  }
}

const openViewModal = async (log) => {
  selectedLog.value = log
  viewDialog.value = true
  if (log.entityId) {
    await fetchEntityHistory(log.entityId)
  } else {
    entityHistory.value = []
  }
}

const hasOldValues = computed(() => {
  return computedChanges.value.some((change) => change.oldValue !== '-')
})

const computedChanges = computed(() => {
  if (!selectedLog.value || !selectedLog.value.details) return []

  const d = selectedLog.value.details
  const changes = []
  const action = (selectedLog.value.action || '').toLowerCase()
  const log = selectedLog.value

  // 1. Process standard fields
  Object.keys(d).forEach((key) => {
    // UPDATED: Added 'stock' and 'productStock' to the ignore list below
    if (
      [
        'updatedAt',
        'createdAt',
        'id',
        'uid',
        'entityId',
        'entityName',
        'stock',
        'productStock',
      ].includes(key)
    )
      return

    const val = d[key]

    // Handle Diff Structure { old: ..., new: ... }
    if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
      if (val.old === val.new) return

      const isNewEmpty = val.new === null || val.new === undefined || val.new === ''
      if (action === 'edit' && isNewEmpty) return

      changes.push({ key, oldValue: val.old, newValue: val.new })
    }
    // Handle Simple Structure
    else {
      if (val === null || val === undefined) return
      changes.push({ key, oldValue: '-', newValue: val })
    }
  })

  // 2. Inject Product Name for Context
  const isProductModule =
    log.module === 'products' || log.module === 'inventory' || log.collection === 'products'

  if (isProductModule && changes.length > 0) {
    const nameExists = changes.some(
      (c) => c.key.toLowerCase() === 'name' || c.key.toLowerCase() === 'productname',
    )
    if (!nameExists) {
      const pName = log.entityName || log.productName
      if (pName) {
        changes.unshift({
          key: 'Affected Product',
          oldValue: '-',
          newValue: pName,
        })
      }
    }
  }

  return changes
})

const formatKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}
// --- UPDATED FORMATTER FUNCTION ---
const formatDetailValue = (key, value, context = 'new') => {
  if (value === null || value === undefined) return 'N/A'
  if (value === '-') return '-'

  const lowerKey = key.toLowerCase()
  const strValue = String(value)

  // 1. Handle Image / Photo / Logo fields
  // Detects base64 or long URLs and masks them
  const isImageKey =
    lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('logo')
  const isImageValue = strValue.startsWith('data:image') || strValue.startsWith('http')

  if (isImageKey && isImageValue) {
    return context === 'old' ? 'Old Image' : 'New Image Uploaded'
  }

  // 2. [NEW SNIPPET] Handle Add-ons or Categories specific formatting
  // If it's a list of IDs (strings), show a count instead of raw IDs.
  if ((lowerKey.includes('addon') || lowerKey.includes('category')) && Array.isArray(value)) {
    if (value.length === 0) return 'None'

    // Check if the array contains Objects (readable) or Strings (IDs)
    const firstItem = value[0]

    // If it's a string (ID), just show the count to keep it clean
    if (typeof firstItem === 'string') {
      return `${value.length} Item(s) Selected`
    }
  }

  // 3. Handle Generic Arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return 'None'

    // If it's an array of objects, try to find a readable label
    const isObjectArray = typeof value[0] === 'object' && value[0] !== null
    if (isObjectArray) {
      return value.map((item) => item.name || item.label || JSON.stringify(item)).join(', ')
    }

    // Default: Join simple array
    return value.join(', ')
  }

  // 4. Handle Dates
  if (value && typeof value === 'object' && value.seconds) {
    return formatDate(value)
  }

  // 5. Handle Booleans
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'

  // 6. Handle Objects
  if (typeof value === 'object') return JSON.stringify(value)

  return value
}

// --- UI Styling Helpers ---
const getActionColor = (action) => {
  const act = (action || '').toLowerCase()
  if (act === 'add' || act === 'create') return 'positive'
  if (act === 'edit' || act === 'update') return 'orange'
  if (act === 'delete' || act === 'remove') return 'negative'
  return 'blue'
}

const getActionIcon = (action) => {
  const act = (action || '').toLowerCase()
  if (act === 'add') return 'add_circle'
  if (act === 'edit') return 'edit'
  if (act === 'delete') return 'delete'
  return 'info'
}

const formatDate = (ts) => {
  if (!ts) return ''
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

// --- Filtering Logic ---
const filteredLogs = computed(() => {
  let list = logs.value || []

  if (filterModule.value !== 'All') {
    list = list.filter((l) => l.module === filterModule.value)
  }

  if (filterAction.value !== 'All') {
    const target = filterAction.value.toLowerCase()
    list = list.filter((l) => {
      const act = (l.action || '').toLowerCase()
      if (target === 'add') return act === 'add' || act === 'create'
      if (target === 'edit') return act === 'edit' || act === 'update'
      if (target === 'delete') return act === 'delete' || act === 'remove'
      return act === target
    })
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(
      (l) =>
        (l.userEmail || '').toLowerCase().includes(q) ||
        (l.entityType || '').toLowerCase().includes(q) ||
        String(l.entityId || '')
          .toLowerCase()
          .includes(q) ||
        String(l.entityName || '')
          .toLowerCase()
          .includes(q) ||
        String(l.productName || '')
          .toLowerCase()
          .includes(q),
    )
  }
  return list
})

onMounted(fetchLogs)
</script>

<style scoped>
.glass-card {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
}
.border-right {
  border-right: 1px solid #e0e0e0;
}
.border-left {
  border-left: 1px solid #e0e0e0;
}
.opacity-50 {
  opacity: 0.6;
}
.font-mono {
  font-family: monospace;
}
</style>
