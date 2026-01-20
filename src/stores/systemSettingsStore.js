import { defineStore } from 'pinia'
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase' // Adjust your firebase import path if needed
import { SystemSettingsModel } from 'src/services/models/SystemSettings.js'

export const useSystemSettingsStore = defineStore('systemSettings', {
  state: () => ({
    settings: null,
    loading: false,
  }),

  actions: {
    async fetchSettings() {
      this.loading = true
      try {
        // Assuming there is only one settings document in this collection
        const querySnapshot = await getDocs(collection(db, 'systemSettings'))

        if (!querySnapshot.empty) {
          // Map the first document found to our Model
          this.settings = SystemSettingsModel.fromFirestore(querySnapshot.docs[0])
        } else {
          // Initialize with defaults if no document exists yet
          this.settings = new SystemSettingsModel()
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        this.loading = false
      }
    },

    async saveSettings(data) {
      this.loading = true
      try {
        // Convert the form data into a Model instance to sanitize inputs
        const settingsObj = new SystemSettingsModel(data)

        if (data.id) {
          // Update existing
          const docRef = doc(db, 'systemSettings', data.id)
          await updateDoc(docRef, settingsObj.toFirestore())

          // Update local state
          this.settings = settingsObj
        } else {
          // Create new
          const docRef = await addDoc(collection(db, 'systemSettings'), settingsObj.toFirestore())

          // Update local state with the new ID
          this.settings = new SystemSettingsModel({ ...data, id: docRef.id })
        }
      } catch (error) {
        console.error('Error saving settings:', error)
        throw error // Throw so the UI can show a notification
      } finally {
        this.loading = false
      }
    },
  },
})
