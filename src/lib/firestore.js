import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, increment,
  query, orderBy, limit as fbLimit, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../firebase'

/**
 * Save a scan result to the user's history.
 */
export async function saveScanResult(uid, scanData) {
  const scansRef = collection(db, 'users', uid, 'scans')
  await addDoc(scansRef, {
    productName: scanData.product_name,
    brand: scanData.brand,
    score: scanData.ethic_score.overall_score,
    badge: scanData.ethic_score.badge,
    badgeColor: scanData.ethic_score.badge_color,
    imageUrl: scanData.image_url || null,
    category: scanData.category,
    materials: (scanData.materials || []).map(m => m.commodity || m.material).filter(Boolean),
    timestamp: serverTimestamp(),
  })

  // Update user stats
  const userRef = doc(db, 'users', uid)
  const updates = {
    scanCount: increment(1),
    totalScore: increment(scanData.ethic_score.overall_score),
  }
  if (scanData.ethic_score.overall_score >= 75) {
    updates.ethicalFinds = increment(1)
  }
  await updateDoc(userRef, updates)
}

/**
 * Get recent scans for a user.
 */
export async function getRecentScans(uid, count = 6) {
  const scansRef = collection(db, 'users', uid, 'scans')
  const q = query(scansRef, orderBy('timestamp', 'desc'), fbLimit(count))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Get user stats.
 */
export async function getUserStats(uid) {
  const userRef = doc(db, 'users', uid)
  const snap = await getDoc(userRef)
  if (!snap.exists()) return null
  const data = snap.data()
  const avg = data.scanCount > 0 ? data.totalScore / data.scanCount : 0

  let grade
  if (avg >= 90) grade = 'A+'
  else if (avg >= 80) grade = 'A'
  else if (avg >= 70) grade = 'B+'
  else if (avg >= 60) grade = 'B'
  else if (avg >= 50) grade = 'C'
  else if (avg >= 40) grade = 'D'
  else grade = 'F'

  return {
    scanCount: data.scanCount || 0,
    ethicalFinds: data.ethicalFinds || 0,
    impactGrade: grade,
  }
}

/**
 * Get user's scan profile for personalized news.
 * Returns unique categories and materials from scan history.
 */
export async function getUserScanProfile(uid) {
  const scans = await getRecentScans(uid, 20)
  const categories = new Set()
  const materials = new Set()

  for (const scan of scans) {
    if (scan.category) categories.add(scan.category.toLowerCase())
    if (scan.materials) {
      for (const m of scan.materials) materials.add(m)
    }
  }

  return {
    categories: [...categories].slice(0, 5),
    materials: [...materials].slice(0, 10),
  }
}
