// Notification system utilities
export interface Notification {
  id: string
  userId: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message: string
  read: boolean
  createdAt: Date
  actionUrl?: string
}

export class NotificationService {
  // Email notification (mock implementation)
  static async sendEmail(to: string, subject: string, content: string) {
    // console.log(`📧 Email to ${to}: ${subject}`)
    // console.log(content)
    // In production, integrate with email service like SendGrid, AWS SES, etc.
    return true
  }

  // SMS notification (mock implementation)
  static async sendSMS(to: string, message: string) {
    // console.log(`📱 SMS to ${to}: ${message}`)
    // In production, integrate with SMS service like Twilio, AWS SNS, etc.
    return true
  }

  // Push notification (mock implementation)
  static async sendPush(userId: string, title: string, body: string) {
    // console.log(`🔔 Push to ${userId}: ${title} - ${body}`)
    // In production, integrate with Firebase Cloud Messaging, etc.
    return true
  }

  // Create in-app notification
  static async createNotification(notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) {
    // In production, save to database
    // console.log(`📬 Notification for ${notification.userId}: ${notification.title}`)
    return {
      id: `notif-${Date.now()}`,
      ...notification,
      read: false,
      createdAt: new Date()
    }
  }

  // Subscription-related notifications
  static async notifySubscriptionCreated(customerId: string, subscriptionId: string) {
    await this.sendEmail(
      'customer@example.com', // Get from customer record
      'Subscription Created Successfully',
      `Your AgroTrack+ subscription has been created. You'll receive fresh produce weekly.`
    )
  }

  static async notifySubscriptionModified(customerId: string, subscriptionId: string) {
    await this.sendEmail(
      'customer@example.com',
      'Subscription Updated',
      `Your subscription has been updated successfully.`
    )
  }

  // Order-related notifications
  static async notifyOrderConfirmed(customerId: string, orderId: string) {
    await this.sendEmail(
      'customer@example.com',
      'Order Confirmed',
      `Your order #${orderId.slice(-8)} has been confirmed and is being prepared.`
    )
  }

  static async notifyOrderDelivered(customerId: string, orderId: string) {
    await this.sendEmail(
      'customer@example.com',
      'Order Delivered',
      `Your order #${orderId.slice(-8)} has been delivered. Enjoy your fresh produce!`
    )
  }

  // Farmer-related notifications
  static async notifyFarmerApproved(farmerId: string) {
    await this.sendEmail(
      'farmer@example.com',
      'Welcome to AgroTrack+',
      `Congratulations! Your farmer account has been approved. You can now start listing products.`
    )
  }

  static async notifyDeliveryRequirement(farmerId: string, deliveryDate: Date, products: any[]) {
    const productList = products.map(p => `${p.quantity} ${p.unit} of ${p.name}`).join(', ')
    
    await this.sendEmail(
      'farmer@example.com',
      'Delivery Requirement - 48 Hour Notice',
      `You have a delivery scheduled for ${deliveryDate.toLocaleDateString()}. Required: ${productList}`
    )
  }

  static async notifyQCResults(farmerId: string, results: any) {
    const acceptanceRate = (results.acceptedQuantity / (results.acceptedQuantity + results.rejectedQuantity)) * 100
    
    await this.sendEmail(
      'farmer@example.com',
      'Quality Control Results',
      `Your recent delivery had a ${acceptanceRate.toFixed(1)}% acceptance rate. ${results.rejectionReasons.length > 0 ? 'Issues: ' + results.rejectionReasons.join(', ') : 'Great quality!'}`
    )
  }

  // Admin notifications
  static async notifyNewFarmerRegistration(farmerId: string, farmerName: string) {
    await this.sendEmail(
      'admin@agrotrack.com',
      'New Farmer Registration',
      `${farmerName} has registered as a farmer and is pending approval.`
    )
  }

  static async notifyLowInventory(productId: string, productName: string, currentStock: number) {
    await this.sendEmail(
      'operations@agrotrack.com',
      'Low Inventory Alert',
      `${productName} is running low (${currentStock} units remaining). Consider adjusting procurement.`
    )
  }
}