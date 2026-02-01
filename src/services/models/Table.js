export default class Table {
  constructor({
    id = null,
    name = '',
    capacity = null, // Changed from 2 to null
    products = [],
    branchId = null,
  } = {}) {
    this.id = id
    this.name = name
    // If capacity is provided, use it; otherwise keep it null.
    // This removes the forced "2".
    this.capacity = capacity ? Number(capacity) : null
    this.products = products
    this.branchId = branchId
  }

  // Convert to plain object for Firestore
  toJSON() {
    return {
      name: this.name,
      capacity: this.capacity,
      products: this.products,
      branchId: this.branchId,
    }
  }

  static fromFirestore(snapshot) {
    const data = snapshot.data()
    return new Table({
      id: snapshot.id,
      ...data,
    })
  }
}
