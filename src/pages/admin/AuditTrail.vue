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
              :rows-per-page-options="[5, 10, 20, 50, 0]"
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
                  <div v-else class="text-grey-4">-</div>
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

    <q-dialog v-model="viewDialog" transition-show="scale" transition-hide="scale">
      <q-card style="width: 700px; max-width: 95vw">
        <q-toolbar class="bg-primary text-white">
          <q-icon name="analytics" size="sm" />
          <q-toolbar-title class="text-subtitle1 text-weight-bold">
            Activity Inspector
          </q-toolbar-title>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-toolbar>

        <q-card-section class="bg-grey-1 q-pb-none">
          <div class="row items-center no-wrap">
            <q-avatar
              size="48px"
              font-size="24px"
              color="white"
              text-color="primary"
              icon="person"
              class="shadow-1 q-mr-md"
            />
            <div class="col overflow-hidden">
              <div class="text-subtitle1 text-weight-bold ellipsis">
                {{ selectedLog?.userEmail || 'System' }}
              </div>
              <div class="text-caption text-grey-8 flex items-center">
                <q-icon name="schedule" size="xs" class="q-mr-xs" />
                {{ formatDate(selectedLog?.timestamp) }}
                <span class="q-mx-sm">|</span>
                <span class="text-uppercase">{{ selectedLog?.module }}</span>
              </div>
            </div>
            <div>
              <q-chip
                :color="getActionColor(selectedLog?.action)"
                text-color="white"
                class="text-uppercase text-weight-bold q-ma-none"
              >
                {{ selectedLog?.action }}
              </q-chip>
            </div>
          </div>

          <div class="q-mt-md" v-if="isProductLog">
            <div class="text-caption text-grey-6">Affected Item:</div>
            <div class="text-body2 text-weight-medium text-primary">
              <span v-if="fetchingName"><q-spinner size="1em" /> Loading...</span>
              <span v-else>{{
                selectedLog?.entityName || selectedLog?.productName || 'Unnamed Item'
              }}</span>
            </div>
          </div>
        </q-card-section>

        <q-tabs
          v-model="activeTab"
          dense
          class="text-grey"
          active-color="primary"
          indicator-color="primary"
          align="justify"
          narrow-indicator
        >
          <q-tab name="details" label="Data Details" icon="compare_arrows" />
          <q-tab name="history" label="History Timeline" icon="history_edu" />
        </q-tabs>

        <q-separator />

        <q-tab-panels v-model="activeTab" animated>
          <q-tab-panel name="details" class="q-pa-md">
            <div v-if="resolvingNames" class="text-center text-caption text-grey-6 q-mb-sm">
              <q-spinner-dots color="primary" /> Resolving ID names...
            </div>

            <div v-if="computedChanges.length > 0">
              <q-markup-table flat bordered dense separator="cell" class="bg-white">
                <thead>
                  <tr>
                    <th class="text-left bg-grey-2">Field</th>
                    <th
                      v-if="hasOldValues"
                      class="text-left bg-red-1 text-red-9"
                      style="width: 35%"
                    >
                      Old Value
                    </th>
                    <th class="text-left bg-green-1 text-green-9" style="width: 35%">
                      {{ isDeleteAction ? 'Deleted Value' : 'New Value' }}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(change, index) in computedChanges" :key="index">
                    <td
                      class="text-weight-bold text-grey-8"
                      style="vertical-align: top; white-space: normal"
                    >
                      {{ formatKey(change.key) }}
                    </td>

                    <td
                      v-if="hasOldValues"
                      class="text-red-9"
                      style="vertical-align: top; white-space: normal; word-break: break-all"
                    >
                      <div v-if="isList(change.oldValue)">
                        <q-badge
                          v-for="(item, i) in getPreviewItems(change.oldValue)"
                          :key="i"
                          color="red-1"
                          text-color="red-9"
                          :label="resolveName(item)"
                          class="q-mr-xs q-mb-xs"
                        />
                        <div
                          v-if="getListLength(change.oldValue) > 2"
                          class="cursor-pointer text-underline text-xs"
                          @click="openDetailsList(change.key, change.oldValue, 'Old')"
                        >
                          + {{ getListLength(change.oldValue) - 2 }} more
                        </div>
                      </div>
                      <div v-else>{{ formatDetailValue(change.key, change.oldValue, 'old') }}</div>
                    </td>

                    <td
                      class="text-green-9"
                      style="vertical-align: top; white-space: normal; word-break: break-all"
                    >
                      <div v-if="isList(change.newValue)">
                        <q-badge
                          v-for="(item, i) in getPreviewItems(change.newValue)"
                          :key="i"
                          color="green-1"
                          text-color="green-9"
                          :label="resolveName(item)"
                          class="q-mr-xs q-mb-xs"
                        />
                        <div
                          v-if="getListLength(change.newValue) > 2"
                          class="cursor-pointer text-underline text-xs"
                          @click="openDetailsList(change.key, change.newValue, 'New')"
                        >
                          + {{ getListLength(change.newValue) - 2 }} more
                        </div>
                      </div>
                      <div v-else>{{ formatDetailValue(change.key, change.newValue, 'new') }}</div>
                    </td>
                  </tr>
                </tbody>
              </q-markup-table>
            </div>

            <div
              v-else
              class="column items-center justify-center q-py-xl text-grey-5 border-dashed rounded-borders"
            >
              <q-icon name="fact_check" size="md" class="q-mb-sm" />
              <div>No specific field changes recorded.</div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="history" class="q-pa-md">
            <div v-if="loadingHistory" class="row justify-center q-py-lg">
              <q-spinner-dots color="primary" size="2em" />
            </div>

            <q-timeline color="primary" v-else-if="entityHistory.length" class="q-pl-sm">
              <q-timeline-entry
                v-for="hist in entityHistory"
                :key="hist.id"
                :title="hist.action.toUpperCase()"
                :subtitle="formatDate(hist.timestamp)"
                :color="getActionColor(hist.action)"
                :icon="getActionIcon(hist.action)"
              >
                <div class="text-caption text-grey-8">
                  By: {{ hist.userEmail }}
                  <span
                    v-if="hist.id === selectedLog?.id"
                    class="text-weight-bold text-primary q-ml-xs"
                    >(Current)</span
                  >
                </div>
              </q-timeline-entry>
            </q-timeline>

            <div v-else class="text-center text-grey-6 q-mt-lg">
              No history found for this item.
            </div>
          </q-tab-panel>
        </q-tab-panels>
      </q-card>
    </q-dialog>

    <q-dialog v-model="detailsListDialog">
      <q-card style="min-width: 300px; max-width: 400px">
        <q-toolbar class="bg-primary text-white">
          <q-toolbar-title class="text-subtitle1">{{ detailsListTitle }}</q-toolbar-title>
          <q-btn flat round dense icon="close" v-close-popup />
        </q-toolbar>
        <q-card-section class="scroll" style="max-height: 50vh">
          <q-list separator dense>
            <q-item v-for="(item, idx) in detailsListItems" :key="idx" class="q-py-sm">
              <q-item-section
                ><q-item-label>{{ resolveName(item) }}</q-item-label></q-item-section
              >
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, getDocs, getDoc, doc, query, orderBy, where, limit } from 'firebase/firestore'

