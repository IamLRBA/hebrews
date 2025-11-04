# WhatsApp & Email Integration Setup Guide

This guide explains how to set up email and WhatsApp notifications for order confirmations.

## Email Setup

### Option 1: Using SendGrid (Recommended)

1. Sign up for a SendGrid account at https://sendgrid.com
2. Create an API key
3. Add to your `.env.local`:
   ```
   SENDGRID_API_KEY=your_sendgrid_api_key
   FROM_EMAIL=noreply@yourdomain.com
   ```

4. Update `app/api/send-email/route.ts`:
   ```typescript
   import sgMail from '@sendgrid/mail'
   
   sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
   
   await sgMail.send({
     to: emailConfig.to,
     from: process.env.FROM_EMAIL!,
     subject: emailConfig.subject,
     text: emailConfig.text,
     html: emailConfig.html
   })
   ```

### Option 2: Using Nodemailer with SMTP

1. Add SMTP credentials to `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   FROM_EMAIL=your-email@gmail.com
   ```

2. Install nodemailer:
   ```bash
   npm install nodemailer
   ```

3. Update `app/api/send-email/route.ts` with the Nodemailer example code.

## WhatsApp Setup

### Option 1: Using Twilio WhatsApp API (Recommended for Production)

1. Sign up for a Twilio account at https://www.twilio.com
2. Get your WhatsApp-enabled number
3. Add to your `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   ```

4. Install Twilio SDK:
   ```bash
   npm install twilio
   ```

5. Update `app/api/send-whatsapp/route.ts` with the Twilio example code.

### Option 2: Using WhatsApp Business API (Meta)

1. Create a Meta Business account
2. Set up WhatsApp Business API
3. Get your access token and phone number ID
4. Add to your `.env.local`:
   ```
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   ```

5. Update `app/api/send-whatsapp/route.ts` with the WhatsApp Business API example code.

### Option 3: Using Green API

1. Sign up at https://green-api.com
2. Get your API credentials
3. Add to your `.env.local`:
   ```
   GREEN_API_ID_INSTANCE=your_instance_id
   GREEN_API_TOKEN_INSTANCE=your_token
   ```

4. Update `app/api/send-whatsapp/route.ts` to use Green API.

### Option 4: Manual WhatsApp (Current Fallback)

The current implementation generates WhatsApp Web links that can be opened manually. This is useful for testing but not scalable for production.

## Configuration

### Business Contact Information

Update the business WhatsApp number in `lib/whatsapp/notifications.ts`:
```typescript
private static BUSINESS_PHONE = '+256755915549' // Your business WhatsApp number
```

Update the business email in `lib/emails/templates.ts`:
```typescript
to: 'jerrylarubafestus@gmail.com', // Your business email
```

## Testing

1. Place a test order
2. Check the console logs for email and WhatsApp message details
3. Verify emails are received
4. Verify WhatsApp messages are sent (if API is configured)

## Notes

- WhatsApp messages are sent to customers only if their phone number is detected as being on WhatsApp
- Business notifications are always sent via both email and WhatsApp
- Customer notifications are sent via email and WhatsApp (if available)
- All notifications are sent asynchronously and won't block order confirmation

## Troubleshooting

### Emails not sending
- Check API credentials in `.env.local`
- Verify SMTP/API service is active
- Check server logs for errors

### WhatsApp messages not sending
- Verify API credentials are correct
- Check phone number format (must be international format: +256...)
- Ensure WhatsApp Business API is approved and active
- For testing, use the WhatsApp Web link fallback

## Production Checklist

- [ ] Configure email service (SendGrid/SMTP/etc.)
- [ ] Configure WhatsApp service (Twilio/WhatsApp Business API/etc.)
- [ ] Update business contact information
- [ ] Test email delivery
- [ ] Test WhatsApp delivery
- [ ] Set up error monitoring
- [ ] Configure rate limiting for API routes
- [ ] Add authentication to API routes if needed

