import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useSelector } from "react-redux"
import toast, { Toaster } from "react-hot-toast"

import type { RootState } from "../store"
import { getPostById, type Post } from "../api/posts"
import {
  getComments,
  createComment,
  createCommentWithImage,
  deleteComment,
  updateComment,
  updateCommentWithImage,
  removeCommentImage,
  type Comment,
} from "../api/comments"

function PostView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const [post, setPost] = useState<Post | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replyFile, setReplyFile] = useState<File | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  // Edit state for comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState("")
  const [editCommentFile, setEditCommentFile] = useState<File | null>(null)
  const [editCommentImageUrl, setEditCommentImageUrl] = useState<string | null>(null)
  const [removeCommentImageFlag, setRemoveCommentImageFlag] = useState(false)

  // Image modal state
  const [viewingImage, setViewingImage] = useState<string | null>(null)

  // Collapse state for reply threads
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const { data: postData, error: postError } = await getPostById(id)
        const { data: commentData, error: commentError } = await getComments(id)

        if (postError || commentError) throw postError || commentError

        setPost(postData)
        setComments(commentData || [])
      } catch (err: any) {
        toast.error(err.message || "Failed to load post")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [id])

  const handleSubmit = async () => {
    if (!id || (!content.trim() && !file)) {
      toast.error("Please add text or image")
      return
    }

    setIsSubmitting(true)

    try {
      if (file) {
        await createCommentWithImage(id, content || null, file, null)
        toast.success("Comment posted!")
      } else {
        await createComment(id, content, null)
        toast.success("Comment posted!")
      }

      setContent("")
      setFile(null)
      
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      if (fileInput) fileInput.value = ""

      const { data } = await getComments(id)
      setComments(data || [])
    } catch (err: any) {
      toast.error(err.message || "Failed to post comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    if (!id || (!replyContent.trim() && !replyFile)) {
      toast.error("Please add text or image")
      return
    }

    setIsSubmitting(true)

    try {
      if (replyFile) {
        await createCommentWithImage(id, replyContent || null, replyFile, parentId)
        toast.success("Reply posted!")
      } else {
        await createComment(id, replyContent, parentId)
        toast.success("Reply posted!")
      }

      setReplyTo(null)
      setReplyContent("")
      setReplyFile(null)

      const { data } = await getComments(id)
      setComments(data || [])
      
      // Auto-expand the thread when a new reply is added
      setCollapsedThreads((prev) => {
        const newSet = new Set(prev)
        newSet.delete(parentId)
        return newSet
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to post reply")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditCommentContent(comment.content || "")
    setEditCommentImageUrl(comment.image_url)
    setEditCommentFile(null)
    setRemoveCommentImageFlag(false)
  }

  const handleSaveCommentEdit = async (commentId: string) => {
    if (!editCommentContent.trim() && !editCommentFile && !editCommentImageUrl) {
      toast.error("Comment cannot be empty")
      return
    }

    setIsSubmitting(true)

    try {
      if (removeCommentImageFlag && !editCommentFile) {
        await removeCommentImage(commentId)
      }

      if (editCommentFile) {
        await updateCommentWithImage(commentId, editCommentContent, editCommentFile)
      } else if (!removeCommentImageFlag) {
        await updateComment(commentId, editCommentContent)
      }
      
      toast.success("Comment updated successfully!")
      setEditingCommentId(null)
      setEditCommentFile(null)
      setEditCommentImageUrl(null)
      setRemoveCommentImageFlag(false)
      
      if (id) {
        const { data } = await getComments(id)
        setComments(data || [])
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update comment")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancelCommentEdit = () => {
    setEditingCommentId(null)
    setEditCommentContent("")
    setEditCommentFile(null)
    setEditCommentImageUrl(null)
    setRemoveCommentImageFlag(false)
  }

  const handleDelete = async (commentId: string) => {
    setIsSubmitting(true)
    
    const { error } = await deleteComment(commentId)
    
    if (error) {
      toast.error("Failed to delete comment")
    } else {
      const idsToRemove = new Set<string>([commentId])
      
      const findChildIds = (parentId: string) => {
        comments.forEach(c => {
          if (c.parent_id === parentId) {
            idsToRemove.add(c.id)
            findChildIds(c.id)
          }
        })
      }
      
      findChildIds(commentId)
      
      setComments((prev) => prev.filter((c) => !idsToRemove.has(c.id)))
      toast.success("Comment deleted successfully!")
    }
    
    setIsSubmitting(false)
    setConfirmDeleteId(null)
  }

  const toggleThread = (commentId: string) => {
    setCollapsedThreads((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(commentId)) {
        newSet.delete(commentId)
      } else {
        newSet.add(commentId)
      }
      return newSet
    })
  }

  const isPDF = (url: string | null) => {
    return url?.toLowerCase().endsWith('.pdf')
  }

  const topLevelComments = comments.filter(c => !c.parent_id)
  
  const getReplies = (parentId: string): Comment[] => {
    return comments.filter(c => c.parent_id === parentId)
  }

  const getReplyCount = (commentId: string): number => {
    let count = 0
    const replies = getReplies(commentId)
    count += replies.length
    replies.forEach(reply => {
      count += getReplyCount(reply.id)
    })
    return count
  }

  const getParentComment = (parentId: string | null): Comment | null => {
    if (!parentId) return null
    return comments.find(c => c.id === parentId) || null
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4">
        <p className="text-lg text-gray-600">Post not found</p>
        <button
          onClick={() => navigate("/blog")}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          Back to Blog
        </button>
      </div>
    )
  }

  const renderComment = (comment: Comment, depth: number = 0) => {
    const isEditing = editingCommentId === comment.id
    const isOwner = user?.id === comment.user_id
    const replies = getReplies(comment.id)
    const replyCount = getReplyCount(comment.id)
    const isCollapsed = collapsedThreads.has(comment.id)
    const parentComment = getParentComment(comment.parent_id)
    
    const createdDate = new Date(comment.created_at)
    const updatedDate = new Date(comment.updated_at)
    const isEdited = (updatedDate.getTime() - createdDate.getTime()) > 10000

    // Visual styling based on depth
    const getBackgroundColor = (d: number) => {
      if (d === 0) return 'bg-white'
      if (d === 1) return 'bg-gray-50'
      return 'bg-gray-100'
    }

    const getAvatarColor = (d: number) => {
      const hue = 210 + (d * 25) // Blue to green spectrum
      return `hsl(${hue}, 70%, 55%)`
    }

    const showReplyingTo = depth > 0 && parentComment

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-10' : ''}>
        {/* Thread connector line for nested replies */}
        {depth > 0 && (
          <div className="relative">
            <div className="absolute left-[-20px] top-0 bottom-0 w-0.5 bg-gray-300"></div>
            <div className="absolute left-[-20px] top-6 w-3 h-0.5 bg-gray-300"></div>
          </div>
        )}

        <div className={`${getBackgroundColor(depth)} rounded-lg ${depth === 0 ? 'shadow-md' : 'shadow-sm'} mb-3 border ${depth > 0 ? 'border-gray-200' : 'border-gray-100'}`}>
          <div className="p-4">
            {/* Comment Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3 flex-1">
                <div 
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: getAvatarColor(depth) }}
                >
                  {comment.author_email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {comment.author_email || 'Unknown User'}
                    </p>
                    {showReplyingTo && (
                      <>
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-blue-600 font-medium truncate">
                          @{parentComment?.author_email?.split('@')[0] || 'user'}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {isEdited ? (
                      <span className="flex items-center space-x-1">
                        <span>Edited {updatedDate.toLocaleDateString()} at {updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-400">Posted {createdDate.toLocaleDateString()}</span>
                      </span>
                    ) : (
                      `${createdDate.toLocaleDateString()} at ${createdDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    )}
                  </p>
                </div>
              </div>

              {isOwner && !isEditing && (
                <div className="flex space-x-1 flex-shrink-0 ml-2">
                  <button
                    onClick={() => handleEditComment(comment)}
                    className="text-gray-400 hover:text-blue-600 p-1.5 hover:bg-blue-50 rounded transition"
                    title="Edit comment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setConfirmDeleteId(comment.id)}
                    className="text-gray-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition"
                    title="Delete comment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

            {/* Comment Content */}
            {isEditing ? (
              <div className="space-y-3">
                <textarea
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  disabled={isSubmitting}
                  placeholder="Edit your comment..."
                />

                {(editCommentImageUrl && !removeCommentImageFlag) || editCommentFile ? (
                  <div className="relative inline-block">
                    {editCommentFile ? (
                      <img
                        src={URL.createObjectURL(editCommentFile)}
                        alt="New Preview"
                        className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-95 transition border border-gray-200"
                        onClick={() => setViewingImage(URL.createObjectURL(editCommentFile))}
                      />
                    ) : editCommentImageUrl ? (
                      <img
                        src={editCommentImageUrl}
                        alt="Current"
                        className="rounded-lg max-h-64 w-auto cursor-pointer hover:opacity-95 transition border border-gray-200"
                        onClick={() => setViewingImage(editCommentImageUrl)}
                      />
                    ) : null}
                    <button
                      onClick={() => {
                        if (editCommentFile) {
                          setEditCommentFile(null)
                        } else {
                          setRemoveCommentImageFlag(true)
                        }
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                      title="Remove image"
                    >
                      ×
                    </button>
                  </div>
                ) : null}

                {(!editCommentImageUrl || removeCommentImageFlag) && !editCommentFile && (
                  <label className="cursor-pointer inline-flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-2 rounded-lg transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const selectedFile = e.target.files?.[0] || null
                        if (selectedFile) {
                          setEditCommentFile(selectedFile)
                          setRemoveCommentImageFlag(false)
                          toast.success("New image selected!")
                        }
                      }}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-sm">Upload New Photo</span>
                  </label>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleCancelCommentEdit}
                    disabled={isSubmitting}
                    className="flex-1 bg-gray-100 text-gray-800 py-2 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSaveCommentEdit(comment.id)}
                    disabled={isSubmitting || (!editCommentContent.trim() && !editCommentFile && !editCommentImageUrl)}
                    className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                {comment.content && (
                  <p className="text-gray-800 whitespace-pre-wrap mb-3 leading-relaxed text-sm">
                    {comment.content}
                  </p>
                )}
                
                {comment.image_url && (
                  <div className="mb-3">
                    <img
                      src={comment.image_url}
                      alt="Comment"
                      className="rounded-lg w-auto cursor-pointer hover:opacity-95 transition border border-gray-200 max-h-80"
                      onClick={() => setViewingImage(comment.image_url)}
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center space-x-4 text-xs font-semibold">
                  <button
                    onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                    className="text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1 hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span>{replyTo === comment.id ? "Cancel" : "Reply"}</span>
                  </button>

                  {replies.length > 0 && (
                    <button
                      onClick={() => toggleThread(comment.id)}
                      className="text-gray-600 hover:text-gray-800 inline-flex items-center space-x-1"
                    >
                      <svg 
                        className={`w-3.5 h-3.5 transition-transform ${isCollapsed ? '' : 'rotate-90'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      <span>
                        {isCollapsed 
                          ? `Show ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                          : `Hide ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`
                        }
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Reply Form */}
          {replyTo === comment.id && (
            <div className="px-4 pb-4 pt-2 bg-gray-50 border-t border-gray-200">
              <div className="flex space-x-3">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: getAvatarColor(depth + 1) }}
                >
                  {user?.email?.[0].toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={`Reply to ${comment.author_email?.split('@')[0] || 'user'}...`}
                    disabled={isSubmitting}
                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2 shadow-sm text-sm"
                    rows={2}
                  />

                  {replyFile && (
                    <div className="mb-3 relative inline-block">
                      <img
                        src={URL.createObjectURL(replyFile)}
                        alt="Reply Preview"
                        className="rounded-lg max-h-40 w-auto border border-gray-200"
                      />
                      <button
                        onClick={() => setReplyFile(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <label className="cursor-pointer flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const selectedFile = e.target.files?.[0] || null
                          if (selectedFile) {
                            setReplyFile(selectedFile)
                            toast.success("Image selected!")
                          }
                        }}
                        disabled={isSubmitting}
                        className="hidden"
                      />
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-xs">Photo</span>
                    </label>

                    <button
                      onClick={() => handleReply(comment.id)}
                      disabled={isSubmitting || (!replyContent.trim() && !replyFile)}
                      className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition disabled:opacity-50 shadow-sm"
                    >
                      {isSubmitting ? "Posting..." : "Reply"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Nested Replies */}
        {replies.length > 0 && !isCollapsed && (
          <div className="space-y-3 mt-3">
            {replies.map((reply) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      
      {/* HEADER */}
      <div className="bg-white shadow-md border-b sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center space-x-4">
          <button
            onClick={() => navigate("/blog")}
            className="text-gray-600 hover:text-blue-600 transition p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Post</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* MAIN POST CARD */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          {/* Post Header */}
          <div className="p-6 border-b">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
                {post.author_email?.[0].toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-bold text-gray-900 text-lg">{post.author_email || 'Unknown User'}</p>
                <p className="text-sm text-gray-500">
                  {(() => {
                    const createdDate = new Date(post.created_at)
                    const updatedDate = new Date(post.updated_at)
                    const isEdited = (updatedDate.getTime() - createdDate.getTime()) > 10000

                    if (isEdited) {
                      return (
                        <>
                          Edited {updatedDate.toLocaleDateString()} at {updatedDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          </div>

          {/* Post Content */}
          <div className="p-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 leading-tight">{post.title}</h1>
            {post.content && (
              <p className="text-gray-800 text-lg whitespace-pre-wrap mb-6 leading-relaxed">{post.content}</p>
            )}

            {/* Post Media - Full Width */}
            {post.image_url && (
              <div className="w-full -mx-6">
                {isPDF(post.image_url) ? (
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-12 text-center">
                    <svg className="w-20 h-20 mx-auto text-red-600 mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                    </svg>
                    <a 
                      href={post.image_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 font-semibold text-lg hover:underline inline-flex items-center space-x-2"
                    >
                      <span>View PDF Document</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                ) : (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full object-contain max-h-[600px] cursor-pointer hover:opacity-95 transition bg-gray-50"
                    onClick={() => setViewingImage(post.image_url)}
                  />
                )}
              </div>
            )}
          </div>

          {/* Post Stats */}
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span className="font-medium">{comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}</span>
            </div>
          </div>
        </div>

        {/* COMMENT FORM */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Leave a Comment</h2>
          <div className="flex space-x-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-sm">
              {user?.email?.[0].toUpperCase() || 'U'}
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What are your thoughts?"
              disabled={isSubmitting}
              className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          {file && (
            <div className="mb-4 ml-13 relative inline-block">
              <img
                src={URL.createObjectURL(file)}
                alt="Preview"
                className="rounded-lg max-h-48 w-auto shadow-sm border border-gray-200"
              />
              <button
                onClick={() => {
                  setFile(null)
                  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
                  if (fileInput) fileInput.value = ""
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600 shadow-lg"
              >
                ×
              </button>
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t">
            <label className="cursor-pointer flex items-center space-x-2 text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null
                  setFile(selectedFile)
                  if (selectedFile) {
                    toast.success("Image selected!")
                  }
                }}
                disabled={isSubmitting}
                className="hidden"
              />
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="font-semibold text-sm">Add Photo</span>
            </label>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!content.trim() && !file)}
              className="bg-blue-600 text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isSubmitting ? "Posting..." : "Post Comment"}
            </button>
          </div>
        </div>

        {/* COMMENTS LIST */}
        {topLevelComments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-gray-500 text-lg">No comments yet</p>
            <p className="text-gray-400 text-sm mt-1">Be the first to share your thoughts!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topLevelComments.map((comment) => renderComment(comment, 0))}
          </div>
        )}
      </div>

      {/* IMAGE MODAL */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition"
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            src={viewingImage}
            alt="Full size"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-3">Delete Comment?</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              This action cannot be undone. All replies to this comment will also be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isSubmitting}
                className="flex-1 bg-gray-100 text-gray-800 py-3 rounded-lg hover:bg-gray-200 transition font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                disabled={isSubmitting}
                className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PostView
