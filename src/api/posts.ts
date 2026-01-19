import { supabase } from "../lib/supabase"


export type Post = {
  id: string
  title: string
  content: string
  user_id: string
  created_at: string
}

// CREATE 
export async function createPost(title: string, content: string) {
  return supabase.from("posts").insert([
    {
      title,
      content,
    },
  ])
}

// READ 
export async function getPosts(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return supabase
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false })
    .range(from, to)
}

// UPDATE (RLS enforces ownership)
export async function updatePost(
  id: string,
  title: string,
  content: string
) {
  return supabase
    .from("posts")
    .update({ title, content })
    .eq("id", id)
}

// DELETE (RLS enforces ownership)
export async function deletePost(id: string) {
  return supabase.from("posts").delete().eq("id", id)
}
