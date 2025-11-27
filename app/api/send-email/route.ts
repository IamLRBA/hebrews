import { NextRequest, NextResponse } from 'next/server'
import type { EmailConfig } from '@/lib/emails/templates'

export async function POST(request: NextRequest) {
  try {
    const emailConfig: EmailConfig = await request.json()
    
    // Check if SendGrid is configured
    if (!process.env.SENDGRID_API_KEY) {
      console.warn('SENDGRID_API_KEY not configured. Email will be logged only.')
      console.log('Email details:', {
        to: emailConfig.to,
        subject: emailConfig.subject,
        hasAttachment: !!emailConfig.attachment
      })
      return NextResponse.json({ 
        success: true, 
        message: 'Email logged (SendGrid not configured)' 
      })
    }

    // Import SendGrid
    const sgMail = require('@sendgrid/mail')
    sgMail.setApiKey(process.env.SENDGRID_API_KEY)
    
    // Prepare email data
    const fromEmail = process.env.FROM_EMAIL || 'noreply@mysticalpieces.com'
    const fromName = process.env.FROM_NAME || 'Mystical PIECES'
    
    // Prepare attachments if provided
    const attachments = emailConfig.attachment ? [{
      content: emailConfig.attachment.content,
      filename: emailConfig.attachment.filename,
      type: emailConfig.attachment.type,
      disposition: 'attachment'
    }] : []
    
    // Send email via SendGrid
    await sgMail.send({
      to: emailConfig.to,
      from: {
        email: fromEmail,
        name: fromName
      },
      subject: emailConfig.subject,
      text: emailConfig.text,
      html: emailConfig.html,
      attachments
    })
    
    console.log('Email sent successfully:', {
      to: emailConfig.to,
      subject: emailConfig.subject,
      hasAttachment: !!emailConfig.attachment
    })
    
    return NextResponse.json({ success: true, message: 'Email sent successfully' })
  } catch (error: any) {
    console.error('Error sending email:', error)
    
    // Provide more detailed error information
    const errorMessage = error.response?.body?.errors?.[0]?.message || error.message || 'Failed to send email'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

