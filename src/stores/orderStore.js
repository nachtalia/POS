import { defineStore } from 'pinia'
import { db, auth } from 'src/services/firebase' // Adjust path to your firebase config
import {
  collection,
  doc,
  runTransaction,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { Notify } from 'quasar'

export const useOrderStore = defineStore('order', {
  state: () => ({
    orders: [],
    loading: false,
    unsubscribe: null, // To manage the listener
  }),

  getters: {
    // Helper to get total sales for today
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
    // 1. FETCH ORDERS (Real-time Listener)
    // This is the SINGLE source of truth. It listens to Firestore.
    // When you add an order, Firestore updates, and this triggers automatically.
    async fetchOrders() {
      // Avoid attaching multiple listeners
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

    // 2. STOP LISTENER (Cleanup)
    clearOrders() {
      if (this.unsubscribe) {
        this.unsubscribe()
        this.unsubscribe = null
      }
      this.orders = []
    },

    // 3. ADD ORDER (The Transaction)
    async addOrder(orderData) {
      this.loading = true

      try {
        // Use a transaction to safely generate the ID
        const result = await runTransaction(db, async (transaction) => {
          // A. Reference the Counter Document
          const counterRef = doc(db, 'system_counters', 'daily_order_counter')
          const counterDoc = await transaction.get(counterRef)

          // B. Calculate Date String (YYYYMMDD)
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const todayStr = `${year}${month}${day}`

          let newCount = 1

          // C. Logic to reset counter if it's a new day
          if (counterDoc.exists()) {
            const data = counterDoc.data()
            if (data.date === todayStr) {
              newCount = data.count + 1
            } else {
              // It's a new day, reset to 1 (automatically handled by initializing newCount=1)
            }
          }

          // D. Generate the Fancy ID (e.g., 20260121-0001)
          const sequence = String(newCount).padStart(4, '0')
          const orderNumber = `${todayStr}-${sequence}`

          // E. Create the Order Reference (using auto-ID or the orderNumber as ID)
          // Using auto-ID for the document is safer, storing orderNumber as a field
          const newOrderRef = doc(collection(db, 'orders'))

          // F. Prepare Final Data
          const finalOrder = {
            ...orderData,
            orderNumber: orderNumber,
            createdAt: serverTimestamp(), // Server time is most accurate
            status: 'Paid', // or 'Pending'
            cashierId: auth.currentUser?.uid || 'system',
            cashierName: auth.currentUser?.displayName || 'Admin',
          }

          // G. Commit Transaction
          // 1. Update Counter
          transaction.set(counterRef, { count: newCount, date: todayStr })
          // 2. Create Order
          transaction.set(newOrderRef, finalOrder)

          // Return the data so the UI knows the ID immediately
          return { id: newOrderRef.id, ...finalOrder }
        })

        // --- THE FIX IS HERE ---
        // ❌ We REMOVED: this.orders.push(result)
        // ✅ We RELY on: fetchOrders() listener to see the new file and update the list.

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
