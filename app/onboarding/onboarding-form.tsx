'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { completeOnboarding } from './actions'

export default function OnboardingForm({ email }: { email: string }) {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await completeOnboarding({ username, displayName })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/dashboard')
      router.refresh()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
        <div>
          <p className="text-sm text-muted-foreground">{email}</p>
          <h1 className="text-3xl font-bold">Create your LinkBio</h1>
          <p className="mt-2 text-muted-foreground">Choose your username and display name.</p>
        </div>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Username</span>
          <input required minLength={3} maxLength={30} value={username} onChange={(e) => setUsername(e.target.value)} className="w-full rounded-lg border p-3" placeholder="yourname" />
        </label>
        <label className="block space-y-2">
          <span className="text-sm font-medium">Display name</span>
          <input required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full rounded-lg border p-3" placeholder="Your Name" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50">
          {loading ? 'Creating...' : 'Continue'}
        </button>
      </form>
    </main>
  )
}
