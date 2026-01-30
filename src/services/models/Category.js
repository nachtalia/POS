import { Timestamp } from 'firebase/firestore'

export class Category {
  constructor({
    id = null,
    name = '',
    description = '',
    branchId = null,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id
    this.name = name
    this.description = description
    this.branchId = branchId

    this.createdAt =
      createdAt instanceof Timestamp
        ? createdAt
        : createdAt
          ? Timestamp.fromDate(new Date(createdAt))
          : null

    this.updatedAt =
      updatedAt instanceof Timestamp
        ? updatedAt
        : updatedAt
          ? Timestamp.fromDate(new Date(updatedAt))
          : null
  }

  toFirestore() {
    return {
      name: this.name,
      description: this.description,
      branchId: this.branchId,
      createdAt: this.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  }

  static fromFirestore(doc) {
    const data = doc.data()
    return new Category({
      id: doc.id,
      ...data,
    })
  }
}
