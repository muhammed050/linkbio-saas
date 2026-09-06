"use server"

import { getCurrentProfile } from "@/lib/auth/session"
import { updatePage } from "@/lib/db/pages"
import { createSection, deleteSection, updateSection } from "@/lib/db/sections"
import { createLink, deleteLink, updateLink } from "@/lib/db/links"
import type { Json } from "@/types"

export async function saveStudioPage(input: {
  title: string
  bio: string
  theme: Record<string, unknown>
}) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const page = await updatePage(profile.id, {
    title: input.title.trim().slice(0, 120),
    bio: input.bio.trim().slice(0, 500) || null,
    theme: input.theme as Json,
  })
  if (!page) throw new Error("SAVE_FAILED")
  return page
}

export async function addStudioSection(input: { pageId: string; type: "links" | "social" | "media" | "text"; title?: string }) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const section = await createSection(input.pageId, { type, title: input.title?.trim() || null })
  if (!section) throw new Error("CREATE_SECTION_FAILED")
  return section
}

export async function saveStudioSection(input: { sectionId: string; title?: string; isVisible?: boolean }) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const section = await updateSection(input.sectionId, {
    ...(input.title !== undefined ? { title: input.title.trim().slice(0, 120) || null } : {}),
    ...(input.isVisible !== undefined ? { is_visible: input.isVisible } : {}),
  })
  if (!section) throw new Error("SAVE_SECTION_FAILED")
  return section
}

export async function removeStudioSection(sectionId: string) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  if (!(await deleteSection(sectionId))) throw new Error("DELETE_SECTION_FAILED")
  return { ok: true }
}

export async function addStudioLink(input: { sectionId: string; title: string; url: string }) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const url = input.url.trim()
  if (!/^https?:\/\//i.test(url)) throw new Error("INVALID_URL")
  const link = await createLink(input.sectionId, { title: input.title.trim().slice(0, 120), url })
  if (!link) throw new Error("CREATE_LINK_FAILED")
  return link
}

export async function saveStudioLink(input: { linkId: string; title?: string; url?: string; isVisible?: boolean }) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const updates = {
    ...(input.title !== undefined ? { title: input.title.trim().slice(0, 120) } : {}),
    ...(input.url !== undefined ? { url: input.url.trim() } : {}),
    ...(input.isVisible !== undefined ? { is_visible: input.isVisible } : {}),
  }
  if (updates.url && !/^https?:\/\//i.test(updates.url)) throw new Error("INVALID_URL")
  const link = await updateLink(input.linkId, updates)
  if (!link) throw new Error("SAVE_LINK_FAILED")
  return link
}

export async function removeStudioLink(linkId: string) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  if (!(await deleteLink(linkId))) throw new Error("DELETE_LINK_FAILED")
  return { ok: true }
}

export async function publishStudioPage(publish: boolean) {
  const profile = await getCurrentProfile()
  if (!profile) throw new Error("UNAUTHORIZED")
  const page = await updatePage(profile.id, { is_published: publish })
  if (!page) throw new Error("PUBLISH_FAILED")
  return page
}
