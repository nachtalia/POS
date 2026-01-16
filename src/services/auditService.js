import { db, auth } from './firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function logAudit({ module, action, entityType, entityId, details }) {
  const user = auth?.currentUser
  const payload = {
    module,
    action,
    entityType,
    entityId: entityId || null,
    details: details || null,
    userId: user?.uid || null,
    userEmail: user?.email || null,
    timestamp: serverTimestamp(),
  }
  await addDoc(collection(db, 'audit_trail'), payload)
}

