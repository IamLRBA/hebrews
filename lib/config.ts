/**
 * Centralized configuration for POS.
 * All payment and app config should read from here.
 */

export const config = {
  appBaseUrl: process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_ORIGIN || '',
  pesapal: {
    baseUrl: process.env.PESAPAL_BASE_URL,
    consumerKey: process.env.PESAPAL_CONSUMER_KEY,
    consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
    ipnId: process.env.PESAPAL_IPN_ID,
    callbackUrl: process.env.PESAPAL_CALLBACK_URL,
  },
}
