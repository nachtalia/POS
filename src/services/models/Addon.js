import { Timestamp } from "firebase/firestore";

export class Addon {
  constructor({
    id = null,
    name = "",
    category = "",
    price = 0,
    stock = null,
    status = "Available",
    allowedProductIds = [],
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.id = id
    this.name = name
    this.category = category
    this.price = Number(price)
    this.stock = stock === null || stock === undefined ? null : Number(stock)
    this.status = status
    this.allowedProductIds = Array.isArray(allowedProductIds) ? allowedProductIds : []
    this.createdAt = createdAt instanceof Timestamp ? createdAt : (createdAt ? Timestamp.fromDate(new Date(createdAt)) : null)
    this.updatedAt = updatedAt instanceof Timestamp ? updatedAt : (updatedAt ? Timestamp.fromDate(new Date(updatedAt)) : null)
  }

  toFirestore() {
    return {
      name: this.name,
      category: this.category,
      price: this.price,
      stock: this.stock,
      status: this.status,
      allowedProductIds: this.allowedProductIds,
      createdAt: this.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  }

  static fromFirestore(doc) {
    const data = doc.data()
    return new Addon({
      id: doc.id,
      ...data
    })
  }
}
