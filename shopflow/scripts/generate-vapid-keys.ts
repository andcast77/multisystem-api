#!/usr/bin/env tsx
/**
 * Generate VAPID keys for Web Push notifications
 * Run: pnpm tsx scripts/generate-vapid-keys.ts
 */

import webpush from 'web-push'

console.log('Generating VAPID keys for Web Push notifications...\n')

const vapidKeys = webpush.generateVAPIDKeys()

console.log('Add these to your .env file:\n')
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${vapidKeys.publicKey}"`)
console.log(`VAPID_PRIVATE_KEY="${vapidKeys.privateKey}"`)
console.log(`VAPID_SUBJECT="mailto:admin@shopflow.com"`)
console.log('\nNote: Update VAPID_SUBJECT with your actual contact email.')

