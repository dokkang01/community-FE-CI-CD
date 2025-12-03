async function getPresignedUrl(kind, file) {
  const res = await fetch("https://wt5slwq808.execute-api.ap-northeast-2.amazonaws.com/upload-profile-image/upload-profile-image", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contentType: file.type,
      kind: kind, // PROFILE or POST
    }),
  });

  if (!res.ok) throw new Error("Presigned URL 요청 실패");
  return await res.json(); // { uploadUrl, key }
}

async function uploadToS3(uploadUrl, file) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!res.ok) throw new Error("S3 업로드 실패");
}

async function uploadImage(kind, file) {
  const { uploadUrl, key } = await getPresignedUrl(kind, file);
  await uploadToS3(uploadUrl, file);
  return key; // 백엔드 DB에 저장할 키
}

window.ImageUploader = {
  uploadImage
};
