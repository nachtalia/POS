import { defineStore } from 'pinia'
import { db } from 'src/services/firebase'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore'
import Table from 'src/services/models/Table'
import { Product } from 'src/services/models/Product'

export const useTableStore = defineStore('table', {
  state: () => ({
    tables: [],
    availableProducts: [],
    loading: false,
    currentUserId: null,
  }),

  actions: {
    async initData(id) {
      if (!id) return

      this.currentUserId = id
      this.loading = true

      await this.fetchProducts(id)
      await this.fetchTables(id)

      this.loading = false
    },

    async fetchProducts(id) {
      this.availableProducts = []
      try {
        const q = query(
          collection(db, 'products'),
          where('branchId', '==', id),
          where('status', '==', 'available'),
        )

        const querySnapshot = await getDocs(q)
        this.availableProducts = querySnapshot.docs.map((doc) => Product.fromFirestore(doc))
      } catch (err) {
        console.error('Error fetching products:', err)
      }
    },

    async fetchTables(id) {
      this.loading = true
      try {
        const q = query(collection(db, 'tables'), where('branchId', '==', id))

        const querySnapshot = await getDocs(q)
        const rawTables = querySnapshot.docs.map((doc) => Table.fromFirestore(doc))

        const validProductIds = new Set(this.availableProducts.map((p) => p.id))

        this.tables = rawTables.map((table) => {
          if (table.products && table.products.length > 0) {
            table.products = table.products.filter((p) => validProductIds.has(p.productId))
          }
          return table
        })
      } catch (err) {
        console.error('Error fetching tables:', err)
      } finally {
        this.loading = false
      }
    },

    async addTable(rawData) {
      this.loading = true
      try {
        const activeId = this.currentUserId

        if (!activeId) {
          console.error('Cannot add table: No User ID found in store state.')
          return
        }

        const newTableObj = new Table({
          ...rawData,
          products: rawData.products || [],
          branchId: activeId,
        })

        const safePayload = JSON.parse(JSON.stringify(newTableObj.toJSON()))

        const docRef = await addDoc(collection(db, 'tables'), safePayload)

        this.tables.push(new Table({ id: docRef.id, ...newTableObj }))
      } catch (err) {
        console.error('Error adding table:', err)
        throw err
      } finally {
        this.loading = false
      }
    },

    async updateTable(id, updates) {
      try {
        const safeUpdates = JSON.parse(JSON.stringify(updates))
        await updateDoc(doc(db, 'tables', id), safeUpdates)

        const index = this.tables.findIndex((t) => t.id === id)
        if (index !== -1) Object.assign(this.tables[index], updates)
      } catch (err) {
        console.error('Error updating table:', err)
      }
    },

    async deleteTable(id) {
      try {
        await deleteDoc(doc(db, 'tables', id))
        this.tables = this.tables.filter((t) => t.id !== id)
      } catch (err) {
        console.error('Error deleting table:', err)
      }
    },
  },
})
