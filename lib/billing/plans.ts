export type BillingPlanCode = 'free' | 'pro' | 'business'
export type PaidBillingPlanCode = Exclude<BillingPlanCode, 'free'>

export interface PlanLimits {
  links: number
  products: number
  services: number
  sections: number
  customDomain: boolean
  analytics: boolean
  qrCode: boolean
  seoMetadata: boolean
}

export interface PlanInfo {
  name: string
  priceCents: number
  currency: string
  billingInterval: 'month'
  features: string[]
}

export const PLAN_LIMITS: Record<BillingPlanCode, PlanLimits> = {
  free: { links: 5, products: 0, services: 0, sections: 2, customDomain: false, analytics: false, qrCode: false, seoMetadata: false },
  pro: { links: -1, products: -1, services: -1, sections: -1, customDomain: true, analytics: true, qrCode: true, seoMetadata: true },
  business: { links: -1, products: -1, services: -1, sections: -1, customDomain: true, analytics: true, qrCode: true, seoMetadata: true },
}

export const PLAN_INFO: Record<BillingPlanCode, PlanInfo> = {
  free: { name: 'Free', priceCents: 0, currency: 'USD', billingInterval: 'month', features: ['5 links', '2 sections'] },
  pro: { name: 'Pro', priceCents: 2900, currency: 'USD', billingInterval: 'month', features: ['Unlimited content', 'Analytics', 'Custom domain'] },
  business: { name: 'Business', priceCents: 7900, currency: 'USD', billingInterval: 'month', features: ['Unlimited content', 'Analytics', 'Custom domain'] },
}

const WHOP_ENV_BY_PLAN: Record<PaidBillingPlanCode, 'WHOP_PLAN_PRO' | 'WHOP_PLAN_BUSINESS'> = {
  pro: 'WHOP_PLAN_PRO',
  business: 'WHOP_PLAN_BUSINESS',
}

export function isPaidBillingPlan(value: unknown): value is PaidBillingPlanCode {
  return value === 'pro' || value === 'business'
}

export function getPlanLimits(planType: BillingPlanCode): PlanLimits {
  return PLAN_LIMITS[planType]
}

export function getWhopPlanId(plan: PaidBillingPlanCode): string {
  const value = process.env[WHOP_ENV_BY_PLAN[plan]]?.trim()
  if (!value) throw new Error(`${WHOP_ENV_BY_PLAN[plan]} is not configured`)
  return value
}

export function getPlanFromWhopPlanId(planId: string): PaidBillingPlanCode | null {
  for (const plan of ['pro', 'business'] as const) {
    if (getWhopPlanId(plan) === planId) return plan
  }
  return null
}

export function canAddLink(planType: BillingPlanCode, currentCount: number) {
  const limit = getPlanLimits(planType).links
  return limit === -1 || currentCount < limit
}

export function canAddProduct(planType: BillingPlanCode, currentCount: number) {
  const limit = getPlanLimits(planType).products
  return limit === -1 || currentCount < limit
}

export function canAddService(planType: BillingPlanCode, currentCount: number) {
  const limit = getPlanLimits(planType).services
  return limit === -1 || currentCount < limit
}

export function canAddSection(planType: BillingPlanCode, currentCount: number) {
  const limit = getPlanLimits(planType).sections
  return limit === -1 || currentCount < limit
}

export function hasFeature(planType: BillingPlanCode, feature: keyof PlanLimits) {
  const value = getPlanLimits(planType)[feature]
  return typeof value === 'boolean' ? value : value !== 0
}

export function getRemainingCount(planType: BillingPlanCode, limitType: 'links' | 'products' | 'services' | 'sections', currentCount: number) {
  const limit = getPlanLimits(planType)[limitType]
  return limit === -1 ? null : Math.max(0, limit - currentCount)
}
