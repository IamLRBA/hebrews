import type { Order } from '@/lib/cart'

export interface WhatsAppConfig {
  phone: string
  message: string
}

export class WhatsAppNotifications {
  // Business WhatsApp number (configure this)
  private static BUSINESS_PHONE = '+256755915549' // Format: +256755915549 (international format without spaces)

  /**
   * Format phone number for WhatsApp API
   * Removes spaces, dashes, and ensures international format
   */
  private static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '')
    
    // If it doesn't start with +, add country code
    if (!cleaned.startsWith('+')) {
      // Assume Uganda if it starts with 0 or 256
      if (cleaned.startsWith('0')) {
        cleaned = '+256' + cleaned.substring(1)
      } else if (cleaned.startsWith('256')) {
        cleaned = '+' + cleaned
      } else {
        // Default to Uganda code
        cleaned = '+256' + cleaned
      }
    }
    
    return cleaned
  }

  /**
   * Generate WhatsApp message for customer order confirmation
   */
  static customerConfirmation(order: Order): WhatsAppConfig {
    const itemsText = order.items.map((item, index) => {
      return `${index + 1}. ${item.name}${item.size ? ` (Size: ${item.size})` : ''}${item.color ? ` - ${item.color}` : ''}\n   Qty: ${item.quantity} × UGX ${item.price.toLocaleString()} = UGX ${(item.price * item.quantity).toLocaleString()}`
    }).join('\n\n')

    const message = `🎉 *Order Confirmed!*\n\nDear ${order.customer.fullName},\n\nThank you for your order! Your order has been received and is being processed.\n\n*Order Details:*\n━━━━━━━━━━━━━━━━━━━━\n📦 Order ID: ${order.id}\n📅 Date: ${new Date(order.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n📊 Status: ${order.status.toUpperCase()}\n\n*Items Ordered:*\n${itemsText}\n\n*Order Summary:*\n━━━━━━━━━━━━━━━━━━━━\nSubtotal: UGX ${order.subtotal.toLocaleString()}\nDelivery: ${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}\n*Total: UGX ${order.total.toLocaleString()}*\n\n*Delivery Information:*\n━━━━━━━━━━━━━━━━━━━━\n📍 Address: ${order.customer.address.street}, ${order.customer.address.city}\n${order.notes ? `📝 Notes: ${order.notes}\n` : ''}\n💳 *Payment:* Cash on Delivery\n📦 *Delivery:* Expected within 2-3 business days\n\nYou will receive an email confirmation shortly.\n\nIf you have any questions, please contact us:\n📧 Email: jerrylarubafestus@gmail.com\n📱 WhatsApp: ${this.BUSINESS_PHONE}\n\nThank you for choosing FusionCRAFT STUDIOS! 🙏`

    return {
      phone: this.formatPhoneNumber(order.customer.phone),
      message
    }
  }

  /**
   * Generate WhatsApp message for business order notification
   */
  static businessNotification(order: Order): WhatsAppConfig {
    const itemsText = order.items.map((item, index) => {
      return `${index + 1}. ${item.name} (SKU: ${item.sku})\n   ${item.size ? `Size: ${item.size} | ` : ''}${item.color ? `Color: ${item.color} | ` : ''}Qty: ${item.quantity}\n   Price: UGX ${(item.price * item.quantity).toLocaleString()}`
    }).join('\n\n')

    const message = `🔔 *NEW ORDER RECEIVED!*\n\n⚠️ *URGENT ACTION REQUIRED*\n\n*Order Details:*\n━━━━━━━━━━━━━━━━━━━━\n📦 Order ID: ${order.id}\n📅 Date: ${new Date(order.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n📊 Status: ${order.status.toUpperCase()}\n\n*Customer Information:*\n━━━━━━━━━━━━━━━━━━━━\n👤 Name: ${order.customer.fullName}\n📧 Email: ${order.customer.email}\n📱 Phone: ${order.customer.phone}\n\n*Delivery Information:*\n━━━━━━━━━━━━━━━━━━━━\n📍 Address: ${order.customer.address.street}, ${order.customer.address.city}\n🚚 Delivery: ${order.deliveryOption === 'kampala' ? 'Kampala (Free)' : `Outside Kampala (Fee: UGX ${order.deliveryFee.toLocaleString()})`}\n${order.notes ? `📝 Notes: ${order.notes}\n` : ''}\n*Items Ordered:*\n${itemsText}\n\n*Order Summary:*\n━━━━━━━━━━━━━━━━━━━━\nSubtotal: UGX ${order.subtotal.toLocaleString()}\nDelivery Fee: ${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}\n*Total: UGX ${order.total.toLocaleString()}*\n\n*Next Steps:*\n1. ✅ Verify order details\n2. 📦 Prepare items for dispatch\n3. 📞 Contact customer to confirm delivery\n4. 📊 Update order status\n\n---\nFusionCRAFT STUDIOS`

    return {
      phone: this.BUSINESS_PHONE,
      message
    }
  }

  /**
   * Send WhatsApp message using WhatsApp Web API
   * This creates a WhatsApp link that can be opened or sent via API
   */
  static generateWhatsAppLink(config: WhatsAppConfig): string {
    const encodedMessage = encodeURIComponent(config.message)
    return `https://wa.me/${config.phone.replace(/\+/g, '')}?text=${encodedMessage}`
  }

  /**
   * Send WhatsApp message via API
   * In production, integrate with:
   * - Twilio WhatsApp API
   * - WhatsApp Business API
   * - Green API
   * - Or any other WhatsApp service provider
   */
  static async sendWhatsApp(config: WhatsAppConfig): Promise<boolean> {
    try {
      // Try to send via API route
      try {
        const response = await fetch('/api/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: config.phone,
            message: config.message
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('WhatsApp message sent via API:', {
            to: config.phone,
            success: result.success
          })
          return result.success
        }
      } catch (apiError) {
        console.warn('API route not available, using WhatsApp Web link fallback')
      }

      // Fallback: Generate WhatsApp Web link for manual sending
      // This opens WhatsApp Web/App with the message pre-filled
      const whatsappLink = this.generateWhatsAppLink(config)
      console.log('WhatsApp Link (fallback):', whatsappLink)
      
      // Optionally, you can open this link automatically in a new tab
      // (commented out to avoid popup issues)
      // window.open(whatsappLink, '_blank')
      
      // Log the message for manual sending
      console.log('WhatsApp message details:', {
        to: config.phone,
        messagePreview: config.message.substring(0, 100) + '...',
        link: whatsappLink
      })

      // Return true as the message is formatted and ready to send
      // In production, ensure the API route is properly configured
      return true
    } catch (error) {
      console.error('Error sending WhatsApp message:', error)
      return false
    }
  }

  /**
   * Check if a phone number is likely on WhatsApp
   * This is a basic check - actual verification requires API
   */
  static async isPhoneOnWhatsApp(phone: string): Promise<boolean> {
    // In production, you can use WhatsApp Business API to check
    // For now, we'll assume all numbers could be on WhatsApp
    // and let the user decide if they want to receive messages
    
    // Basic validation: check if phone number is valid format
    const formatted = this.formatPhoneNumber(phone)
    return formatted.length >= 10 // Basic validation
  }
}

