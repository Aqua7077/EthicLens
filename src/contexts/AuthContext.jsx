import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, googleProvider } from '../firebase'

const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for redirect result first (handles mobile redirect flow)
    getRedirectResult(auth).catch(() => {})

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Ensure user doc exists in Firestore
        const userRef = doc(db, 'users', firebaseUser.uid)
        try {
          const snap = await getDoc(userRef)
          if (!snap.exists()) {
            await setDoc(userRef, {
              displayName: firebaseUser.displayName || '',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: serverTimestamp(),
              scanCount: 0,
              ethicalFinds: 0,
              totalScore: 0,
            })
          }
        } catch (err) {
          console.warn('Firestore user doc error:', err)
        }
        setUser(firebaseUser)
      } else {
        setUser(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const signIn = async () => {
    // Detect mobile/iOS where popup often fails
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

    if (isMobile || isIOS) {
      // Mobile: use redirect directly (most reliable on iOS Safari)
      await signInWithRedirect(auth, googleProvider)
    } else {
      try {
        await signInWithPopup(auth, googleProvider)
      } catch (err) {
        if (
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/popup-closed-by-user' ||
          err.code === 'auth/cancelled-popup-request'
        ) {
          await signInWithRedirect(auth, googleProvider)
        } else {
          throw err
        }
      }
    }
  }

  const signOut = () => firebaseSignOut(auth)

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
