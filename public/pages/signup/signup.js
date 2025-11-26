// === Backend config (from /lib/config.js: window.API) ===
const SIGNUP_ENDPOINT = API.ENDPOINTS.SIGNUP;
const EMAIL_DUP_ENDPOINT = API.ENDPOINTS.EMAIL_DUP;
const NICK_DUP_ENDPOINT = API.ENDPOINTS.NICK_DUP;
const TIMEOUT_MS = 15000;

const form = document.getElementById("signup-form");
const submitBtn = document.getElementById("submit-btn");
const errorBox = document.getElementById("form-error");
const successBox = document.getElementById("form-success");
const emailEl = document.getElementById("email");
const pwEl = document.getElementById("password");
const pw2El = document.getElementById("password2");
const nickEl = document.getElementById("username");

// Helper: find help text node next to each input (expects an element with id `<fieldId>-help`)
function setHelp(fieldId, message) {
  const helpEl = document.getElementById(`${fieldId}-help`);
  if (helpEl) helpEl.textContent = message || "";
}

function setFieldState(inputEl, ok) {
  if (!inputEl) return;
  inputEl.classList.toggle("is-valid", !!ok);
  inputEl.classList.toggle("is-invalid", !ok);
}

// 헬퍼텍스트
function validateEmailValue(v) {
  if (!v) return { ok: false, msg: "*이메일을 입력해주세요." };
  if (v.length < 5) return { ok: false, msg: "*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)" };
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(v)) return { ok: false, msg: "*올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)" };
  return { ok: true, msg: "" };
}

function validatePasswordValue(v) {
  if (!v) return { ok: false, msg: "*비밀번호를 입력해주세요" };
  if (v.length < 8 || v.length > 20) return { ok: false, msg: "*비밀번호는 8자 이상, 20자 이하여야 합니다." };
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasSpecial = /[^\w\s]/.test(v);
  if (!(hasUpper && hasLower && hasDigit && hasSpecial)) {
    return { ok: false, msg: "*대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다." };
  }
  return { ok: true, msg: "" };
}

function validatePassword2Value(pw, pw2) {
  if (!pw2) return { ok: false, msg: "*비밀번호를 한번더 입력해주세요" };
  if (pw !== pw2) return { ok: false, msg: "*비밀번호가 다릅니다." };
  return { ok: true, msg: "" };
}

function validateNicknameValue(v) {
  if (!v) return { ok: false, msg: "*닉네임을 입력해주세요." };
  if (/\s/.test(v)) return { ok: false, msg: "*띄어쓰기를 없애주세요" };
  if (v.length > 10) return { ok: false, msg: "*닉네임은 최대 10자 까지 작성 가능합니다." };
  return { ok: true, msg: "" };
}

// Optional duplicate checks (no error thrown if endpoint not available)
async function checkDuplicate(kind, value) {
  const endpoint = kind === "email" ? EMAIL_DUP_ENDPOINT : NICK_DUP_ENDPOINT;
  if (!endpoint) return null; 

  const url = new URL(API.url(endpoint));
  url.searchParams.set(kind, value);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { method: "GET", credentials: "omit", signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null; // silently skip if backend doesn't support
    const data = await res.json().catch(() => undefined);

    if (typeof data === "boolean") return data;

    // Legacy/object forms
    if (data && typeof data.exists === "boolean") return data.exists;
    if (data && typeof data.duplicate === "boolean") return data.duplicate;
    if (data && typeof data.available === "boolean") return !data.available; // available=false => duplicate
    return null;
  } catch (_) {
    clearTimeout(timer);
    return null; // network/CORS/etc. => ignore
  }
}

const state = {
  email: false,
  emailDup: true, // pessimistic until checked
  password: false,
  password2: false,
  nickname: false,
  nickDup: true, // pessimistic until checked
};

function updateSubmitState() {
  const allValid = state.email && !state.emailDup && state.password && state.password2 && state.nickname && !state.nickDup;
  if (submitBtn) {
    submitBtn.disabled = !allValid;
  }
}

// === Wire up validation events ===
if (emailEl) {
  const run = async () => {
    const { ok, msg } = validateEmailValue(emailEl.value.trim());
    setHelp("email", msg);
    setFieldState(emailEl, ok);
    state.email = ok;
    state.emailDup = true; // reset until checked
    if (ok) {
      const dup = await checkDuplicate("email", emailEl.value.trim());
      if (dup === true) {
        setHelp("email", "*중복된 이메일 입니다.");
        setFieldState(emailEl, false);
        state.emailDup = true;
      } else if (dup === false) {
        state.emailDup = false;
      } else {
        state.emailDup = false; // backend check unavailable; allow
      }
    }
    updateSubmitState();
  };
  emailEl.addEventListener("blur", run);
  emailEl.addEventListener("input", () => {
    const { ok, msg } = validateEmailValue(emailEl.value.trim());
    setHelp("email", msg);
    setFieldState(emailEl, ok);
    state.email = ok;
    state.emailDup = true;
    updateSubmitState();
  });
}

