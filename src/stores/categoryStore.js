import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'

export const useCategoryStore = defineStore('categoryStore', {
  state: () => ({
    categories: [],
    loading: false
  }),

  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, 'categories'))
        this.categories = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      } catch (e) {
        console.error('Error fetching categories:', e)
      } finally {
        this.loading = false
      }
    },
    async addCategory(payload) {
      try {
        const docRef = await addDoc(collection(db, 'categories'), payload)
        this.categories.push({ id: docRef.id, ...payload })
      } catch (e) {
        console.error('Error adding category:', e)
      }
    },
    async updateCategory(id, payload) {
      try {
        await updateDoc(doc(db, 'categories', id), payload)
        this.categories = this.categories.map(c => (c.id === id ? { ...c, ...payload } : c))
      } catch (e) {
        console.error('Error updating category:', e)
      }
    },
    async deleteCategory(id) {
      try {
        await deleteDoc(doc(db, 'categories', id))
        this.categories = this.categories.filter(c => c.id !== id)
      } catch (e) {
        console.error('Error deleting category:', e)
      }
    }
  }
})
