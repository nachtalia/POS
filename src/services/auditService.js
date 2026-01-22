// src/services/auditService.js
import { db, auth } from './firebase' // Adjust path if needed
import { collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore'

// --- 1. The Basic Logger (Writes to DB) ---
export async function logAudit({ module, action, entityType, entityId, details }) {
  const user = auth?.currentUser

  // Clean up details to ensure no 'undefined' values (Firebase hates undefined)
  const cleanDetails = details ? JSON.parse(JSON.stringify(details)) : null

  const payload = {
    module,
    action,
    entityType,
    entityId: entityId || null,
    details: cleanDetails,
    userId: user?.uid || null,
    userEmail: user?.email || 'System',
    timestamp: serverTimestamp(),
  }

  // CHANGED: Match the collection name used in your Vue file ('audit_logs')
  await addDoc(collection(db, 'audit_logs'), payload)
}

// --- 2. The "Diff" Calculator (The Magic Part) ---
// This compares two objects and returns: { price: { old: 10, new: 20 } }
function getDifferences(oldData, newData) {
  const changes = {}

  // Merge keys from both objects
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})])

  allKeys.forEach((key) => {
    // Skip internal fields you don't want to track
    if (['id', 'createdAt', 'updatedAt', 'toFirestore'].includes(key)) return

    const oldVal = oldData ? oldData[key] : undefined
    const newVal = newData ? newData[key] : undefined

    // Simple comparison (JSON stringify handles Objects/Arrays fairly well for logs)
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        old: oldVal === undefined ? '-' : oldVal,
        new: newVal === undefined ? '-' : newVal,
      }
    }
  })
  return changes
}

// --- 3. The Smart "Edit" Logger ---
// Call this function BEFORE you run updateDoc() in your other services
export async function logEditAndGetDiff(
  collectionName,
  docId,
  newDataModel,
  moduleName,
  entityType,
) {
  try {
    // A. Fetch the current (old) data from Firebase
    const docRef = doc(db, collectionName, docId)
    const snapshot = await getDoc(docRef)

    if (!snapshot.exists()) return

    const oldData = snapshot.data()

    // B. Convert your Class Model to a plain object
    // If newDataModel is a class (like Product), call .toFirestore(), otherwise use as is
    const plainNewData =
      typeof newDataModel.toFirestore === 'function' ? newDataModel.toFirestore() : newDataModel

    // C. Calculate the changes
    const diff = getDifferences(oldData, plainNewData)

    // D. Only log if something actually changed
    if (Object.keys(diff).length > 0) {
      await logAudit({
        module: moduleName,
        action: 'edit',
        entityType: entityType,
        entityId: docId,
        details: diff, // This format { old: x, new: y } is what your Modal expects!
      })
    }
  } catch (error) {
    console.error('Audit Log Error:', error)
  }
}
