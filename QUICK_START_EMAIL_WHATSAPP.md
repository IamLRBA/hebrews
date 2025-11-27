# Quick Start: Email & WhatsApp Setup

Follow these steps to get your email and WhatsApp notifications working in 15 minutes!

## 📦 Step 1: Install Packages (Already Done!)

The required packages have been installed:
- ✅ `@sendgrid/mail` - For email sending
- ✅ `twilio` - For WhatsApp messaging

## 📧 Step 2: Set Up SendGrid (5 minutes)

### 2.1 Create Account
1. Visit: https://sendgrid.com
2. Click "Start for Free" and sign up
3. Verify your email

### 2.2 Get API Key
1. Go to: **Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `MysticalPIECES`
4. Permissions: **Full Access** (or **Restricted Access** with Mail Send)
5. **Copy the key immediately!** (You won't see it again)

### 2.3 Verify Sender
1. Go to: **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Enter:
   - From Email: `jerrylarubafestus@gmail.com`
   - From Name: `Mystical PIECES`
   - Reply To: `jerrylarubafestus@gmail.com`
4. Click **Create**
5. **Check your email and click the verification link**

## 📱 Step 3: Set Up Twilio (5 minutes)

### 3.1 Create Account
1. Visit: https://www.twilio.com
2. Sign up (free trial with $15.50 credit)
3. Verify your phone number

### 3.2 Get Credentials
1. Go to: **Console Dashboard**
2. Copy:
   - **Account SID** (starts with `AC...`)
   - **Auth Token** (click "View" to reveal)

### 3.3 Set Up WhatsApp Sandbox
1. Go to: **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Click **Get started with Twilio Sandbox**
3. Follow instructions to join sandbox:
   - Send the code to the Twilio WhatsApp number
4. Note the **Sandbox Number**: `whatsapp:+14155238886`

## 🔧 Step 4: Configure Environment Variables (2 minutes)

### 4.1 Create `.env.local` File

In your project root (`c:\Users\User\fcs`), create a file named `.env.local`:

```env
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=jerrylarubafestus@gmail.com
FROM_NAME=Mystical PIECES

# Twilio Configuration
TWILIO_ACCOUNT_SID=ACyour_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 4.2 Replace Values

Replace the placeholder values:
- `SG.your_actual_api_key_here` → Your SendGrid API key
- `ACyour_account_sid_here` → Your Twilio Account SID
- `your_auth_token_here` → Your Twilio Auth Token
- Keep `whatsapp:+14155238886` for sandbox (or use your production number)

### 4.3 Restart Development Server

After creating `.env.local`, restart your Next.js server:
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

## ✅ Step 5: Test It! (3 minutes)

### 5.1 Test Email
1. Place a test order on your website
2. Check the customer email inbox
3. Check admin email: `jerrylarubafestus@gmail.com`
4. Verify receipt attachment is included

### 5.2 Test WhatsApp
1. Use a phone number that has joined the Twilio sandbox
2. Place a test order
3. Check WhatsApp for:
   - Customer confirmation message
   - Admin notification message

### 5.3 Check Logs
- Browser console (F12) for any errors
- SendGrid dashboard → **Activity** for email status
- Twilio dashboard → **Monitor** → **Logs** for WhatsApp status

## 🚨 Troubleshooting

### Email Not Working?
- ✅ Check `.env.local` file exists and has correct values
- ✅ Verify sender email is verified in SendGrid
- ✅ Check spam folder
- ✅ Restart development server after adding `.env.local`
- ✅ Check SendGrid Activity dashboard

### WhatsApp Not Working?
- ✅ Ensure recipient joined Twilio sandbox (for testing)
- ✅ Phone number must be international format: `+256755915549`
- ✅ Check Twilio Logs dashboard
- ✅ Verify all Twilio credentials in `.env.local`

### Still Having Issues?
1. Check browser console for errors
2. Check server terminal for error messages
3. Verify all environment variables are set correctly
4. Make sure you restarted the server after adding `.env.local`

## 📚 Full Documentation

For detailed setup instructions, see: `SETUP_EMAIL_WHATSAPP.md`

## 🎉 You're Done!

Once configured, every order will automatically:
- ✅ Send customer email with receipt attachment
- ✅ Send customer WhatsApp (if phone valid)
- ✅ Send admin email with order details
- ✅ Send admin WhatsApp with order details

---

**Need Help?**
- SendGrid Docs: https://docs.sendgrid.com
- Twilio WhatsApp Docs: https://www.twilio.com/docs/whatsapp

