export async function ensureAuthPage() {
  const loginPage = '/pages/login/login.html';

  let at = null;
  try { at = sessionStorage.getItem('accessToken'); } catch (_) {}

  if (!at) {
    try { at = localStorage.getItem('authToken'); } catch (_) {}
  }

  if (!at) {
    try {
      const raw = localStorage.getItem('loginResult');
      if (raw) {
        const obj = JSON.parse(raw);
        at = obj.accessToken || obj.token || obj.message || null;
      }
    } catch (_) {}
  }

  if (!at) {
    alert('로그인이 필요합니다. 다시 로그인해주세요.');
    window.location.replace(loginPage);
    return false;
  }

  try {
    const res = await fetch(API.url(API.ENDPOINTS.USERS_ME), {
      headers: { Authorization: `Bearer ${at}` },
      credentials: 'include'
    });
    if (res.status !== 200) {
      alert('세션이 만료되었습니다. 다시 로그인해주세요.');
      window.location.replace(loginPage);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('Auth check failed:', e);
    alert('네트워크 오류입니다. 다시 로그인해주세요.');
    window.location.replace(loginPage);
    return false;
  }
}

export function setAccessToken(token) {
  sessionStorage.setItem('accessToken', token);
}
export function clearAccessToken() {
  sessionStorage.removeItem('accessToken');
}
