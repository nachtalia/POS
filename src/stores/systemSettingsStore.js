import { defineStore } from 'pinia'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
} from 'firebase/firestore'
import { db } from '../services/firebase'
import { SystemSettingsModel } from 'src/services/models/SystemSettings.js'
// IMPORT logEditAndGetDiff here
import { logAudit, logEditAndGetDiff } from '../services/auditService'

export const useSystemSettingsStore = defineStore('systemSettings', {
  state: () => ({
    settings: null,
    history: [],
    loading: false,
  }),

  actions: {
    async fetchSettings() {
      this.loading = true
      try {
        const querySnapshot = await getDocs(collection(db, 'systemSettings'))
        if (!querySnapshot.empty) {
          this.settings = SystemSettingsModel.fromFirestore(querySnapshot.docs[0])
        } else {
          this.settings = new SystemSettingsModel()
        }
      } catch (error) {
        console.error('Error fetching settings:', error)
      } finally {
        this.loading = false
      }
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
      } catch (error) {
        console.error('Error fetching settings history:', error)
      } finally {
        this.loading = false
      }
    },

    async saveSettings(data) {
      this.loading = true
      try {
        const settingsObj = new SystemSettingsModel(data)

        if (data.id) {
          // --- UPDATE EXISTING ---
          // Use logEditAndGetDiff here
          await logEditAndGetDiff(
            'systemSettings',
            data.id,
            settingsObj,
            'system',
            'systemSettings',
          )

          const docRef = doc(db, 'systemSettings', data.id)
          await updateDoc(docRef, settingsObj.toFirestore())
          this.settings = settingsObj
        } else {
          // --- CREATE NEW ---
          const docRef = await addDoc(collection(db, 'systemSettings'), settingsObj.toFirestore())
          this.settings = new SystemSettingsModel({ ...data, id: docRef.id })

          await logAudit({
            module: 'system',
            action: 'add',
            entityType: 'systemSettings',
            entityId: docRef.id,
            details: settingsObj.toFirestore(),
          })
        }
      } catch (error) {
        console.error('Error saving settings:', error)
        throw error
      } finally {
        this.loading = false
      }
    },
  },
})
