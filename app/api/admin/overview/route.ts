import { AdminAccessError, requireAdmin } from '@/lib/auth/admin'
import { getAdminOverview } from '@/lib/admin/data'

export const runtime = 'nodejs'

export async function GET() {
  try {
    await requireAdmin()
    return Response.json(await getAdminOverview())
  } catch (error) {
    if (error instanceof AdminAccessError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    console.error('Admin overview query failed:', error)
    return Response.json({ error: 'Unable to load administrator data' }, { status: 503 })
  }
}
