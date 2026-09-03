export function formatWhatsAppNumber(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, '')
}

export function createWhatsAppLink(
  phoneNumber: string,
  message?: string
): string {
  const cleanNumber = formatWhatsAppNumber(phoneNumber)
  
  if (!cleanNumber) {
    throw new Error('Invalid phone number')
  }

  const baseUrl = 'https://wa.me/'
  const encodedMessage = message ? `?text=${encodeURIComponent(message)}` : ''
  
  return `${baseUrl}${cleanNumber}${encodedMessage}`
}

export function createProductWhatsAppMessage(
  productName: string,
  price?: number,
  currency?: string
): string {
  let message = `Hi! I'm interested in ${productName}`
  
  if (price && currency) {
    message += ` (${currency} ${price})`
  }
  
  message += '. Could you provide more details?'
  
  return message
}

export function createServiceWhatsAppMessage(
  serviceName: string,
  duration?: string
): string {
  let message = `Hi! I'd like to book ${serviceName}`
  
  if (duration) {
    message += ` (${duration})`
  }
  
  message += '. When are you available?'
  
  return message
}

export function isValidWhatsAppNumber(phoneNumber: string): boolean {
  const cleanNumber = formatWhatsAppNumber(phoneNumber)
  return /^\d{10,15}$/.test(cleanNumber)
}
