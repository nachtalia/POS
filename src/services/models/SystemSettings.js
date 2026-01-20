import { Timestamp } from 'firebase/firestore'

export class SystemSettingsModel {
  constructor({
    id = null,
    systemName = '',
    systemLogo = null,
    defaultLogo = 'https://cdn.quasar.dev/logo-v2/svg/logo.svg',
    defaultTax = 0,
    defaultDiscount = 0,
    createdAt = null,
    updatedAt = null,
  } = {}) {
    this.id = id
    this.systemName = systemName
    this.systemLogo = systemLogo
    this.defaultLogo = defaultLogo

    // Force these to be numbers to prevent string addition errors
    this.defaultTax = Number(defaultTax) || 0
    this.defaultDiscount = Number(defaultDiscount) || 0

    // Handle Timestamp conversions
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

  // Convert to plain object for Firebase
  toFirestore() {
    return {
      systemName: this.systemName,
      systemLogo: this.systemLogo || null,
      defaultLogo: this.defaultLogo,
      defaultTax: this.defaultTax,
      defaultDiscount: this.defaultDiscount,
      createdAt: this.createdAt || Timestamp.now(),
      updatedAt: Timestamp.now(),
    }
  }

  // Create instance from Firebase doc
  static fromFirestore(doc) {
    const data = doc.data()
    return new SystemSettingsModel({
      id: doc.id,
      ...data,
    })
  }
}
