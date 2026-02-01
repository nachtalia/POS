import { defineStore } from 'pinia'
import { db } from 'src/services/firebase'
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  doc,
} from 'firebase/firestore'
import { CustomerOrder } from 'src/services/models/CustomerOrders'

export const useCustomerOrdersStore = defineStore('customerOrders', {
  state: () => ({
    orders: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchOrders(branchId) {
      this.loading = true
      this.orders = []
      try {
        let q
        if (branchId) {
          q = query(
            collection(db, 'orders'),
            where('branchId', '==', branchId),
            orderBy('createdAt', 'desc'),
          )
        } else {
          q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
        }

        const querySnapshot = await getDocs(q)
        this.orders = querySnapshot.docs.map((doc) => CustomerOrder.fromFirestore(doc))
      } catch (err) {
        console.error('Error fetching orders:', err)
        this.error = err.message
      } finally {
        this.loading = false
      }
    },

    async updateOrderStatus(orderId, status, paymentStatus) {
      this.loading = true
      try {
        const orderRef = doc(db, 'orders', orderId)
        await updateDoc(orderRef, {
          status,
          paymentStatus,
          updatedAt: serverTimestamp(),
        })

        // Update local state
        const index = this.orders.findIndex((o) => o.id === orderId)
        if (index !== -1) {
          this.orders[index].status = status
          this.orders[index].paymentStatus = paymentStatus
        }
      } catch (err) {
        console.error('Error updating order status:', err)
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },

    async createOrder(orderData) {
      this.loading = true
      this.error = null
      try {
        // Ensure data fits the model
        const order = new CustomerOrder(orderData)
        const payload = order.toJSON()

        // Add server timestamp for consistency
        payload.createdAt = serverTimestamp()
        payload.updatedAt = serverTimestamp()

        const docRef = await addDoc(collection(db, 'orders'), payload)

        return docRef.id
      } catch (err) {
        console.error('Error creating order:', err)
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    },
  },
})
