// === Backend config (from /lib/config.js: window.API) ===
const TIMEOUT_MS = 15000;

function setHelp(id, msg){ const el = document.getElementById(id); if(el) el.textContent = msg || ""; }
function setFieldState(input, ok){ if(!input) return; input.classList.toggle("is-valid", !!ok); input.classList.toggle("is-invalid", !ok); }
function validateEmailValue(v){
  if(!v) return {ok:false, msg:"*이메일을 입력해주세요."};
  if(v.length < 5) return {ok:false, msg:"*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)"};
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; if(!re.test(v)) return {ok:false, msg:"*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)"};
  return {ok:true, msg:""};
}
function validatePasswordValue(v){
  if(!v) return {ok:false, msg:"*비밀번호를 입력해주세요"};
  if(v.length < 8 || v.length > 20) return {ok:false, msg:"*비밀번호는 8자 이상, 20자 이하여야 합니다."};
  const up=/[A-Z]/.test(v), lo=/[a-z]/.test(v), di=/\d/.test(v), sp=/[^\w\s]/.test(v);
  if(!(up&&lo&&di&&sp)) return {ok:false, msg:"*대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다."};
  return {ok:true, msg:""};
}

const form = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitBtn = document.getElementById("login-btn");
const errorBox = document.getElementById("login-error");
const successBox = document.getElementById("login-success");

if(emailInput){
  const run=()=>{ const {ok,msg}=validateEmailValue(emailInput.value.trim()); setHelp('email-help', msg); setFieldState(emailInput, ok); };
  emailInput.addEventListener('blur', run);
  emailInput.addEventListener('input', run);
}
if(passwordInput){
  const run=()=>{ const {ok,msg}=validatePasswordValue(passwordInput.value); setHelp('password-help', msg); setFieldState(passwordInput, ok); };
  passwordInput.addEventListener('blur', run);
  passwordInput.addEventListener('input', run);
}

async function postLogin(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(API.url(API.ENDPOINTS.LOGIN), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const hint = err.name === "AbortError"
      ? "Request timed out. Is the backend reachable?"
      : "Network/CORS error. Check server, URL/port, and CORS settings.";
    throw new Error(`Failed to fetch: ${hint}`);
  }

  clearTimeout(timer);

  const contentType = res.headers.get("content-type") || "";
  let dataText = "";
  let dataJson = null;
  if (contentType.includes("application/json")) {
    dataJson = await res.json().catch(() => null);
  } else {
    dataText = await res.text().catch(() => "");
  }

  if (!res.ok) {
    const msg = (dataJson && (dataJson.message || dataJson.error || dataJson.detail)) || dataText || `Login failed (${res.status})`;
    throw new Error(msg);
  }

  return dataText || dataJson || {};
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorBox) errorBox.textContent = "";
    if (successBox) successBox.textContent = "";

    const email = (emailInput && emailInput.value.trim()) || "";
    const password = (passwordInput && passwordInput.value) || "";

    const eRes = validateEmailValue(email);
    const pRes = validatePasswordValue(password);
    setHelp('email-help', eRes.msg); setFieldState(emailInput, eRes.ok);
    setHelp('password-help', pRes.msg); setFieldState(passwordInput, pRes.ok);
    if (!(eRes.ok && pRes.ok)) return;

    const prevText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "로그인 중...";
    }

    try {
      const result = await postLogin({ email, password });

      const tokenLike = typeof result === 'string'
        ? result
        : (result && (result.accessToken || result.token || result.message)) || '';

      if (tokenLike && typeof tokenLike === 'string') {
        try { localStorage.setItem('authToken', tokenLike); } catch (_) {}
        try { sessionStorage.setItem('accessToken', tokenLike); } catch (_) {}
      } else {
        try { localStorage.setItem('loginResult', JSON.stringify(result)); } catch (_) {}
        try {
          const maybe = result && (result.accessToken || result.token || result.message);
          if (maybe && typeof maybe === 'string') {
            sessionStorage.setItem('accessToken', maybe);
          }
        } catch (_) {}
      }

      if (errorBox) errorBox.textContent = "";
      if (successBox) successBox.textContent = "로그인 성공!";

      
      window.location.href = "/pages/board/board.html"; 
    } catch (err) {
      const msg = "*아이디 또는 비밀번호를 확인해주세요";
      if (errorBox) { errorBox.textContent = msg; } else { alert(msg); }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText || "로그인";
      }
    }
  });
}

// Go to signup (supports either #go-signup or #go-signup-btn)
document.addEventListener("click", (e) => {
  const t = e.target.closest && (e.target.closest("#go-signup") || e.target.closest("#go-signup-btn"));
  if (t) {
    e.preventDefault();
    // Adjust the path if needed based on your folder structure
    window.location.href = "/pages/signup/signup.html";
  }
});