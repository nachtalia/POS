import { Timestamp } from 'firebase/firestore'

export class CustomerOrder {
  constructor({
    id = null,
    customerName = '',
    tableId = null,
    tableName = '',
    branchId = null,
    items = [],
    totalAmount = 0,
    status = 'pending',
    paymentStatus = 'unpaid',
    paymentMethod = 'cashier',
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id
    this.customerName = customerName
    this.tableId = tableId
    this.tableName = tableName
    this.branchId = branchId
    this.items = items
    this.totalAmount = Number(totalAmount)
    this.status = status
    this.paymentStatus = paymentStatus
    this.paymentMethod = paymentMethod
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

  toJSON() {
    return {
      customerName: this.customerName,
      tableId: this.tableId,
      tableName: this.tableName,
      branchId: this.branchId,
      items: this.items.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: Number(item.price) * Number(item.quantity),
        notes: item.notes || '',
      })),
      totalAmount: this.totalAmount,
      status: this.status,
      paymentStatus: this.paymentStatus,
      paymentMethod: this.paymentMethod,
      createdAt: this.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  }

  static fromFirestore(doc) {
    const data = doc.data()
    return new CustomerOrder({
      id: doc.id,
      ...data,
    })
  }
}
