import QRCode from 'qrcode'

export interface QRCodeOptions {
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  margin?: number
  width?: number
  color?: {
    dark?: string
    light?: string
  }
}

export async function generateQRCode(
  url: string,
  options: QRCodeOptions = {}
): Promise<string> {
  try {
    const defaultOptions: QRCodeOptions = {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    }

    const qrOptions = { ...defaultOptions, ...options }

    const dataUrl = await QRCode.toDataURL(url, qrOptions)
    return dataUrl
  } catch (error) {
    console.error('Error generating QR code:', error)
    throw new Error('Failed to generate QR code')
  }
}

export async function generateQRCodeBuffer(
  url: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  try {
    const defaultOptions: QRCodeOptions = {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 512,
    }

    const qrOptions = { ...defaultOptions, ...options }

    const buffer = await QRCode.toBuffer(url, qrOptions)
    return buffer
  } catch (error) {
    console.error('Error generating QR code buffer:', error)
    throw new Error('Failed to generate QR code')
  }
}

export function getPageQRCodeUrl(username: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  return `${baseUrl}/${username}`
}
