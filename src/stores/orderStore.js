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
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))

      this.unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          this.orders = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
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
        const logsRef = collection(db, 'audit_logs')
        const q = query(logsRef, where('entityId', '==', entityId), orderBy('timestamp', 'desc'))

        const snapshot = await getDocs(q)
        this.history = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
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

    async addOrder(orderData) {
      this.loading = true

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

          const finalOrder = {
            ...orderData,
            orderNumber: orderNumber,
            createdAt: serverTimestamp(),
            status: 'Paid',
            cashierId: auth.currentUser?.uid || 'system',
            cashierName: auth.currentUser?.displayName || 'Admin',
          }

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
