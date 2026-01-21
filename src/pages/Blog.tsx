import { useEffect, useState, useCallback } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import toast, { Toaster } from "react-hot-toast"

import type { RootState } from "../store"
import { supabase } from "../lib/supabase"
import { clearUser } from "../store/authSlice"
import {
  createPost,
  createPostWithImage,
  getPosts,
  deletePost,
  updatePost,
  updatePostWithImage,
  removePostImage,
  getPostsCount,
} from "../api/posts"
import type { Post } from "../api/posts"

type ConfirmAction = "logout" | "delete" | null

function Blog() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [posts, setPosts] = useState<Post[]>([])
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null)
  const [pendingPost, setPendingPost] = useState<Post | null>(null)

  // Edit state
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)
  const [editImageUrl, setEditImageUrl] = useState<string | null>(null)
  const [removeImage, setRemoveImage] = useState(false)

  const PAGE_SIZE = 10

  useEffect(() => {
    setConfirmAction(null)
    setPendingPost(null)
  }, [page])

  const loadPosts = useCallback(async () => {
    setIsLoading(true)

    try {
      const { data, error } = await getPosts(page, PAGE_SIZE)
      
      if (error) {
        console.error("Failed to load posts:", error)
        toast.error("Failed to load posts")
        setPosts([])
      } else {
        setPosts(data || [])
      }

      const { count, error: countError } = await getPostsCount()
      
      if (!countError && count !== null) {
        setTotalPages(Math.ceil(count / PAGE_SIZE))
      }
    } catch (err: any) {
      console.error("Load posts error:", err)
      toast.error("Failed to load posts")
      setPosts([])
    } finally {
      setIsLoading(false)
    }
  }, [page])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const handleCreate = async () => {
    if (!title.trim() && !file) {
      toast.error("Add a title or an image")
      return
    }

    setIsSubmitting(true)

    try {
      if (file) {
        await createPostWithImage(title, content, file)
        toast.success("Post created!")
      } else {
        await createPost(title, content)
        toast.success("Post created!")
      }

      setTitle("")
      setContent("")
      setFile(null)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""
      
      setPage(1)
      await loadPosts()
    } catch (err: any) {
      console.error("Create post error:", err)
      toast.error(err.message || "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditPost = (post: Post) => {
    setEditingPostId(post.id)
    setEditTitle(post.title)
    setEditContent(post.content || "")
    setEditImageUrl(post.image_url)
    setEditFile(null)
    setRemoveImage(false)
  }

  const handleSaveEdit = async (postId: string) => {
    if (!editTitle.trim()) {
      toast.error("Title cannot be empty")
      return
    }

    setIsSubmitting(true)

    try {
      // If removing image
      if (removeImage && !editFile) {
        await removePostImage(postId)
      }
      
      // If there's a new file to upload
      if (editFile) {
        await updatePostWithImage(postId, editTitle, editContent, editFile)
      } else if (!removeImage) {
        // Just update text
        await updatePost(postId, editTitle, editContent)
      }
      
      toast.success("Post updated successfully!")
      setEditingPostId(null)
      setEditFile(null)
      setEditImageUrl(null)
      setRemoveImage(false)
      await loadPosts()
    } catch (err: any) {
      toast.error(err.message || "Failed to update post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingPostId(null)
    setEditTitle("")
    setEditContent("")
    setEditFile(null)
    setEditImageUrl(null)
    setRemoveImage(false)
  }

  const handleDelete = async () => {
    if (!pendingPost) return

    setIsSubmitting(true)
    const { error } = await deletePost(pendingPost.id)
    
    if (error) {
      toast.error("Failed to delete post")
    } else {
      toast.success("Post deleted!")
      await loadPosts()
    }
    
    setIsSubmitting(false)
    setConfirmAction(null)
    setPendingPost(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    dispatch(clearUser())
    toast.success("Logged out successfully!")
    navigate("/login")
  }

  const isPDF = (url: string | null) => {
    return url?.toLowerCase().endsWith('.pdf')
  }

  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5
    
    let startPage = Math.max(1, page - Math.floor(maxPagesToShow / 2))
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1)
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1)
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">My Blog</h1>
          <button
            onClick={() => setConfirmAction("logout")}
            className="text-gray-600 hover:text-red-600 font-medium"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* CREATE POST */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex space-x-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <input
              className="flex-1 bg-gray-100 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {(title || content || file) && (
            <div className="space-y-3 pl-12">
              <textarea
                className="w-full bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Add more details... (optional)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />

              {file && (
                <div className="relative inline-block">
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="rounded-lg max-h-48 w-auto"
                    />
                  ) : (
                    <div className="bg-gray-100 p-4 rounded-lg">
                      <p className="text-sm text-gray-600">📄 {file.name}</p>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setFile(null)
                      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                      if (fileInput) fileInput.value = ""
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t mt-3">
            <label className="cursor-pointer flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition">
              <input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null
                  setFile(selectedFile)
                  if (selectedFile) {
                    toast.success("File selected!")
                  }
                }}
                disabled={isSubmitting}
                className="hidden"
              />
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-medium">Photo/PDF</span>
            </label>

            <button
              onClick={handleCreate}
              disabled={isSubmitting || (!title.trim() && !file)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>

        {/* POSTS FEED */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">No posts yet. Create your first post!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                      {post.author_email?.[0].toUpperCase() || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{post.author_email || 'Unknown User'}</p>
                      <p className="text-xs text-gray-500">
                        {(() => {
                          const createdDate = new Date(post.created_at)
                          const updatedDate = new Date(post.updated_at)
                          const isEdited = updatedDate.getTime() > createdDate.getTime() + 1000

                          if (isEdited) {
                            return (
                              <>
                                Edited: {updatedDate.toLocaleDateString()} at {updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                <span className="text-gray-400 ml-1">
                                  (Posted: {createdDate.toLocaleDateString()})
                                </span>
                              </>
                            )
                          }
                          return `${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        })()}
                      </p>
                    </div>
                  </div>
                  
                  {user?.id === post.user_id && (
                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditPost(post)
                        }}
                        className="text-gray-400 hover:text-blue-600"
                        title="Edit post"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setPendingPost(post)
                          setConfirmAction("delete")
                        }}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete post"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {editingPostId === post.id ? (
                // EDIT MODE
                <div className="p-4 space-y-3">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-lg"
                    placeholder="Post title"
                    disabled={isSubmitting}
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full bg-gray-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Post content (optional)"
                    rows={4}
                    disabled={isSubmitting}
                  />

                  {/* Current or New Image */}
                  {(editImageUrl && !removeImage) || editFile ? (
                    <div className="relative inline-block">
                      {editFile ? (
                        editFile.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(editFile)}
                            alt="New Preview"
                            className="rounded-lg max-h-48 w-auto"
                          />
                        ) : (
                          <div className="bg-gray-100 p-4 rounded-lg">
                            <p className="text-sm text-gray-600">📄 {editFile.name}</p>
                          </div>
                        )
                      ) : editImageUrl && !isPDF(editImageUrl) ? (
                        <img
                          src={editImageUrl}
                          alt="Current"
                          className="rounded-lg max-h-48 w-auto"
                        />
                      ) : editImageUrl ? (
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <p className="text-sm text-gray-600">📄 PDF Document</p>
                        </div>
                      ) : null}
                      <button
                        onClick={() => {
                          if (editFile) {
                            setEditFile(null)
                          } else {
                            setRemoveImage(true)
                          }
                        }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                        title="Remove image"
                      >
                        ×
                      </button>
                    </div>
                  ) : null}

                  {/* Upload New Image */}
                  {(!editImageUrl || removeImage) && !editFile && (
                    <label className="cursor-pointer inline-flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0] || null
                          if (selectedFile) {
                            setEditFile(selectedFile)
                            setRemoveImage(false)
                            toast.success("New file selected!")
                          }
                        }}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-sm">Upload New Photo/PDF</span>
                    </label>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSubmitting}
                      className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(post.id)}
                      disabled={isSubmitting || !editTitle.trim()}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                    >
                      {isSubmitting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div
                  className="cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => navigate(`/post/${post.id}`)}
                >
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
                    {post.content && (
                      <p className="text-gray-700 line-clamp-3">{post.content}</p>
                    )}
                  </div>

                  {post.image_url && (
                    <div className="w-full">
                      {isPDF(post.image_url) ? (
                        <div className="bg-gray-100 p-8 text-center">
                          <svg className="w-16 h-16 mx-auto text-red-600 mb-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                          </svg>
                          <span className="text-blue-600 font-medium">PDF Document</span>
                        </div>
                      ) : (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full object-cover max-h-96"
                          onError={(e) => {
                            console.error("Post image failed to load:", post.image_url)
                            e.currentTarget.style.display = 'none'
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {/* PAGINATION */}
        {posts.length > 0 && totalPages > 1 && (
          <div className="flex justify-center items-center space-x-1 py-4">
            <button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
            >
              Previous
            </button>
            
            {getPageNumbers().map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`px-3 py-2 rounded-lg shadow text-sm font-medium transition ${
                  page === pageNum
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {pageNum}
              </button>
            ))}
            
            <button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-2 bg-white rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition text-sm font-medium"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* CONFIRMATION DIALOG */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
            <h3 className="text-xl font-semibold mb-2">
              {confirmAction === "logout" ? "Logout?" : "Delete Post?"}
            </h3>
            <p className="text-gray-600 mb-6">
              {confirmAction === "logout"
                ? "Are you sure you want to logout?"
                : "This action cannot be undone."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setConfirmAction(null)
                  setPendingPost(null)
                }}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmAction === "logout" ? handleLogout : handleDelete}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-medium"
              >
                {isSubmitting ? "Processing..." : confirmAction === "logout" ? "Logout" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Blog