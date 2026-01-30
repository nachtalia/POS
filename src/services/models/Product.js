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
    description = '',
    sku = '',
    sizes = [],
    allowedAddons = [],
    allowedAddonCategories = [],
    active = true,
    branchId = null,
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
    this.description = description
    this.sku = sku
    this.sizes = Array.isArray(sizes) ? sizes : []
    this.allowedAddons = Array.isArray(allowedAddons) ? allowedAddons : []
    this.allowedAddonCategories = Array.isArray(allowedAddonCategories)
      ? allowedAddonCategories
      : []
    this.active = active
    this.branchId = branchId

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
      description: this.description,
      sku: this.sku,
      sizes: this.sizes,
      allowedAddons: this.allowedAddons,
      allowedAddonCategories: this.allowedAddonCategories,
      active: this.active,
      branchId: this.branchId,
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
