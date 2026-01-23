/**
 * Import function triggers from their respective submodules:
 */
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const admin = require('firebase-admin')
const { setGlobalOptions } = require('firebase-functions/v2')

// Initialize Firebase Admin SDK (Required to change passwords)
if (!admin.apps.length) {
  admin.initializeApp()
}

// Set global options (optional, keeps costs low)
setGlobalOptions({ maxInstances: 10 })

// ----------------------------------------------------------------------
//  CLOUD FUNCTION: Admin Update User Password
// ----------------------------------------------------------------------
exports.adminUpdateUserPassword = onCall({ cors: true }, async (request) => {
  // 1. Security Check: Ensure the requester is logged in
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be logged in to perform this action.')
  }

  // (Optional) Add a check here to ensure request.auth.token.role === 'admin'
  // if you want to strictly enforce roles at the backend level.

  const { targetUid, newPassword } = request.data

  // 2. Validate Inputs
  if (!targetUid || !newPassword || newPassword.length < 6) {
    throw new HttpsError('invalid-argument', 'Invalid password (min 6 chars) or UID provided.')
  }

  try {
    // 3. Perform the update via Admin SDK
    await admin.auth().updateUser(targetUid, {
      password: newPassword,
    })

    console.log(`Password updated successfully for user: ${targetUid}`)
    return { success: true, message: 'Password updated successfully' }
  } catch (error) {
    console.error('Error updating password:', error)
    throw new HttpsError('internal', error.message)
  }
})
