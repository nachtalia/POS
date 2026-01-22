import { Timestamp } from 'firebase/firestore'

export class Product {
  constructor({
    id = null,
    productName = '',
    productPrice = 0,
    productCost = 0,
    productExpiry = null,
    productCategory = '',
    productImage = '',
    active = true,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id
    this.productName = productName
    this.productPrice = Number(productPrice)
    this.productCost = Number(productCost)

    // Handle Expiry Date conversion safely
    this.productExpiry =
      productExpiry instanceof Timestamp
        ? productExpiry
        : productExpiry
          ? Timestamp.fromDate(new Date(productExpiry))
          : null

    this.productCategory = productCategory
    this.productImage = productImage
    this.active = active

    // Handle CreatedAt conversion
    this.createdAt =
      createdAt instanceof Timestamp
        ? createdAt
        : createdAt
          ? Timestamp.fromDate(new Date(createdAt))
          : null

    // Handle UpdatedAt conversion
    this.updatedAt =
      updatedAt instanceof Timestamp
        ? updatedAt
        : updatedAt
          ? Timestamp.fromDate(new Date(updatedAt))
          : null
  }

  toFirestore() {
    return {
      productName: this.productName,
      productPrice: this.productPrice,
      productCost: this.productCost,
      productExpiry: this.productExpiry,
      productCategory: this.productCategory,
      productImage: this.productImage,
      active: this.active,
      createdAt: this.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  }

  static fromFirestore(doc) {
    const data = doc.data()
    return new Product({
      id: doc.id,
      ...data,
    })
  }
}
