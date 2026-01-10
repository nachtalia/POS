import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore'

export const useOrderStore = defineStore('orderStore', {
  state: () => ({
    orders: [],
    loading: false
  }),

  actions: {
    async fetchOrders() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, "orders"))
        this.orders = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
      } catch (err) {
        console.error("Error fetching orders:", err)
      } finally {
        this.loading = false
      }
    },

    async addOrder(orderData) {
      try {
        const docRef = await addDoc(collection(db, "orders"), {
          ...orderData,
          createdAt: serverTimestamp()
        })
        this.orders.push({ id: docRef.id, ...orderData })
      } catch (err) {
        console.error("Error creating order:", err)
        throw err
      }
    }
  }
})