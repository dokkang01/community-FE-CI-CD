// === Backend config (wire later) ===
const CREATE_ENDPOINT = "/posts"; 
const TIMEOUT_MS = 15000;

// Elements
const form = document.getElementById("post-form");
const contentEl = document.getElementById("post-content");
const titleEl = document.getElementById("post-title");
const errorEl = document.getElementById("error");
const successEl = document.getElementById("success");
const submitBtn = document.getElementById("submit-btn");

async function createPost(payload){
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res;
  try{
    res = await fetch(API.url(CREATE_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  }catch(err){
    clearTimeout(timer);
    throw new Error("네트워크 오류입니다. 서버와 CORS 설정을 확인하세요.");
  }
  clearTimeout(timer);
  if(!res.ok){
    const msg = (await res.text().catch(()=>'')) || `작성 실패 (${res.status})`;
    throw new Error(msg);
  }
  const ct = res.headers.get("content-type")||"";
  return ct.includes("application/json") ? (await res.json().catch(()=>null)) : (await res.text().catch(()=>""));
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = ""; successEl.textContent = "";

  const title = titleEl?.value.trim();
  if (!title) { errorEl.textContent = "제목을 입력해주세요."; return; }

  const content = contentEl?.value.trim();
  if(!content){ errorEl.textContent = "내용을 입력해주세요."; return; }

  // TODO: 사용자 아이디 불러오기 -> 로그인 세션을 만들어줘야겠다
  const authorId = 1;

  const payload = {
    authorId,
    title,
    content,
  };

  const prev = submitBtn?.textContent;
  if (submitBtn){ submitBtn.disabled = true; submitBtn.textContent = "업로드 중..."; }

  try{
    await createPost(payload);
    successEl.textContent = "게시글이 업로드되었습니다.";
    setTimeout(()=>{ window.location.href = "/pages/board/board.html"; }, 700);
  }catch(err){
    errorEl.textContent = err.message || "작성에 실패했습니다.";
  }finally{
    if (submitBtn){ submitBtn.disabled = false; submitBtn.textContent = prev || "완료"; }
  }
});