import { supabase } from "../lib/supabase"
import { uploadImage } from "./uploadImage"

/**
 * Comment type
 * Mirrors the comments table exactly
 */
export type Comment = {
  id: string
  post_id: string
  user_id: string
  author_email: string
  content: string | null
  image_url: string | null
  parent_id: string | null
  created_at: string
}

/**
 * Fetch all comments for a post
 * Includes replies (flat list, can be grouped in UI)
 */
export async function getComments(postId: string) {
  return await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true })
}

/**
 * Create a text-only comment
 */
export async function createComment(
  postId: string,
  content: string,
  parentId: string | null = null
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  return await supabase.from("comments").insert({
    post_id: postId,
    content,
    parent_id: parentId,
    user_id: user.id,
    author_email: user.email,
  })
}

/**
 * Create a comment WITH an image
 */
export async function createCommentWithImage(
  postId: string,
  content: string | null,
  file: File,
  parentId: string | null = null
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const imagePath = `${user.id}/${Date.now()}_${file.name}`

  const imageUrl = await uploadImage(file, "comment-images", imagePath)

  return await supabase
    .from("comments")
    .insert({
      post_id: postId,
      content,
      parent_id: parentId,
      user_id: user.id,
      author_email: user.email,
      image_url: imageUrl,
    })
}

/**
 * Update comment (text only)
 */
export async function updateComment(
  id: string,
  content: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  return await supabase
    .from("comments")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)
}

/**
 * Update comment with optional image replacement
 */
export async function updateCommentWithImage(
  id: string,
  content: string,
  file: File | null
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const { error: updateError } = await supabase
    .from("comments")
    .update({ content })
    .eq("id", id)
    .eq("user_id", user.id)

  if (updateError) throw updateError

  if (file) {
    const imagePath = `${user.id}/${id}/${file.name}`

    const imageUrl = await uploadImage(file, "comment-images", imagePath)

    const { error: imageUpdateError } = await supabase
      .from("comments")
      .update({ image_url: imageUrl })
      .eq("id", id)

    if (imageUpdateError) throw imageUpdateError
  }

  return { error: null }
}

/**
 * Remove image from comment
 */
export async function removeCommentImage(id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  return await supabase
    .from("comments")
    .update({ image_url: null })
    .eq("id", id)
    .eq("user_id", user.id)
}

/**
 * Delete comment
 */
export async function deleteComment(id: string) {
  return await supabase.from("comments").delete().eq("id", id)
}
