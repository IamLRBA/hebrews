import type { Order } from '@/lib/cart'

export interface EmailConfig {
  to: string
  subject: string
  html: string
  text: string
}

export class EmailTemplates {
  static buyerConfirmation(order: Order): EmailConfig {
    const subject = `Order Confirmed - ${order.id} - MysteryPieces`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6F4E37 0%, #8B7A5A 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6F4E37; }
    .order-item { padding: 15px; border-bottom: 1px solid #e5e7eb; }
    .order-item:last-child { border-bottom: none; }
    .total { font-size: 20px; font-weight: bold; color: #6F4E37; margin-top: 15px; }
    .footer { background: #374151; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
    .button { display: inline-block; background: #6F4E37; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmed! 🎉</h1>
      <p>Thank you for shopping with MysteryPieces</p>
    </div>
    
    <div class="content">
      <p>Dear ${order.customer.fullName},</p>
      
      <p>We're thrilled to confirm your order! Your order has been received and is being processed.</p>
      
      <div class="order-info">
        <h2>Order Details</h2>
        <p><strong>Order Number:</strong> ${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
      </div>
      
      <h3>Items Ordered:</h3>
      ${order.items.map(item => `
        <div class="order-item">
          <strong>${item.name}</strong> - ${item.sku}<br>
          ${item.size ? `Size: ${item.size} | ` : ''}
          ${item.color ? `Color: ${item.color} | ` : ''}
          Quantity: ${item.quantity}<br>
          <strong>UGX ${(item.price * item.quantity).toLocaleString()}</strong>
        </div>
      `).join('')}
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
          <span>Subtotal:</span>
          <span>UGX ${order.subtotal.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
          <span>Delivery Fee:</span>
          <span>${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #6F4E37;">
          <span class="total">Total:</span>
          <span class="total">UGX ${order.total.toLocaleString()}</span>
        </div>
      </div>
      
      <div class="order-info">
        <h3>Delivery Information</h3>
        <p><strong>Name:</strong> ${order.customer.fullName}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
        <p><strong>Address:</strong> ${order.customer.address.street}, ${order.customer.address.city}</p>
        ${order.notes ? `<p><strong>Notes:</strong> ${order.notes}</p>` : ''}
      </div>
      
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>💳 Payment:</strong> Cash on Delivery</p>
        <p style="margin: 10px 0 0 0;"><strong>📦 Delivery:</strong> Expected within 2-3 business days</p>
      </div>
      
      <p>You will receive another email when your order is dispatched.</p>
      
      <p>If you have any questions, please don't hesitate to contact us.</p>
      
      <p>Thank you for choosing MysteryPieces!</p>
    </div>
    
    <div class="footer">
      <p>MysteryPieces | Thrifted Fashion & Style Curators</p>
      <p>Email: jerrylarubafestus@gmail.com | Phone: +256 755 915 549</p>
      <p>© ${new Date().getFullYear()} MysteryPieces. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
    
    const text = `
Order Confirmed - MysteryPieces

Dear ${order.customer.fullName},

Thank you for your order! Your order has been received and is being processed.

Order Details:
- Order Number: ${order.id}
- Order Date: ${new Date(order.timestamp).toLocaleDateString()}
- Status: ${order.status.toUpperCase()}

Items Ordered:
${order.items.map(item => `
  ${item.name} - ${item.sku}
  ${item.size ? `Size: ${item.size} | ` : ''}
  ${item.color ? `Color: ${item.color} | ` : ''}
  Quantity: ${item.quantity}
  Price: UGX ${(item.price * item.quantity).toLocaleString()}
`).join('\n')}

Order Summary:
- Subtotal: UGX ${order.subtotal.toLocaleString()}
- Delivery Fee: ${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}
- Total: UGX ${order.total.toLocaleString()}

Delivery Information:
- Name: ${order.customer.fullName}
- Phone: ${order.customer.phone}
- Address: ${order.customer.address.street}, ${order.customer.address.city}
${order.notes ? `- Notes: ${order.notes}` : ''}

Payment: Cash on Delivery
Delivery: Expected within 2-3 business days

Thank you for choosing MysteryPieces!

MysteryPieces
Email: jerrylarubafestus@gmail.com
Phone: +256 755 915 549
    `
    
    return {
      to: order.customer.email,
      subject,
      html: html.trim(),
      text: text.trim()
    }
  }

  static sellerNotification(order: Order): EmailConfig {
    const subject = `New Order Received - ${order.id} - MysteryPieces`
    
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #dc2626; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
    .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
    .order-item { padding: 15px; border-bottom: 1px solid #e5e7eb; }
    .order-item:last-child { border-bottom: none; }
    .total { font-size: 20px; font-weight: bold; color: #dc2626; margin-top: 15px; }
    .footer { background: #374151; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px; }
    .urgent { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Order Received!</h1>
      <p>Action Required</p>
    </div>
    
    <div class="content">
      <div class="urgent">
        <p style="margin: 0;"><strong>⚠️ URGENT:</strong> A new order has been placed and requires your attention.</p>
      </div>
      
      <div class="order-info">
        <h2>Order Details</h2>
        <p><strong>Order Number:</strong> ${order.id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.timestamp).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
      </div>
      
      <div class="order-info">
        <h3>Customer Information</h3>
        <p><strong>Name:</strong> ${order.customer.fullName}</p>
        <p><strong>Email:</strong> ${order.customer.email}</p>
        <p><strong>Phone:</strong> ${order.customer.phone}</p>
      </div>
      
      <h3>Delivery Information</h3>
      <div class="order-info">
        <p><strong>Address:</strong> ${order.customer.address.street}, ${order.customer.address.city}</p>
        <p><strong>Delivery Option:</strong> ${order.deliveryOption === 'kampala' ? 'Kampala (Free)' : `Outside Kampala (Fee: UGX ${order.deliveryFee.toLocaleString()})`}</p>
        ${order.notes ? `<p><strong>Special Instructions:</strong> ${order.notes}</p>` : ''}
      </div>
      
      <h3>Items Ordered:</h3>
      ${order.items.map(item => `
        <div class="order-item">
          <strong>${item.name}</strong> - ${item.sku}<br>
          ${item.size ? `Size: ${item.size} | ` : ''}
          ${item.color ? `Color: ${item.color} | ` : ''}
          Quantity: ${item.quantity}<br>
          <strong>UGX ${(item.price * item.quantity).toLocaleString()}</strong>
        </div>
      `).join('')}
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 20px;">
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
          <span>Subtotal:</span>
          <span>UGX ${order.subtotal.toLocaleString()}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 5px 0;">
          <span>Delivery Fee:</span>
          <span>${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}</span>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 15px 0; border-top: 2px solid #dc2626;">
          <span class="total">Total:</span>
          <span class="total">UGX ${order.total.toLocaleString()}</span>
        </div>
      </div>
      
      <div style="background: #dbeafe; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 4px;">
        <p style="margin: 0;"><strong>📋 Next Steps:</strong></p>
        <ol style="margin: 10px 0 0 20px; padding: 0;">
          <li>Verify the order details</li>
          <li>Prepare the items for dispatch</li>
          <li>Contact the customer to confirm delivery</li>
          <li>Update order status</li>
        </ol>
      </div>
    </div>
    
    <div class="footer">
      <p>MysteryPieces | Admin Notification</p>
      <p>© ${new Date().getFullYear()} MysteryPieces. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
    `
    
    const text = `
New Order Received - MysteryPieces

URGENT: A new order has been placed and requires your attention.

Order Details:
- Order Number: ${order.id}
- Order Date: ${new Date(order.timestamp).toLocaleDateString()}
- Status: ${order.status.toUpperCase()}

Customer Information:
- Name: ${order.customer.fullName}
- Email: ${order.customer.email}
- Phone: ${order.customer.phone}

Delivery Information:
- Address: ${order.customer.address.street}, ${order.customer.address.city}
- Delivery Option: ${order.deliveryOption === 'kampala' ? 'Kampala (Free)' : `Outside Kampala (Fee: UGX ${order.deliveryFee.toLocaleString()})`}
${order.notes ? `- Special Instructions: ${order.notes}` : ''}

Items Ordered:
${order.items.map(item => `
  ${item.name} - ${item.sku}
  ${item.size ? `Size: ${item.size} | ` : ''}
  ${item.color ? `Color: ${item.color} | ` : ''}
  Quantity: ${item.quantity}
  Price: UGX ${(item.price * item.quantity).toLocaleString()}
`).join('\n')}

Order Summary:
- Subtotal: UGX ${order.subtotal.toLocaleString()}
- Delivery Fee: ${order.deliveryFee === 0 ? 'Free' : `UGX ${order.deliveryFee.toLocaleString()}`}
- Total: UGX ${order.total.toLocaleString()}

Next Steps:
1. Verify the order details
2. Prepare the items for dispatch
3. Contact the customer to confirm delivery
4. Update order status
    `
    
    return {
      to: 'jerrylarubafestus@gmail.com', // Business email
      subject,
      html: html.trim(),
      text: text.trim()
    }
  }

  // Helper function to send emails via API
  static async sendEmail(config: EmailConfig): Promise<boolean> {
    try {
      // Send email via API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to send email:', error)
        return false
      }
      
      const result = await response.json()
      console.log('Email sent successfully:', {
        to: config.to,
        subject: config.subject
      })
      
      return result.success
    } catch (error) {
      console.error('Error sending email:', error)
      // Fallback: log email details for manual sending
      console.log('Email details (manual send):', {
        to: config.to,
        subject: config.subject,
        textPreview: config.text.substring(0, 100) + '...'
      })
      return false
    }
  }
}

