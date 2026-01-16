import { defineStore } from 'pinia'
import { db } from '../services/firebase'
import { collection, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore'
import { Category } from '../services/models/Category' 
import { logAudit } from '../services/auditService'

export const useCategoryStore = defineStore('categoryStore', {
  state: () => ({
    categories: [],
    loading: false
  }),

  actions: {
    async fetchCategories() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, "categories"))
        this.categories = querySnapshot.docs.map(doc => Category.fromFirestore(doc))
      } catch (error) {
        console.error("Error fetching categories:", error)
      } finally {
        this.loading = false
      }
    },

    async addCategory(categoryData) {
      try {
        const newCategory = new Category(categoryData)
        
        const docRef = await addDoc(collection(db, "categories"), newCategory.toFirestore())

        newCategory.id = docRef.id
        this.categories.push(newCategory)
        await logAudit({
          module: 'inventory',
          action: 'add',
          entityType: 'category',
          entityId: docRef.id,
          details: newCategory.toFirestore()
        })
      } catch (error) {
        console.error("Error adding category:", error)
        throw error 
      }
    },

    async deleteCategory(categoryId) {
      try {
        await deleteDoc(doc(db, "categories", categoryId))
        this.categories = this.categories.filter(c => c.id !== categoryId)
        await logAudit({
          module: 'inventory',
          action: 'delete',
          entityType: 'category',
          entityId: categoryId,
          details: null
        })
      } catch (error) {
        console.error("Error deleting category:", error)
        throw error
      }
    }
  }
})
