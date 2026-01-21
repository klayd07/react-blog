import { supabase } from "../lib/supabase"
import { uploadImage } from "./uploadImage"

export type Post = {
  id: string
  title: string
  content: string
  user_id: string
  author_email: string
  image_url: string | null
  created_at: string
  updated_at: string
  last_activity?: string
}

export async function getPosts(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return await supabase
    .from("posts")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .range(from, to)
}

export async function getPostsCount() {
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })

  return { count, error }
}

export async function getPostById(id: string) {
  return await supabase.from("posts").select("*").eq("id", id).single()
}

export async function createPost(title: string, content: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  return await supabase.from("posts").insert({
    title,
    content,
    user_id: user.id,
    author_email: user.email,
  })
}

export async function createPostWithImage(
  title: string,
  content: string,
  file: File
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  const imagePath = `${user.id}/${Date.now()}_${file.name}`

  const imageUrl = await uploadImage(file, "post-images", imagePath)

  return await supabase
    .from("posts")
    .insert({
      title,
      content,
      user_id: user.id,
      author_email: user.email,
      image_url: imageUrl,
    })
    .select()
    .single()
}

export async function updatePost(id: string, title: string, content: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  // ✅ Let Supabase trigger handle updated_at automatically
  return await supabase
    .from("posts")
    .update({ 
      title, 
      content
    })
    .eq("id", id)
    .eq("user_id", user.id) 
}

export async function deletePost(id: string) {
  return await supabase.from("posts").delete().eq("id", id)
}

export async function updatePostWithImage(
  id: string,
  title: string,
  content: string,
  file: File | null
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  // ✅ Update text content - Supabase will handle updated_at
  const { error: updateError } = await supabase
    .from("posts")
    .update({ 
      title, 
      content
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (updateError) throw updateError

  if (file) {
    const imagePath = `${user.id}/${id}/${file.name}`
    
    const imageUrl = await uploadImage(file, "post-images", imagePath)

    // ✅ Update image - Supabase will handle updated_at
    const { error: imageUpdateError } = await supabase
      .from("posts")
      .update({ 
        image_url: imageUrl
      })
      .eq("id", id)

    if (imageUpdateError) throw imageUpdateError
  }

  return { error: null }
}

export async function removePostImage(id: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("Not authenticated")

  return await supabase
    .from("posts")
    .update({ image_url: null })
    .eq("id", id)
    .eq("user_id", user.id)
}
