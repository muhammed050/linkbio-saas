const RESERVED_USERNAMES = [
  'admin',
  'api',
  'app',
  'auth',
  'blog',
  'dashboard',
  'docs',
  'help',
  'home',
  'login',
  'logout',
  'pricing',
  'privacy',
  'settings',
  'signup',
  'support',
  'terms',
  'www',
  'about',
  'contact',
  'features',
  'explore',
  'public',
  'static',
  'assets',
  'images',
  'styles',
  'scripts',
]

export function isValidUsername(username: string): boolean {
  if (!username || username.length < 3 || username.length > 30) {
    return false
  }

  const usernameRegex = /^[a-z0-9_-]+$/
  return usernameRegex.test(username.toLowerCase())
}

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.includes(username.toLowerCase())
}

export function validateUsername(username: string): string | null {
  if (!username) {
    return 'Username is required'
  }

  if (username.length < 3) {
    return 'Username must be at least 3 characters'
  }

  if (username.length > 30) {
    return 'Username must be less than 30 characters'
  }

  if (!isValidUsername(username)) {
    return 'Username can only contain lowercase letters, numbers, hyphens, and underscores'
  }

  if (isReservedUsername(username)) {
    return 'This username is reserved'
  }

  return null
}

export function normalizeUsername(username: string): string {
  return username.toLowerCase().trim()
}
