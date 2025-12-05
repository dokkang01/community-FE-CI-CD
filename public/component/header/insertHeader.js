// Reusable header injector + optional profile menu and back button
// Usage:
//   import { mountHeader } from "/component/header/insertHeader.js";
//   const header = await mountHeader(); // default: adds avatar menu, no back button
//   // Examples:
//   // await mountHeader("header-placeholder", { addProfileMenu: false });
//   // await mountHeader("header-placeholder", { addBackButton: true, backHref: "/pages/home/home.html" });
//   // await mountHeader("header-placeholder", { addProfileMenu: false, addBackButton: true, backHref: "/pages/login/login.html" });

export async function mountHeader(placeholderId = "header-placeholder", opts = {}) {
  const {
    addProfileMenu = true,
    addBackButton = false,
    backHref = null, // when set, back button navigates here (ignores history)
  } = opts;

  const mount = document.getElementById(placeholderId);
  if (!mount) {
    console.warn(`[mountHeader] Placeholder #${placeholderId} not found.`);
    return null;
  }

  // Fetch and mount the shared header shell
  try {
    const res = await fetch("/component/header/header.html", { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    mount.innerHTML = html;
  } catch (err) {
    console.error("[mountHeader] Failed to load header.html:", err);
    return null;
  }

  // Expose refs for per-page customization
  const refs = {
    root: mount.querySelector("header"),
    left: document.getElementById("header-left"),
    right: document.getElementById("header-right"),
    title: mount.querySelector(".header-title"),
    back: null,
    avatar: null,
  };

  // Optionally add the left-side back button (with fixed destination)
  if (addBackButton && refs.left) {
    refs.back = addBackButtonTo(refs.left, backHref);
  }

  // Optionally add the right-side profile avatar + dropdown
  if (addProfileMenu && refs.right) {
    refs.avatar = addProfileDropdown(refs.right);
  }

  return refs;
}

function addBackButtonTo(container, href) {
  // Create a semantic button with an inline SVG arrow (no reliance on ::before)
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "header-back"; // style in CSS as needed
  btn.setAttribute("aria-label", "뒤로가기");
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
      <path d="M15.5 19l-7-7 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

  // Navigate to a fixed URL when pressed; fallback to root if none provided
  const target = typeof href === "string" && href.trim() ? href : "/";
  btn.addEventListener("click", () => {
    try {
      window.location.assign(target);
    } catch (_) {
      window.location.href = target;
    }
  });

  // Prefer prepending so it sits at the far-left by default
  if (container.firstChild) {
    container.insertBefore(btn, container.firstChild);
  } else {
    container.appendChild(btn);
  }

  return btn;
}

function addProfileDropdown(container) {
  // 기본 아바타 이미지를 먼저 사용하고, 이후 /users/me로 실제 프로필 사진을 덮어씌운다.
  let avatarUrl = "/assets/images/default-user.png";
  try {
    const cached = localStorage.getItem("profilePicture");
    if (cached) avatarUrl = cached;
  } catch (_) {}

  const img = document.createElement("img");
  img.className = "header-avatar";
  img.alt = "사용자 프로필";
  img.src = avatarUrl;
  container.appendChild(img);

  // 비동기로 백엔드에서 최신 프로필 이미지를 가져와 아바타를 갱신
  hydrateAvatarFromProfile(img);

  const menu = document.createElement("div");
  menu.className = "header-menu";
  menu.innerHTML = `
    <button type="button" data-action="profile">회원정보 수정</button>
    <button type="button" data-action="password">비밀번호 수정</button>
    <button type="button" data-action="logout">로그아웃</button>
  `;
  container.appendChild(menu);

  function toggleMenu() { menu.classList.toggle("open"); }
  function closeMenu() { menu.classList.remove("open"); }

  img.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });
  document.addEventListener("click", (e) => {
    if (!container.contains(e.target)) closeMenu();
  });

  menu.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const act = btn.getAttribute("data-action");
    if (act === "profile") {
      window.location.href = "/pages/updateUserInfo/updateUserInfo.html"; 
    } else if (act === "password") {
      window.location.href = "/pages/updateUserPassword/updateUserPassword.html"; 
    } else if (act === 'logout') {
      try {
        await fetch(API.url(API.ENDPOINTS.LOGOUT), {
          method: 'POST',
          credentials: 'include',
          keepalive: true
        });
      } catch (_) {}
      try { sessionStorage.removeItem('accessToken'); } catch (_) {}
      try { localStorage.removeItem('authToken'); } catch (_) {}
      try { localStorage.removeItem('loginResult'); } catch (_) {}
      window.location.href = '/pages/login/login.html';
    }
  });

  return img;
}

async function hydrateAvatarFromProfile(imgEl) {
  if (!window.API || !API.ENDPOINTS || !API.ENDPOINTS.USERS_ME) return;

  try {
    const res = await fetch(API.url(API.ENDPOINTS.USERS_ME), {
      credentials: "include",
    });
    if (!res.ok) return;

    const user = await res.json().catch(() => null);
    if (!user || !user.profilePicture) {
      // 프로필 사진이 없으면 기본 이미지로 되돌리고 캐시 제거
      const DEFAULT_AVATAR = "/assets/images/user.png";
      imgEl.src = DEFAULT_AVATAR;
      try { localStorage.removeItem("profilePicture"); } catch (_) {}
      return;
    }

    let url = user.profilePicture;

    // 백엔드가 key만 내려줄 경우(예: "PROFILE/123.jpg"), S3 base URL을 직접 붙여준다.
    if (!/^https?:\/\//.test(url)) {
      const S3_BASE = "https://express-backend-roy.s3.ap-northeast-2.amazonaws.com/";
      url = S3_BASE.replace(/\/$/, "") + "/" + user.profilePicture.replace(/^\//, "");
    }

    imgEl.src = url;
    try {
      localStorage.setItem("profilePicture", url);
    } catch (_) {}
  } catch (e) {
    console.error("[header] Failed to hydrate avatar from /users/me:", e);
  }
}