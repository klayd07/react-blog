import { useEffect, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "../store"
import { supabase } from "../lib/supabase"
import { clearUser } from "../store/authSlice"
import {
  createPost,
  getPosts,
  updatePost,
  deletePost,
} from "../api/posts"
import type { Post } from "../api/posts"

function Blog() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()

  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 5

  useEffect(() => {
    loadPosts()
  }, [page])

  const loadPosts = async () => {
    const { data } = await getPosts(page, PAGE_SIZE)
    if (data) setPosts(data)
  }

  const handleCreate = async () => {
    if (!title || !content) return

    await createPost(title, content)
    setTitle("")
    setContent("")
    loadPosts()
  }

  const handleUpdate = async (id: string) => {
    await updatePost(id, title, content)
    setEditingId(null)
    setTitle("")
    setContent("")
    loadPosts()
  }

  const handleDelete = async (id: string) => {
    await deletePost(id)
    loadPosts()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch(clearUser())
  }

  return (
    <div>
      <h1>Blog</h1>

      <button onClick={handleLogout}>Logout</button>

      <hr />

      {/* Create / Edit Form */}
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        placeholder="Content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />

      {editingId ? (
        <button onClick={() => handleUpdate(editingId)}>
          Update Post
        </button>
      ) : (
        <button onClick={handleCreate}>
          Create Post
        </button>
      )}

      <hr />

      {/* Posts List */}
      {posts.map((post) => (
        <div key={post.id} style={{ marginBottom: "1rem" }}>
          <h3>{post.title}</h3>
          <p>{post.content}</p>

          {/* OWNER-ONLY CONTROLS */}
          {user?.id === post.user_id && (
            <>
              <button
                onClick={() => {
                  setEditingId(post.id)
                  setTitle(post.title)
                  setContent(post.content)
                }}
              >
                Edit
              </button>

              <button onClick={() => handleDelete(post.id)}>
                Delete
              </button>
            </>
          )}
        </div>
      ))}

      {/* Pagination */}
      <button
        disabled={page === 1}
        onClick={() => setPage(page - 1)}
      >
        Previous
      </button>

      <button onClick={() => setPage(page + 1)}>
        Next
      </button>
    </div>
  )
}

export default Blog
