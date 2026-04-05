import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBA6UlnMencgIwJE-mL1VogKEpQOprNFaw",
  authDomain: "ethiclens-96d84.firebaseapp.com",
  projectId: "ethiclens-96d84",
  storageBucket: "ethiclens-96d84.firebasestorage.app",
  messagingSenderId: "801829225863",
  appId: "1:801829225863:web:d5201d3411f2505467ff22",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
