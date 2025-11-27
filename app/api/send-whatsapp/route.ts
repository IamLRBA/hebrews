import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { phone, message } = await request.json()
    
    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Phone and message are required' },
        { status: 400 }
      )
    }
    
    // Check if Twilio is configured
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_WHATSAPP_NUMBER) {
      console.warn('Twilio credentials not configured. WhatsApp message will be logged only.')
      console.log('WhatsApp message details:', {
        to: phone,
        messagePreview: message.substring(0, 100) + '...'
      })
      return NextResponse.json({ 
        success: true, 
        message: 'WhatsApp message logged (Twilio not configured)' 
      })
    }

    // Import Twilio
    const twilio = require('twilio')
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    )
    
    // Format phone number (ensure it starts with whatsapp:)
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER.startsWith('whatsapp:')
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`
    
    const toNumber = phone.startsWith('whatsapp:')
      ? phone
      : `whatsapp:${phone}`
    
    // Send WhatsApp message via Twilio
    const result = await client.messages.create({
      from: fromNumber,
      to: toNumber,
      body: message
    })
    
    console.log('WhatsApp message sent successfully:', {
      to: phone,
      messageSid: result.sid,
      status: result.status
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'WhatsApp message sent successfully',
      messageSid: result.sid
    })
  } catch (error: any) {
    console.error('Error sending WhatsApp message:', error)
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Failed to send WhatsApp message'
    const errorCode = error.code || error.status
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

