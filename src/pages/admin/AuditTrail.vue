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
                  behavior="menu"
                >
                  <template v-slot:prepend>
                    <q-icon name="filter_list" />
                  </template>
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
                  behavior="menu"
                >
                  <template v-slot:prepend>
                    <q-icon name="filter_alt" />
                  </template>
                </q-select>
              </div>
              <div class="col-12 col-md-6">
                <q-input
                  v-model="searchQuery"
                  outlined
                  dense
                  placeholder="Search by email, type, or ID..."
                  bg-color="white"
                  clearable
                >
                  <template v-slot:prepend>
                    <q-icon name="search" />
                  </template>
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
              <template v-slot:header="props">
                <q-tr :props="props">
                  <q-th
                    v-for="col in props.cols"
                    :key="col.name"
                    :props="props"
                    class="text-weight-bold text-primary"
                  >
                    {{ col.label }}
                  </q-th>
                </q-tr>
              </template>

              <template v-slot:body-cell-timestamp="props">
                <q-td :props="props">
                  <div class="text-weight-medium">{{ formatDate(props.row.timestamp) }}</div>
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
                    <q-tooltip>View Details</q-tooltip>
                  </q-btn>
                </q-td>
              </template>

              <template v-slot:bottom="scope">
                <div class="row full-width justify-end items-center q-gutter-sm">
                  <span class="text-grey-7 text-caption">Rows per page:</span>
                  <q-select
                    v-model="scope.pagination.rowsPerPage"
                    :options="[5, 10, 20, 50]"
                    borderless
                    dense
                    options-dense
                    behavior="menu"
                    emit-value
                    class="text-grey-8"
                    style="min-width: 50px"
                  />
                  <span class="text-grey-7 text-caption q-ml-md">
                    {{ (scope.pagination.page - 1) * scope.pagination.rowsPerPage + 1 }}-{{
                      Math.min(
                        scope.pagination.page * scope.pagination.rowsPerPage,
                        filteredLogs.length,
                      )
                    }}
                    of {{ filteredLogs.length }}
                  </span>

                  <q-btn
                    icon="chevron_left"
                    color="grey-8"
                    round
                    dense
                    flat
                    :disable="scope.isFirstPage"
                    @click="scope.prevPage"
                  />
                  <q-btn
                    icon="chevron_right"
                    color="grey-8"
                    round
                    dense
                    flat
                    :disable="scope.isLastPage"
                    @click="scope.nextPage"
                  />
                </div>
              </template>

              <template v-slot:no-data>
                <div class="full-width row flex-center q-gutter-sm q-pa-lg text-grey-6">
                  <q-icon size="3em" name="manage_search" />
                  <span class="text-subtitle1">No logs found</span>
                </div>
              </template>
            </q-table>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="viewDialog" transition-show="scale" transition-hide="scale">
      <q-card style="width: 600px; max-width: 90vw" class="rounded-borders">
        <q-toolbar class="bg-primary text-white">
          <q-icon name="analytics" size="sm" />
          <q-toolbar-title class="text-subtitle1 text-weight-bold">
            Activity Details
          </q-toolbar-title>
          <q-btn icon="close" flat round dense v-close-popup />
        </q-toolbar>

        <q-card-section v-if="selectedLog" class="q-pt-md">
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
              <div class="text-subtitle1 text-weight-bold">{{ selectedLog.userEmail }}</div>
              <div class="text-caption text-grey-8 flex items-center">
                <q-icon name="schedule" size="xs" class="q-mr-xs" />
                {{ formatDate(selectedLog.timestamp) }}
              </div>
            </div>
          </div>

          <div class="row q-col-gutter-sm q-mb-lg">
            <div class="col-12 col-sm-4">
              <q-card flat bordered class="bg-grey-1 full-height">
                <q-card-section class="q-pa-sm text-center">
                  <div class="text-caption text-grey-7 text-uppercase q-mb-xs">Module</div>
                  <div class="text-weight-bold text-primary">
                    <q-icon name="widgets" class="q-mr-xs" />
                    {{ selectedLog.module }}
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-sm-4">
              <q-card flat bordered class="bg-grey-1 full-height">
                <q-card-section class="q-pa-sm text-center">
                  <div class="text-caption text-grey-7 text-uppercase q-mb-xs">Entity Type</div>
                  <div class="text-weight-bold text-uppercase">
                    {{ selectedLog.entityType }}
                  </div>
                </q-card-section>
              </q-card>
            </div>

            <div class="col-12 col-sm-4">
              <q-card flat bordered class="bg-grey-1 full-height">
                <q-card-section class="q-pa-sm text-center">
                  <div class="text-caption text-grey-7 text-uppercase q-mb-xs">Action Taken</div>
                  <q-badge :color="getActionColor(selectedLog.action)" class="q-px-sm q-py-xs">
                    {{ selectedLog.action }}
                  </q-badge>
                </q-card-section>
              </q-card>
            </div>
          </div>

          <div v-if="hasDetails(selectedLog)">
            <div class="text-subtitle2 text-grey-9 q-mb-sm flex items-center">
              <q-icon name="history_edu" class="q-mr-sm text-primary" size="sm" />
              Data Changes
            </div>

            <q-card flat bordered>
              <q-list separator v-if="isObject(selectedLog.details)">
                <q-item v-for="(value, key) in selectedLog.details" :key="key" class="q-py-sm">
                  <q-item-section>
                    <q-item-label
                      caption
                      class="text-uppercase text-weight-bold text-grey-6 text-caption"
                    >
                      {{ formatKey(key) }}
                    </q-item-label>
                    <q-item-label
                      class="text-body2 text-grey-9 q-mt-xs"
                      style="word-break: break-word"
                    >
                      {{ formatDetailValue(key, value) }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </q-list>

              <q-card-section v-else class="bg-blue-1 text-blue-10">
                {{ selectedLog.details }}
              </q-card-section>
            </q-card>
          </div>

          <div v-else class="text-center q-pa-md text-grey-6 bg-grey-1 rounded-borders">
            <q-icon name="info" class="q-mr-xs" /> No additional data details recorded.
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="q-pa-md bg-grey-1">
          <q-btn unelevated label="Close" color="negative" v-close-popup class="q-px-md" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import { db } from 'src/services/firebase'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'

const $q = useQuasar()
const loading = ref(false)
const logs = ref([])
const filterModule = ref('All')
const filterAction = ref('All')
const searchQuery = ref('')

const viewDialog = ref(false)
const selectedLog = ref(null)

const moduleOptions = ['All', 'inventory', 'ordering', 'userManagement']
const actionOptions = ['All', 'Add', 'Edit', 'Delete']

const columns = [
  { name: 'timestamp', label: 'Time', field: 'timestamp', align: 'left', sortable: true },
  { name: 'module', label: 'Module', field: 'module', align: 'left', sortable: true },
  { name: 'action', label: 'Action', field: 'action', align: 'left', sortable: true },
  { name: 'userEmail', label: 'User', field: 'userEmail', align: 'left', sortable: true },
  { name: 'actions', label: 'View', field: 'actions', align: 'center', sortable: false },
]

const pagination = ref({ rowsPerPage: 10 })

const fetchLogs = async () => {
  loading.value = true
  try {
    const qRef = query(collection(db, 'audit_trail'), orderBy('timestamp', 'desc'))
    const snap = await getDocs(qRef)
    logs.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (!logs.value.length) {
      $q.notify({ color: 'warning', message: 'No logs available', icon: 'history' })
    }
  } catch (e) {
    console.error(e)
    $q.notify({ color: 'negative', message: 'Error loading audit trail', icon: 'report_problem' })
  } finally {
    loading.value = false
  }
}

const openViewModal = (log) => {
  selectedLog.value = log
  viewDialog.value = true
}

const hasDetails = (log) => {
  return (
    log &&
    log.details &&
    ((typeof log.details === 'object' && Object.keys(log.details).length > 0) ||
      (typeof log.details === 'string' && log.details.length > 0))
  )
}

const isObject = (val) => {
  return val && typeof val === 'object' && !Array.isArray(val)
}

const formatKey = (key) => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())
}

const formatDetailValue = (key, value) => {
  if (value === null || value === undefined) return 'N/A'

  if (key === 'updatedAt' && value && typeof value === 'object' && value.seconds) {
    return formatDate(value)
  }

  if (key === 'productImage' && typeof value === 'string' && value.startsWith('data:image')) {
    return 'Uploaded Image'
  }

  if (Array.isArray(value)) {
    if (key.toLowerCase().includes('addons')) {
      return `${value.length} items`
    }
    return value.join(', ')
  }

  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'object') return JSON.stringify(value)

  return value
}

const getActionColor = (action) => {
  switch ((action || '').toLowerCase()) {
    case 'add':
    case 'create':
    case 'login':
      return 'positive'
    case 'edit':
    case 'update':
      return 'orange'
    case 'delete':
    case 'remove':
    case 'logout':
      return 'negative'
    default:
      return 'blue'
  }
}

const formatDate = (ts) => {
  try {
    if (!ts) return ''
    const d = ts.toDate ? ts.toDate() : new Date(ts.seconds * 1000)
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

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
          .includes(q),
    )
  }
  return list
})

onMounted(fetchLogs)
</script>
