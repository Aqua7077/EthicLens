/**
 * Bridge between React web app and MIT App Inventor's WebViewer.
 *
 * App Inventor's WebViewer exposes `window.AppInventor` when running inside the app.
 * We use `AppInventor.setWebViewString(value)` to send messages TO App Inventor,
 * and App Inventor uses `WebViewer.WebViewStringChange` to listen for them.
 *
 * Message format: "action:payload"
 *   - "scan:barcode" → trigger barcode scanner
 *   - "scan:camera"  → trigger camera
 *   - "result:..."   → App Inventor sends scan results back
 */

export function isInAppInventor() {
  return typeof window !== 'undefined' && !!window.AppInventor
}

export function sendToAppInventor(action, payload = '') {
  if (isInAppInventor()) {
    window.AppInventor.setWebViewString(`${action}:${payload}`)
    return true
  }
  return false
}

export function triggerBarcodeScan() {
  if (!sendToAppInventor('scan', 'barcode')) {
    // In browser, prompt for manual barcode entry
    const barcode = prompt('Enter a product barcode (e.g. 3017620422003 for Nutella):')
    if (barcode && barcode.trim()) {
      // Dispatch the result through the same callback mechanism
      window.dispatchEvent(new CustomEvent('ethiclens:barcode', { detail: barcode.trim() }))
    }
  }
}

export function triggerCamera() {
  if (!sendToAppInventor('scan', 'camera')) {
    // In browser, prompt for manual entry
    const name = prompt('Enter a product name to analyze:')
    if (name && name.trim()) {
      window.dispatchEvent(new CustomEvent('ethiclens:product', { detail: name.trim() }))
    }
  }
}

/**
 * Listen for barcode/product results from App Inventor or browser prompt.
 * @param {(barcode: string) => void} callback
 * @returns {() => void} cleanup function
 */
export function onBarcodeResult(callback) {
  // Listen for App Inventor WebViewString changes
  const checkInterval = isInAppInventor() ? setInterval(() => {
    const val = window.AppInventor.getWebViewString?.() || ''
    if (val.startsWith('result:')) {
      callback(val.slice(7))
      window.AppInventor.setWebViewString('')
    }
  }, 500) : null

  // Listen for browser events (from prompt fallback)
  const handleBarcode = (e) => callback(e.detail)
  const handleProduct = (e) => {
    // For product names, prefix with name: so the listener can differentiate
    window.dispatchEvent(new CustomEvent('ethiclens:navigate', {
      detail: { type: 'name', value: e.detail }
    }))
  }

  window.addEventListener('ethiclens:barcode', handleBarcode)
  window.addEventListener('ethiclens:product', handleProduct)

  return () => {
    if (checkInterval) clearInterval(checkInterval)
    window.removeEventListener('ethiclens:barcode', handleBarcode)
    window.removeEventListener('ethiclens:product', handleProduct)
  }
}

/**
 * Listen for product name navigation events.
 * @param {(name: string) => void} callback
 * @returns {() => void} cleanup function
 */
export function onProductResult(callback) {
  const handler = (e) => callback(e.detail.value)
  window.addEventListener('ethiclens:navigate', handler)
  return () => window.removeEventListener('ethiclens:navigate', handler)
}
