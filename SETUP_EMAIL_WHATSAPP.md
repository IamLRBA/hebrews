# Email & WhatsApp Service Provider Setup Guide

This guide will help you configure SendGrid for email and Twilio for WhatsApp messaging.

## Prerequisites

- Node.js installed
- Accounts for SendGrid and Twilio (free tiers available)

---

## Part 1: SendGrid Email Setup

### Step 1: Create SendGrid Account

1. Go to [https://sendgrid.com](https://sendgrid.com)
2. Click "Start for Free" and sign up
3. Verify your email address

### Step 2: Create API Key

1. Log in to SendGrid dashboard
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `MysticalPIECES Email Service`
5. Select **Full Access** permissions (or **Restricted Access** with Mail Send permissions)
6. Click **Create & View**
7. **IMPORTANT**: Copy the API key immediately (you won't see it again!)
8. Save it securely

### Step 3: Verify Sender Identity

1. Go to **Settings** → **Sender Authentication**
2. Choose one of these options:

   **Option A: Single Sender Verification (Easiest for testing)**
   - Click **Verify a Single Sender**
   - Fill in your details:
     - From Email: `jerrylarubafestus@gmail.com` (or your business email)
     - From Name: `Mystical PIECES`
     - Reply To: `jerrylarubafestus@gmail.com`
   - Click **Create**
   - Check your email and click the verification link

   **Option B: Domain Authentication (Recommended for production)**
   - Click **Authenticate Your Domain**
   - Follow the DNS setup instructions
   - Add the provided DNS records to your domain

### Step 4: Install SendGrid Package

```bash
npm install @sendgrid/mail
```

---

## Part 2: Twilio WhatsApp Setup

### Step 1: Create Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Click "Sign up" and create an account
3. Verify your phone number and email

### Step 2: Get Your Twilio Credentials

1. Log in to Twilio Console
2. Go to **Account** → **API Keys & Tokens**
3. Copy your:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "View" to reveal)

### Step 3: Set Up WhatsApp Sandbox (For Testing)

1. Go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Click **Get started with Twilio Sandbox for WhatsApp**
3. Follow the instructions to join the sandbox:
   - Send the provided code to the Twilio WhatsApp number
4. Copy the **Sandbox Number** (format: `whatsapp:+14155238886`)

### Step 4: Request Production WhatsApp Number (For Production)

1. Go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select **WhatsApp-enabled** numbers
3. Purchase a number (or request approval for free tier)
4. Note: Production WhatsApp requires business verification

### Step 5: Install Twilio Package

```bash
npm install twilio
```

---

## Part 3: Environment Variables Setup

### Step 1: Create `.env.local` File

In your project root, create a file named `.env.local`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key_here
FROM_EMAIL=jerrylarubafestus@gmail.com
FROM_NAME=Mystical PIECES

# Twilio Configuration
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### Step 2: Replace Placeholder Values

Replace the placeholder values with your actual credentials:

- `your_sendgrid_api_key_here` → Your SendGrid API key
- `your_twilio_account_sid_here` → Your Twilio Account SID
- `your_twilio_auth_token_here` → Your Twilio Auth Token
- `whatsapp:+14155238886` → Your Twilio WhatsApp number (sandbox or production)

### Step 3: Add to `.gitignore`

Make sure `.env.local` is in your `.gitignore` file (it should be by default).

---

## Part 4: Update API Routes

The API routes have been updated with the actual implementations. They will automatically use your environment variables.

---

## Part 5: Testing

### Test Email Sending

1. Place a test order on your website
2. Check the order confirmation page
3. Verify you receive:
   - Customer email with receipt attachment
   - Admin email with order details

### Test WhatsApp Sending

1. Place a test order with a valid phone number
2. Check your WhatsApp:
   - Customer should receive confirmation message
   - Admin WhatsApp should receive order notification

### Check Logs

- Check browser console for any errors
- Check server logs for API responses
- Check SendGrid dashboard → **Activity** for email status
- Check Twilio dashboard → **Monitor** → **Logs** for WhatsApp status

---

## Troubleshooting

### Email Not Sending

1. **Check API Key**: Verify `SENDGRID_API_KEY` is correct
2. **Check Sender Verification**: Ensure sender email is verified in SendGrid
3. **Check Spam Folder**: Emails might be going to spam
4. **Check SendGrid Activity**: Go to SendGrid dashboard → Activity to see delivery status
5. **Check Rate Limits**: Free tier has limits (100 emails/day)

### WhatsApp Not Sending

1. **Check Sandbox**: Ensure recipient has joined Twilio sandbox (for testing)
2. **Check Phone Format**: Phone must be in international format: `+256755915549`
3. **Check Twilio Logs**: Go to Twilio dashboard → Monitor → Logs
4. **Check Credentials**: Verify Account SID and Auth Token are correct
5. **Check Number Format**: WhatsApp number must start with `whatsapp:`

### Common Errors

**Error: "Invalid API Key"**
- Regenerate API key in SendGrid
- Update `.env.local` with new key
- Restart your development server

**Error: "Sender not verified"**
- Complete sender verification in SendGrid
- Wait for verification email and click link

**Error: "WhatsApp number not found"**
- Verify Twilio WhatsApp number format: `whatsapp:+14155238886`
- For sandbox, ensure recipient joined sandbox

---

## Production Checklist

- [ ] SendGrid sender verified (or domain authenticated)
- [ ] Twilio WhatsApp number approved for production
- [ ] Environment variables set in production (Vercel/Netlify/etc.)
- [ ] Tested email sending with attachments
- [ ] Tested WhatsApp messaging
- [ ] Monitored first few orders to ensure notifications work
- [ ] Set up error monitoring/alerts

---

## Cost Information

### SendGrid (Free Tier)
- 100 emails/day forever
- Upgrade plans start at $19.95/month for 50,000 emails

### Twilio (Pay-as-you-go)
- WhatsApp messages: ~$0.005 per message
- Free tier includes $15.50 credit
- Sandbox is free for testing

---

## Support Resources

- SendGrid Documentation: https://docs.sendgrid.com
- Twilio WhatsApp Docs: https://www.twilio.com/docs/whatsapp
- Twilio Support: https://support.twilio.com

---

## Next Steps

After setup:
1. Test with a real order
2. Monitor the first few orders
3. Set up error alerts
4. Consider upgrading plans as you scale

