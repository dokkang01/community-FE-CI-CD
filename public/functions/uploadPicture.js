/****
 * Reusable image upload module for S3 (presigned URL)
 * 
 * Usage:
 *   const { uploadImage } = window.ImageUploader;
 *   const key = await uploadImage("PROFILE", file);
 */

const TIMEOUT_MS = 15000;

async function requestPresignedUpload(kind, file) {
  const url = new URL(API.url(API.ENDPOINTS.IMAGE_UPLOAD));
  url.searchParams.set("kind", kind);
  url.searchParams.set("filename", file.name);
  url.searchParams.set("contentType", file.type || "application/octet-stream");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      method: "POST",
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error("이미지 업로드 URL 생성 실패");
    }

    const data = await res.json().catch(() => ({}));

    if (!data || !data.uploadUrl || !data.key) {
      throw new Error("서버 응답 형식 오류");
    }

    return data; // { uploadUrl, key }
  } catch (err) {
    clearTimeout(timer);
    console.error("requestPresignedUpload error:", err);
    throw err;
  }
}

async function uploadFileToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!res.ok) {
    throw new Error("S3 업로드 실패");
  }
}

async function uploadImage(kind, file) {
  const { uploadUrl, key } = await requestPresignedUpload(kind, file);
  await uploadFileToS3(uploadUrl, file);
  return key; // 최종 object key 반환
}

window.ImageUploader = {
  requestPresignedUpload,
  uploadFileToS3,
  uploadImage,
};
