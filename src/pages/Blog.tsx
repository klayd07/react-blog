import { useEffect, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "../store"
import { supabase } from "../lib/supabase"
import { clearUser } from "../store/authSlice"
import { createPost, getPosts, updatePost, deletePost } from "../api/posts"
import type { Post } from "../api/posts"

type ConfirmAction = "logout" | "delete" | "edit" | null

function Blog() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()

  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(true)
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [pendingPost, setPendingPost] = useState<Post | null>(null)

  const PAGE_SIZE = 5

  const loadPosts = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    const { data, error } = await getPosts(page, PAGE_SIZE)

    if (error) {
      setError("Failed to load posts")
    } else {
      setPosts(data || [])
      setHasNextPage((data?.length || 0) === PAGE_SIZE)
    }

    setIsLoading(false)
  }, [page])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleCreate = async () => {
    if (!title.trim() || !content.trim()) return

    setIsSubmitting(true)
    setError(null)

    const { error } = await createPost(title, content)

    if (error) {
      setError(error.message)
    } else {
      setTitle("")
      setContent("")
      loadPosts()
    }

    setIsSubmitting(false)
  }

  const handleUpdate = async () => {
    if (!editingId || !title.trim() || !content.trim()) return

    setIsSubmitting(true)
    const { error } = await updatePost(editingId, title, content)

    if (error) {
      setError(error.message)
    } else {
      setEditingId(null)
      setTitle("")
      setContent("")
      loadPosts()
    }

    setIsSubmitting(false)
  }

  const handleDelete = async (id: string) => {
    setIsSubmitting(true)
    const { error } = await deletePost(id)

    if (error) {
      setError(error.message)
    } else {
      loadPosts()
    }

    setIsSubmitting(false)
    setConfirmAction(null)
    setPendingPost(null)
  }

  const handleEdit = (post: Post) => {
    setEditingId(post.id)
    setTitle(post.title)
    setContent(post.content)
    setConfirmAction(null)
    setPendingPost(null)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleCancel = () => {
    setEditingId(null)
    setTitle("")
    setContent("")
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch(clearUser())
    setConfirmAction(null)
  }

  const openConfirmDialog = (action: ConfirmAction, post?: Post) => {
    setConfirmAction(action)
    if (post) setPendingPost(post)
  }

  const closeConfirmDialog = () => {
    setConfirmAction(null)
    setPendingPost(null)
  }

  const confirmActionHandler = () => {
    if (confirmAction === "logout") {
      handleLogout()
    } else if (confirmAction === "delete" && pendingPost) {
      handleDelete(pendingPost.id)
    } else if (confirmAction === "edit" && pendingPost) {
      handleEdit(pendingPost)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card p-6 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                    confirmAction === "logout"
                      ? "bg-gradient-to-r from-indigo-500 to-blue-500"
                      : confirmAction === "delete"
                      ? "bg-gradient-to-r from-red-500 to-pink-500"
                      : "bg-gradient-to-r from-amber-500 to-orange-500"
                  }`}
                >
                  {confirmAction === "logout" ? (
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                      />
                    </svg>
                  ) : confirmAction === "delete" ? (
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {confirmAction === "logout"
                      ? "Confirm Logout"
                      : confirmAction === "delete"
                      ? "Delete Post"
                      : "Edit Post"}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {confirmAction === "logout"
                      ? "Are you sure you want to logout?"
                      : confirmAction === "delete"
                      ? "This action cannot be undone. Are you sure you want to delete this post?"
                      : "Do you want to edit this post?"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={closeConfirmDialog}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmActionHandler}
                  className={
                    confirmAction === "delete" ? "btn-danger flex-1" : "btn-primary flex-1"
                  }
                >
                  {confirmAction === "logout"
                    ? "Logout"
                    : confirmAction === "delete"
                    ? "Delete"
                    : "Edit"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="glass-card p-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              My Blog
            </h1>
            <p className="text-slate-600 mt-1">
              Share your thoughts with the world
            </p>
          </div>
          <button onClick={() => openConfirmDialog("logout")} className="btn-danger">
            Logout
          </button>
        </div>

        {/* Create / Edit Form */}
        <div className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-semibold text-slate-800">
            {editingId ? "Edit Post" : "Create New Post"}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Title
              </label>
              <input
                className="glass-input"
                placeholder="Enter post title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Content
              </label>
              <textarea
                className="glass-input min-h-[150px] resize-none"
                placeholder="Write your post content..."
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex gap-3">
            {editingId ? (
              <>
                <button
                  onClick={handleUpdate}
                  disabled={isSubmitting || !title.trim() || !content.trim()}
                  className="btn-primary flex-1"
                >
                  {isSubmitting ? "Updating..." : "Update Post"}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="btn-primary w-full"
              >
                {isSubmitting ? "Publishing..." : "Publish Post"}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="glass-card p-4 bg-red-50/70 border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-slate-800">Recent Posts</h2>

          {isLoading ? (
            <div className="glass-card p-12">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-600">Loading posts...</p>
              </div>
            </div>
          ) : posts.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-slate-600">
                No posts yet. Create your first post above!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="glass-card p-6 hover:shadow-2xl transition-shadow duration-300"
                >
                  <h3 className="text-xl font-semibold text-slate-800 mb-2">
                    {post.title}
                  </h3>
                  <p className="text-slate-600 mb-4 whitespace-pre-wrap">
                    {post.content}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      {new Date(post.created_at).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>

                    {user?.id === post.user_id && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => openConfirmDialog("edit", post)}
                          disabled={isSubmitting}
                          className="btn-warning"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openConfirmDialog("delete", post)}
                          disabled={isSubmitting}
                          className="btn-danger"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        <div className="glass-card p-4 flex justify-between items-center">
          <button
            disabled={page === 1 || isLoading}
            onClick={() => setPage(page - 1)}
            className="btn-secondary"
          >
            ← Previous
          </button>

          <span className="text-sm font-medium text-slate-700">Page {page}</span>

          <button
            disabled={!hasNextPage || isLoading}
            onClick={() => setPage(page + 1)}
            className="btn-secondary"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  )
}

export default Blog
