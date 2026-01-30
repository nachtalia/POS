import { defineStore } from 'pinia'
import { db, auth } from 'src/services/firebase'
import {
  collection,
  doc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
  getDocs,
} from 'firebase/firestore'
import { Notify } from 'quasar'
import { logAudit } from 'src/services/auditService'
import { useAuthStore } from 'src/features/index'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    history: [],
    loading: false,
    unsubscribe: null,
  }),

  getters: {
    todaysSales: (state) => {
      const today = new Date().toDateString()
      return state.orders
        .filter((o) => {
          const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt)
          return d.toDateString() === today && o.status !== 'Cancelled'
        })
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0)
    },
  },

  actions: {
    async fetchOrders() {
      if (this.unsubscribe) return

      this.loading = true
      const authStore = useAuthStore()
      const branchId = authStore.branchId

      let q
      if (authStore.isMainAdmin) {
        this.orders = []
        this.loading = false
        return
      } else if (branchId) {
        q = query(collection(db, 'orders'), where('branchId', '==', branchId))
      } else {
        this.orders = []
        this.loading = false
        return
      }

      const toMillis = (val) => {
        if (!val) return 0
        if (typeof val?.toDate === 'function') return val.toDate().getTime()
        if (typeof val === 'number') return val
        const d = new Date(val)
        return Number.isNaN(d.getTime()) ? 0 : d.getTime()
      }

      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          list.sort(
            (a, b) =>
              toMillis(b.createdAt ?? b.createdAtMs ?? b.date) -
              toMillis(a.createdAt ?? a.createdAtMs ?? a.date),
          )
          this.orders = list
          this.loading = false
        },
        (error) => {
          console.error('Error fetching orders:', error)
          this.loading = false
        },
      )
    },

    async fetchHistory(entityId) {
      this.loading = true
      this.history = []
      try {
        const authStore = useAuthStore()
        const branchId = authStore.branchId
        const logsRef = collection(db, 'audit_logs')
        try {
          const qRef = query(
            logsRef,
            where('branchId', '==', branchId),
            where('entityId', '==', entityId),
            orderBy('timestamp', 'desc'),
          )
          const snapshot = await getDocs(qRef)
          this.history = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        } catch (inner) {
          const message = String(inner?.message || '')
          const isIndexError = /requires an index/i.test(message)
          if (!isIndexError) throw inner
          const fallbackRef = query(
            logsRef,
            where('branchId', '==', branchId),
            where('entityId', '==', entityId),
          )
          const snapshot = await getDocs(fallbackRef)
          const list = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
          const toMillis = (ts) =>
            ts?.toDate
              ? ts.toDate().getTime()
              : typeof ts?.seconds === 'number'
                ? ts.seconds * 1000
                : 0
          list.sort((a, b) => toMillis(b.timestamp) - toMillis(a.timestamp))
          this.history = list
        }
      } catch (e) {
        console.error('Error fetching order history:', e)
      } finally {
        this.loading = false
      }
    },

    clearOrders() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
      this.orders = []
    },
    async fetchOrdersForDashboard(branchIds) {
      const authStore = useAuthStore()
      if (!authStore.isMainAdmin) return

      const ids = Array.from(new Set((branchIds || []).filter(Boolean)))
      this.loading = true
      try {
        if (ids.length === 0) {
          this.orders = []
          return
        }

        const snapshots = await Promise.all(
          ids.map((id) =>
            (async () => {
              try {
                return await getDocs(
                  query(
                    collection(db, 'orders'),
                    where('branchId', '==', id),
                    orderBy('createdAt', 'desc'),
                  ),
                )
              } catch (e) {
                const message = String(e?.message || '')
                const isIndexError = /requires an index/i.test(message)
                if (!isIndexError) throw e
                return await getDocs(query(collection(db, 'orders'), where('branchId', '==', id)))
              }
            })(),
          ),
        )

        const list = []
        snapshots.forEach((snap) => {
          snap.docs.forEach((d) => list.push({ id: d.id, ...d.data() }))
        })

        list.sort((a, b) => {
          const bd = b.createdAt?.toDate
            ? b.createdAt.toDate()
            : new Date(b.createdAtMs ?? b.createdAt ?? b.date ?? 0)
          const ad = a.createdAt?.toDate
            ? a.createdAt.toDate()
            : new Date(a.createdAtMs ?? a.createdAt ?? a.date ?? 0)
          return bd.getTime() - ad.getTime()
        })

        this.orders = list
      } catch (e) {
        console.error('Error fetching dashboard orders:', e)
        this.orders = []
      } finally {
        this.loading = false
      }
    },
    async backfillBranchIdForOrders(limitCount = 500) {
      const authStore = useAuthStore()
      const branchId = authStore.branchId
      if (!branchId) return
      const { getDocs, limit, writeBatch } = await import('firebase/firestore')
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(limitCount))
      const snap = await getDocs(q)
      const batch = writeBatch(db)
      let updated = 0
      snap.docs.forEach((d) => {
        const data = d.data()
        if (!data.branchId) {
          batch.update(doc(db, 'orders', d.id), { branchId })
          updated++
        }
      })
      if (updated > 0) {
        await batch.commit()
      }
      return updated
    },
    async addOrder(orderData) {
      this.loading = true
      const authStore = useAuthStore()
      const branchId = authStore.branchId
      const orgOwnerUid = authStore.orgOwnerUid
      const stripUndefined = (value) => {
        if (value === undefined) return undefined
        if (value === null) return null
        if (Array.isArray(value)) {
          const cleaned = value.map((v) => stripUndefined(v)).filter((v) => v !== undefined)
          return cleaned
        }
        if (value && typeof value === 'object' && value.constructor === Object) {
          const out = {}
          Object.keys(value).forEach((k) => {
            const cleaned = stripUndefined(value[k])
            if (cleaned !== undefined) out[k] = cleaned
          })
          return out
        }
        return value
      }
      if (authStore.isMainAdmin) {
        this.loading = false
        throw new Error('Main account cannot create orders')
      }
      if (!branchId) {
        this.loading = false
        throw new Error('No branch assigned to this account')
      }

      try {
        const result = await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'system_counters', 'daily_order_counter')
          const counterDoc = await transaction.get(counterRef)

          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const todayStr = `${year}${month}${day}`

          let newCount = 1

          if (counterDoc.exists()) {
            const data = counterDoc.data()
            if (data.date === todayStr) {
              newCount = data.count + 1
            }
          }

          const sequence = String(newCount).padStart(4, '0')
          const orderNumber = `${todayStr}-${sequence}`
          const newOrderRef = doc(collection(db, 'orders'))

          const finalOrder = stripUndefined({
            ...orderData,
            orderNumber: orderNumber,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
            status: 'Paid',
            cashierId: auth.currentUser?.uid || 'system',
            cashierName: auth.currentUser?.displayName || 'Admin',
            branchId,
            orgOwnerUid: orgOwnerUid || null,
          })

          transaction.set(counterRef, { count: newCount, date: todayStr })
          transaction.set(newOrderRef, finalOrder)

          return { id: newOrderRef.id, ...finalOrder }
        })

        await logAudit({
          module: 'orders',
          action: 'add',
          entityType: 'order',
          entityId: result.id,
          details: result,
        })

        Notify.create({
          type: 'positive',
          message: `Order ${result.orderNumber} Created Successfully`,
        })

        return result
      } catch (error) {
        console.error('Transaction failed: ', error)
        Notify.create({
          type: 'negative',
          message: 'Failed to create order. Please try again.',
        })
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