const $q = useQuasar()

// --- State ---
const loading = ref(false)
const logs = ref([])
const filterModule = ref('All')
const filterAction = ref('All')
const searchQuery = ref('')

// Modal State
const viewDialog = ref(false)
const activeTab = ref('details') // Controls the tab view
const selectedLog = ref(null)
const entityHistory = ref([])
const loadingHistory = ref(false)
const fetchingName = ref(false)

const resolvingNames = ref(false)
const resolvedNameMap = ref({})

const detailsListDialog = ref(false)
const detailsListTitle = ref('')
const detailsListItems = ref([])

const moduleOptions = ['All', 'inventory', 'products', 'ordering', 'userManagement', 'system']
const actionOptions = ['All', 'Add', 'Edit', 'Delete']

const columns = [
  { name: 'timestamp', label: 'Time', field: 'timestamp', align: 'left', sortable: true },
  { name: 'module', label: 'Module', field: 'module', align: 'left', sortable: true },
  {
    name: 'entityName',
    field: (row) => row.entityName || row.productName || 'N/A',
    align: 'left',
    sortable: true,
  },
  { name: 'action', label: 'Action', field: 'action', align: 'left', sortable: true },
  { name: 'userEmail', label: 'User', field: 'userEmail', align: 'left', sortable: true },
  { name: 'actions', label: 'View', field: 'actions', align: 'center', sortable: false },
]

const pagination = ref({
  sortBy: 'timestamp',
  descending: true,
  page: 1,
  rowsPerPage: 10,
})

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
    console.error(e)
  } finally {
    loadingHistory.value = false
  }
}

// --- HELPER: Fetch Names for Addon IDs ---
const fetchResolvedNames = async (ids) => {
  if (!ids || ids.length === 0) return

  const unknownIds = ids.filter((id) => !resolvedNameMap.value[id])
  if (unknownIds.length === 0) return

  resolvingNames.value = true
  try {
    const promises = unknownIds.map(async (id) => {
      try {
        const d = await getDoc(doc(db, 'addons', id))
        if (d.exists()) {
          return { id, name: d.data().name }
        }
      } catch {
        // ignore
      }
      return { id, name: null }
    })

    const results = await Promise.all(promises)

    results.forEach((res) => {
      if (res.name) {
        resolvedNameMap.value[res.id] = res.name
      }
    })
  } catch (e) {
    console.error(e)
  } finally {
    resolvingNames.value = false
  }
}

