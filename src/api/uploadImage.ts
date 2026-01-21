import { supabase } from "../lib/supabase"

/**
 * Sanitize filename to remove invalid characters
 */
function sanitizeFilename(filename: string): string {
  // Remove special characters and replace spaces with underscores
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\s+/g, "_")
    .toLowerCase()
}

/**
 * Get file extension from filename or file type
 */
function getFileExtension(file: File): string {
  // First try to get from filename
  const nameParts = file.name.split(".")
  if (nameParts.length > 1) {
    return nameParts.pop()!.toLowerCase()
  }
  
  // Fallback to MIME type
  const mimeType = file.type
  const mimeMap: { [key: string]: string } = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "application/pdf": "pdf",
  }
  
  return mimeMap[mimeType] || "jpg"
}

/**
 * Uploads an image file to Supabase Storage
 * and returns the public URL.
 */
export async function uploadImage(
  file: File,
  bucket: "post-images" | "comment-images",
  path: string
): Promise<string> {
  // 1. Validate input
  if (!file) {
    throw new Error("No file provided")
  }

  // 2. Validate file type
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "application/pdf"]
  if (!validTypes.includes(file.type)) {
    throw new Error("Invalid file type. Only PNG, JPG, GIF, WEBP, and PDF are allowed.")
  }

  // 3. Get the extension
  const extension = getFileExtension(file)

  // 4. Sanitize the path and create unique filename
  const pathParts = path.split("/")
  pathParts.pop() // Remove original filename
  
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const uniqueFilename = `file_${timestamp}_${randomString}.${extension}`
  
  const uniquePath = [...pathParts, uniqueFilename].join("/")

  console.log("Uploading to path:", uniquePath) // Debug

  // 5. Upload the file to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(uniquePath, file, {
      cacheControl: "3600",
      upsert: false,
    })

  if (uploadError) {
    console.error("Upload error:", uploadError)
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  console.log("Upload successful:", uploadData) // Debug

  // 6. Get public URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniquePath)

  if (!data?.publicUrl) {
    throw new Error("Failed to retrieve public URL")
  }

  console.log("Public URL:", data.publicUrl) // Debug

  return data.publicUrl
}
