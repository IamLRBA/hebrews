# Free Email & WhatsApp Setup (Without SendGrid/Twilio)

This guide shows you how to set up email and WhatsApp notifications using free alternatives.

---

## 📧 Email Setup: Using Gmail SMTP (FREE)

### Option 1: Gmail SMTP (Recommended - Free)

#### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account: https://myaccount.google.com
2. Go to **Security**
3. Enable **2-Step Verification** if not already enabled

#### Step 2: Generate App Password
1. Go to: https://myaccount.google.com/apppasswords
2. Select **App**: Mail
3. Select **Device**: Other (Custom name)
4. Enter: `Mystical PIECES Website`
5. Click **Generate**
6. **Copy the 16-character password** (you'll see it only once!)

#### Step 3: Configure Environment Variables

Add to your `.env.local` file:

```env
# SMTP Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jerrylarubafestus@gmail.com
SMTP_PASS=your_16_character_app_password_here
FROM_EMAIL=jerrylarubafestus@gmail.com
FROM_NAME=Mystical PIECES
```

**Important**: Use the 16-character app password, NOT your regular Gmail password!

#### Step 4: Restart Server
```bash
npm run dev
```

### Option 2: Outlook/Hotmail SMTP (Free)

Add to `.env.local`:

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your_password
FROM_EMAIL=your-email@outlook.com
FROM_NAME=Mystical PIECES
```

### Option 3: Other SMTP Providers

**Yahoo Mail:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your-email@yahoo.com
SMTP_PASS=your_app_password
```

**Custom SMTP Server:**
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_password
```

---

## 📱 WhatsApp Setup: Free Alternatives

### Option 1: Green API (FREE Tier Available)

Green API offers a free tier that allows you to send WhatsApp messages.

#### Step 1: Sign Up
1. Go to: https://green-api.com
2. Click **Sign Up** (free account available)
3. Verify your email

#### Step 2: Get Credentials
1. After login, go to **API** section
2. Copy:
   - **idInstance** (your instance ID)
   - **apiTokenInstance** (your API token)

#### Step 3: Configure Environment Variables

Add to `.env.local`:

```env
# Green API Configuration
GREEN_API_ID_INSTANCE=your_instance_id_here
GREEN_API_TOKEN_INSTANCE=your_api_token_here
```

#### Step 4: Set Up WhatsApp
1. In Green API dashboard, scan QR code with your WhatsApp
2. This links your WhatsApp number to the API
3. You can now send messages through the API

**Note**: Green API free tier has limitations. For production, consider upgrading.

### Option 2: WhatsApp Business API (Meta) - Free but Requires Approval

1. Create Meta Business account
2. Apply for WhatsApp Business API access
3. Get approved (can take time)
4. Get access token and phone number ID
5. Add to `.env.local`:

```env
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
```

### Option 3: Skip WhatsApp (Email Only)

If you don't want to set up WhatsApp, the system will:
- ✅ Still send emails (via SMTP)
- ✅ Log WhatsApp messages (for manual sending)
- ✅ Generate WhatsApp Web links (you can send manually)

Just don't configure any WhatsApp service in `.env.local`.

---

## 🔧 Complete `.env.local` Example

Here's a complete example using Gmail SMTP and Green API:

```env
# Email Configuration (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=jerrylarubafestus@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
FROM_EMAIL=jerrylarubafestus@gmail.com
FROM_NAME=Mystical PIECES

# WhatsApp Configuration (Green API)
GREEN_API_ID_INSTANCE=123456789
GREEN_API_TOKEN_INSTANCE=abc123def456ghi789
```

---

## ✅ Testing

### Test Email
1. Place a test order
2. Check customer email inbox
3. Check admin email: `jerrylarubafestus@gmail.com`
4. Verify receipt attachment is included

### Test WhatsApp
1. Set up Green API and link your WhatsApp
2. Place a test order with a valid phone number
3. Check WhatsApp for messages

---

## 🚨 Troubleshooting

### Gmail SMTP Issues

**Error: "Invalid login"**
- Make sure you're using an App Password, not your regular password
- Verify 2-Step Verification is enabled
- Regenerate app password if needed

**Error: "Less secure app access"**
- Gmail no longer supports "less secure apps"
- You MUST use App Passwords (see Step 2 above)

**Emails going to spam**
- Send a few test emails first
- Ask recipients to mark as "Not Spam"
- Consider using a custom domain email for better deliverability

### Green API Issues

**Error: "Instance not found"**
- Verify your instance ID is correct
- Make sure you've created an instance in Green API dashboard

**Error: "Phone not registered"**
- Scan the QR code in Green API dashboard with your WhatsApp
- Make sure your phone is linked to the instance

**Messages not sending**
- Check Green API dashboard for errors
- Verify phone number format: `+256755915549` (no spaces)
- Free tier has rate limits

---

## 💰 Cost Comparison

### Email
- **Gmail SMTP**: FREE (up to 500 emails/day)
- **Outlook SMTP**: FREE
- **SendGrid**: Free tier (100 emails/day), then paid

### WhatsApp
- **Green API**: FREE tier available (limited messages)
- **Twilio**: Pay-as-you-go (~$0.005 per message)
- **Meta Business API**: Free but requires approval

---

## 🎯 Recommended Setup

**For Free Setup:**
1. ✅ Gmail SMTP for emails (free, reliable)
2. ✅ Green API for WhatsApp (free tier available)
3. ✅ Or skip WhatsApp and use email only

**For Production:**
1. Consider custom domain email (better deliverability)
2. Upgrade Green API or use Twilio for WhatsApp
3. Monitor email deliverability rates

---

## 📝 Notes

- Gmail has a daily sending limit (500 emails/day for free accounts)
- Green API free tier has message limits
- For high volume, consider paid services
- Always test before going live!

---

## 🔄 Priority Order

The system tries services in this order:

**Email:**
1. SendGrid (if `SENDGRID_API_KEY` is set)
2. SMTP (if `SMTP_HOST` is set)
3. Log only (if neither is configured)

**WhatsApp:**
1. Twilio (if configured)
2. Meta Business API (if configured)
3. Green API (if configured)
4. Log only (if none configured)

You can configure multiple options, and the system will try them in order!