// --- OPEN MODAL LOGIC ---
const openViewModal = async (log) => {
  selectedLog.value = { ...log }
  activeTab.value = 'details' // Reset tab to details
  viewDialog.value = true
  fetchingName.value = false
  entityHistory.value = []

  resolvedNameMap.value = {}

  const targetId = log.entityId || log.details?.entityId || log.details?.id

  if (targetId) fetchEntityHistory(targetId)

  const isProductModule = ['products', 'inventory'].includes(log.module)
  if (isProductModule && (!log.entityName || log.entityName === 'N/A') && targetId) {
    fetchingName.value = true
    try {
      const docSnap = await getDoc(doc(db, 'products', targetId))
      if (docSnap.exists()) {
        const prodData = docSnap.data()
        selectedLog.value.entityName = prodData.name || prodData.productName || 'Name Found'
      }
    } catch (e) {
      console.error(e)
    } finally {
      fetchingName.value = false
    }
  }

  if (log.details) {
    let idsToResolve = []
    const d = log.details

    Object.keys(d).forEach((key) => {
      const val = d[key]

      if (val && typeof val === 'object' && 'new' in val) {
        if (Array.isArray(val.old)) idsToResolve.push(...val.old)
        if (Array.isArray(val.new)) idsToResolve.push(...val.new)
      } else if (Array.isArray(val)) {
        idsToResolve.push(...val)
      }
    })

    idsToResolve = [...new Set(idsToResolve)].filter((i) => typeof i === 'string' && i.length > 5)

    if (idsToResolve.length > 0) {
      await fetchResolvedNames(idsToResolve)
    }
  }
}

// --- COMPUTED HELPERS ---

const isProductLog = computed(() => {
  const mod = (selectedLog.value?.module || '').toLowerCase()
  return ['products', 'inventory'].includes(mod)
})

const isDeleteAction = computed(() => {
  const act = (selectedLog.value?.action || '').toLowerCase()
  return act === 'delete' || act === 'remove'
})

const hasOldValues = computed(() => {
  if (isDeleteAction.value) return false // Hide old column for delete actions
  return computedChanges.value.some((change) => change.oldValue !== '-')
})

const computedChanges = computed(() => {
  if (!selectedLog.value || !selectedLog.value.details) return []

  const d = selectedLog.value.details
  const changes = []
  const action = (selectedLog.value.action || '').toLowerCase()
  const isDelete = action === 'delete' || action === 'remove'

  const baseIgnored = ['updatedAt', 'createdAt', 'id', 'uid', 'entityId']
  const ignoredKeys = isDelete
    ? baseIgnored
    : [...baseIgnored, 'entityName', 'stock', 'productStock']

  Object.keys(d).forEach((key) => {
    if (ignoredKeys.includes(key)) return

    const val = d[key]

    if (val && typeof val === 'object' && 'old' in val && 'new' in val) {
      if (JSON.stringify(val.old) === JSON.stringify(val.new)) return
      const isNewEmpty = val.new === null || val.new === undefined || val.new === ''
      if (action === 'edit' && isNewEmpty) return
      changes.push({ key, oldValue: val.old, newValue: val.new })
    } else {
      if (val === null || val === undefined) return
      changes.push({ key, oldValue: '-', newValue: val })
    }
  })

  return changes
})

// --- FORMATTING HELPERS ---

const formatKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}

const isList = (val) => {
  return Array.isArray(val) && val.length > 0
}

const getListLength = (val) => {
  return Array.isArray(val) ? val.length : 0
}

const getPreviewItems = (val) => {
  if (!Array.isArray(val)) return []
  return val.length >= 2 ? val.slice(0, 2) : val
}

const resolveName = (item) => {
  if (!item) return ''
  if (typeof item === 'string' && resolvedNameMap.value[item]) return resolvedNameMap.value[item]
  if (typeof item === 'string') return item
  return (
    item.name ||
    item.label ||
    item.title ||
    item.role ||
    item.productName ||
    item.email ||
    JSON.stringify(item)
  )
}

const openDetailsList = (key, items, type) => {
  detailsListTitle.value = `${type} Value: ${formatKey(key)}`
  detailsListItems.value = items
  detailsListDialog.value = true
}

const formatDetailValue = (key, value, context = 'new') => {
  if (value === null || value === undefined) return 'N/A'
  if (value === '-') return '-'
  if (Array.isArray(value)) return ''

  const strValue = String(value)
  const lowerKey = key.toLowerCase()

  const isImageKey =
    lowerKey.includes('image') || lowerKey.includes('photo') || lowerKey.includes('logo')
  const isImageValue = strValue.startsWith('data:image') || strValue.startsWith('http')

  if (isImageKey && isImageValue) {
    if (context === 'old') return 'Old Image'
    if (isDeleteAction.value) return 'Deleted Image'
    return 'New Image Uploaded'
  }

  if (value && typeof value === 'object' && value.seconds) return formatDate(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
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
    const targetModule = filterModule.value.toLowerCase()
    list = list.filter((l) => (l.module || '').toLowerCase() === targetModule)
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
.border-dashed {
  border: 1px dashed #bdbdbd;
}
.q-table td {
  white-space: normal !important;
}
.text-xs {
  font-size: 0.75rem;
}
</style>
