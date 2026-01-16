// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app'
import { getAnalytics } from 'firebase/analytics'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth' // 1. Import Auth SDK

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyDOzIBvGCItkje8-Knvz75m07rQrdI2teg',
  authDomain: 'point-of-sale-f5706.firebaseapp.com',
  databaseURL: 'https://point-of-sale-f5706-default-rtdb.firebaseio.com',
  projectId: 'point-of-sale-f5706',
  storageBucket: 'point-of-sale-f5706.firebasestorage.app',
  messagingSenderId: '59187862784',
  appId: '1:59187862784:web:2e327ad09d69419c9667e5',
  measurementId: 'G-0M8CQM1QX1',
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const db = getFirestore(app)
const auth = getAuth(app) // 2. Initialize Auth
const secondaryApp = initializeApp(firebaseConfig, 'Secondary')
const secondaryAuth = getAuth(secondaryApp)

// 3. Export auth so other files can use it
export { app, analytics, db, auth, secondaryAuth }
