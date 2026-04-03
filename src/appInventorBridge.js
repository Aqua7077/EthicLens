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
    alert('Barcode scanning is available when running inside the EthicLens app.')
  }
}

export function triggerCamera() {
  if (!sendToAppInventor('scan', 'camera')) {
    alert('Camera is available when running inside the EthicLens app.')
  }
}
