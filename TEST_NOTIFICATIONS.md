# Testing Email & WhatsApp Notifications

Your credentials have been configured! Here's how to test:

## ✅ Configuration Complete

**Email (Gmail SMTP):**
- ✅ SMTP configured with your Gmail account
- ✅ App Password set

**WhatsApp (Green API):**
- ✅ Green API configured
- ✅ Instance ID: 7105395254
- ✅ API URL: https://7105.api.green-api.com

## 🧪 Testing Steps

### Step 1: Link Your WhatsApp to Green API

**IMPORTANT**: Before WhatsApp messages can be sent, you need to link your WhatsApp:

1. Go to Green API Dashboard: https://console.green-api.com
2. Find your instance (7105395254)
3. Click on it to open details
4. Look for **QR Code** or **Authorization** section
5. Scan the QR code with your WhatsApp (the phone number you want to use for sending)
6. Wait for "Authorized" status

**Note**: The WhatsApp number you scan with will be the "from" number for all messages.

### Step 2: Restart Your Development Server

After creating `.env.local`, restart your server:

```bash
# Stop current server (Ctrl+C)
npm run dev
```

### Step 3: Test with a Real Order

1. Go to your website
2. Add items to cart
3. Go to checkout
4. Fill in the form with:
   - **Email**: A valid email you can check (for customer email)
   - **Phone**: A phone number in international format: `+256755915549` (for WhatsApp)
5. Complete the order

### Step 4: Check Results

**Email:**
- ✅ Check customer email inbox (should receive email with receipt attachment)
- ✅ Check admin email: `jerrylarubafestus@gmail.com` (should receive order notification)

**WhatsApp:**
- ✅ Check customer WhatsApp (if phone number is valid and on WhatsApp)
- ✅ Check admin WhatsApp (the number you linked to Green API)

**Console Logs:**
- Open browser console (F12) and check for:
  - "Email sent via SMTP"
  - "WhatsApp message sent via Green API"

## 🚨 Troubleshooting

### Email Not Sending

**Error: "Invalid login"**
- Verify the App Password is correct (no spaces)
- Make sure 2-Step Verification is enabled on Gmail
- Regenerate app password if needed

**Error: "Connection timeout"**
- Check your internet connection
- Verify SMTP settings are correct
- Try port 465 with `secure: true`

**Emails going to spam:**
- Send a few test emails first
- Ask recipients to mark as "Not Spam"
- Consider using a custom domain email

### WhatsApp Not Sending

**Error: "Instance not authorized"**
- You MUST scan the QR code in Green API dashboard first
- Make sure your WhatsApp is linked to the instance
- Check Green API dashboard for authorization status

**Error: "Phone number not found"**
- Phone number must be in international format: `+256755915549`
- Remove spaces, dashes, parentheses
- Make sure the number is on WhatsApp

**Error: "HTTP 400" or "HTTP 401"**
- Verify your API token is correct
- Check that instance ID matches
- Make sure instance is active in Green API dashboard

**No error but message not received:**
- Check Green API dashboard → **Logs** section
- Verify the phone number format
- Make sure recipient's phone is on WhatsApp

## 📊 Check Green API Status

1. Go to: https://console.green-api.com
2. Click on your instance (7105395254)
3. Check:
   - **State**: Should be "Authorized" (green)
   - **Logs**: Check for any errors
   - **Statistics**: See message counts

## 🔍 Debug Information

The system logs detailed information. Check:

**Browser Console (F12):**
- Email sending status
- WhatsApp sending status
- Any error messages

**Server Terminal:**
- SMTP connection status
- Green API response
- Detailed error messages

## ✅ Success Indicators

You'll know it's working when:

1. **Email:**
   - Customer receives email with subject: "Order Confirmed - [ORDER_ID]"
   - Email includes receipt as PNG attachment
   - Admin receives email with order details

2. **WhatsApp:**
   - Customer receives WhatsApp message with order confirmation
   - Admin receives WhatsApp message with order notification
   - Messages appear in Green API dashboard logs

## 🎯 Next Steps

Once testing is successful:
1. Monitor first few real orders
2. Check email deliverability
3. Verify WhatsApp messages are received
4. Set up error monitoring/alerts if needed

---

**Need Help?**
- Green API Docs: https://green-api.com/docs/
- Gmail SMTP Help: https://support.google.com/mail/answer/7126229

