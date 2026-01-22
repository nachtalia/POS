import { Timestamp } from 'firebase/firestore'

export class AuditLog {
  constructor({
    id = null,
    action = '', // 'add', 'edit', 'delete'
    module = '', // 'inventory', 'settings', etc.
    entityId = '', // ID of the Product/Category
    entityType = '', // 'product', 'category'
    userEmail = 'System',
    details = {}, // The changes { price: { old: 10, new: 20 } }
    timestamp = null,
  } = {}) {
    this.id = id
    this.action = action
    this.module = module
    this.entityId = entityId
    this.entityType = entityType
    this.userEmail = userEmail
    this.details = details

    this.timestamp =
      timestamp instanceof Timestamp
        ? timestamp
        : timestamp
          ? Timestamp.fromDate(new Date(timestamp))
          : Timestamp.now()
  }

  toFirestore() {
    return {
      action: this.action,
      module: this.module,
      entityId: this.entityId,
      entityType: this.entityType,
      userEmail: this.userEmail,
      details: this.details,
      timestamp: this.timestamp || Timestamp.now(),
    }
  }

  static fromFirestore(doc) {
    const data = doc.data()
    return new AuditLog({
      id: doc.id,
      ...data,
    })
  }
}
