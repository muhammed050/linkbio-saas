export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function generateUsername(fullName: string): string {
  const slug = slugify(fullName)
  const randomSuffix = Math.floor(Math.random() * 1000)
  return `${slug}${randomSuffix}`
}

export function isValidSlug(slug: string): boolean {
  const slugRegex = /^[a-z0-9-]+$/
  return slugRegex.test(slug)
}

export function normalizeSlug(slug: string): string {
  return slugify(slug)
}