if (pwEl) {
  const run = () => {
    const { ok, msg } = validatePasswordValue(pwEl.value);
    setHelp("password", msg);
    setFieldState(pwEl, ok);
    state.password = ok;
    if (pw2El) {
      const r2 = validatePassword2Value(pwEl.value, pw2El.value);
      setHelp("password2", r2.msg);
      setFieldState(pw2El, r2.ok);
      state.password2 = r2.ok;
    }
    updateSubmitState();
  };
  pwEl.addEventListener("blur", run);
  pwEl.addEventListener("input", run);
}

if (pw2El) {
  const run = () => {
    const { ok, msg } = validatePassword2Value(pwEl ? pwEl.value : "", pw2El.value);
    setHelp("password2", msg);
    setFieldState(pw2El, ok);
    state.password2 = ok;
    updateSubmitState();
  };
  pw2El.addEventListener("blur", run);
  pw2El.addEventListener("input", run);
}

if (nickEl) {
  const run = async () => {
    const { ok, msg } = validateNicknameValue(nickEl.value.trim());
    setHelp("username", msg);
    setFieldState(nickEl, ok);
    state.nickname = ok;
    state.nickDup = true;
    if (ok) {
      const dup = await checkDuplicate("nickname", nickEl.value.trim());
      if (dup === true) {
        setHelp("username", "*중복된 닉네임 입니다.");
        setFieldState(nickEl, false);
        state.nickDup = true;
      } else if (dup === false) {
        state.nickDup = false;
      } else {
        state.nickDup = false; // no backend check => allow
      }
    }
    updateSubmitState();
  };
  nickEl.addEventListener("blur", run);
  nickEl.addEventListener("input", () => {
    const { ok, msg } = validateNicknameValue(nickEl.value.trim());
    setHelp("username", msg);
    setFieldState(nickEl, ok);
    state.nickname = ok;
    state.nickDup = true;
    updateSubmitState();
  });
}

// === Submit to backend ===
async function postSignup(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(API.url(SIGNUP_ENDPOINT), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    const hint = err.name === "AbortError"
      ? "Request timed out. Is the backend reachable at the configured URL/port?"
      : "Network/CORS error. Check server is running, URL/port are correct, and CORS is enabled on the backend.";
    console.error("Signup fetch error:", err);
    throw new Error(`Failed to fetch: ${hint}`);
  }

  clearTimeout(timer);

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const text = data.message || data.error || data.detail || await res.text().catch(() => "");
    const msg = text || `Signup failed (${res.status})`;
    throw new Error(msg);
  }

  return data;
}

if (form) {
  // Initial state: disable submit until valid
  updateSubmitState();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (errorBox) errorBox.textContent = "";
    if (successBox) successBox.textContent = "";

    const email = emailEl ? emailEl.value.trim() : "";
    const password = pwEl ? pwEl.value : "";
    const passwordCheck = pw2El ? pw2El.value : "";
    const nickname = nickEl ? nickEl.value.trim() : "";
    const profilePicture = "imageUrl"; // TODO: connect real upload

    const eRes = validateEmailValue(email);
    const pRes = validatePasswordValue(password);
    const p2Res = validatePassword2Value(password, passwordCheck);
    const nRes = validateNicknameValue(nickname);

    setHelp("email", eRes.msg); setFieldState(emailEl, eRes.ok);
    setHelp("password", pRes.msg); setFieldState(pwEl, pRes.ok);
    setHelp("password2", p2Res.msg); setFieldState(pw2El, p2Res.ok);
    setHelp("username", nRes.msg); setFieldState(nickEl, nRes.ok);

    if (!(eRes.ok && pRes.ok && p2Res.ok && nRes.ok)) {
      updateSubmitState();
      return;
    }

    const payload = { email, password, passwordCheck, nickname, profilePicture };

    const prevText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Signing up...";
    }

    try {
      const result = await postSignup(payload);
      if (successBox) successBox.textContent = result.message || "회원가입 성공!";

      window.location.href = "/pages/login/login.html";
    } catch (err) {
      if (errorBox) {
        errorBox.textContent = err.message || "Something went wrong.";
      } else {
        alert(err.message || "Signup failed");
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = prevText || "Sign Up";
      }
    }
  });
}

document.addEventListener("click", (e) => {
  const target = e.target.closest && (e.target.closest("#go-login") || e.target.closest("#go-login-btn"));
  if (target) {
    e.preventDefault();
    window.location.href = "/pages/login/login.html"; // adjust path if needed
  }
});

// 헤더 부분
