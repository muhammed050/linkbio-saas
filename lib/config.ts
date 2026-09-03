export function getSiteUrl(): URL {
  const value = process.env.NEXT_PUBLIC_SITE_URL

  if (!value) throw new Error('NEXT_PUBLIC_SITE_URL is not configured')

  const url = new URL(value)
  const isLocalhost = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
  if (url.protocol !== 'https:' && !(isLocalhost && url.protocol === 'http:')) {
    throw new Error('NEXT_PUBLIC_SITE_URL must use HTTPS outside local development')
  }

  return url
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}
