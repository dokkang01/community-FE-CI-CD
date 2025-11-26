const LIST_ENDPOINT = "/board/posts"; // connect this to listRecentPosts()

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const errorEl = document.getElementById('error');
let allPosts = [];

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

function avatarUrl(url, nickname) {
  if (url) return url;
  const initial = (nickname || '?').toString().trim().charAt(0).toUpperCase() || 'U';
  return `https://via.placeholder.com/80x80.png?text=${encodeURIComponent(initial)}`;
}

function showSkeletons(n = 5) {
  listEl.innerHTML = '';
  if (emptyEl) emptyEl.style.display = 'none';
  if (errorEl) errorEl.style.display = 'none';
  for (let i = 0; i < n; i++) {
    const sk = document.createElement('div');
    sk.className = 'skeleton';
    listEl.appendChild(sk);
  }
}

function renderList(items) {
  listEl.innerHTML = '';
  if (!items || items.length === 0) {
    emptyEl.style.display = 'block';
    return;
  }
  emptyEl.style.display = 'none';

  const frag = document.createDocumentFragment();
  items.forEach(p => {
    const a = document.createElement('a');
    a.className = 'title';
    a.textContent = p.title;
    a.href = `/pages/post/detail.html?id=${p.id}`;

    const avatar = document.createElement('img');
    avatar.className = 'avatar';
    avatar.alt = `${p.authorNickname || '작성자'}의 프로필 이미지`;
    avatar.src = avatarUrl(p.authorProfilePicture, p.authorNickname);

    const meta = document.createElement('div');
    meta.className = 'meta';
    const subtitle = document.createElement('div');
    subtitle.className = 'subtitle';
    subtitle.textContent = `${p.authorNickname || ''}`;
    meta.appendChild(a);
    meta.appendChild(subtitle);

    const date = document.createElement('div');
    date.className = 'date';
    date.textContent = fmtDate(p.createdTime);

    const item = document.createElement('div');
    item.className = 'item';
    item.appendChild(avatar);
    item.appendChild(meta);
    item.appendChild(date);

    frag.appendChild(item);
  });
  listEl.appendChild(frag);
}


async function fetchPosts() {
  const res = await fetch(API.url(LIST_ENDPOINT), { credentials: 'include' });
  if (!res.ok) throw new Error('게시글을 불러오지 못했습니다.');
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('서버 응답 형식이 올바르지 않습니다.');
  return data;
}

(async function init() {
  showSkeletons(4);
  try {
    allPosts = await fetchPosts();
    renderList(allPosts);
  } catch (err) {
    listEl.innerHTML = '';
    errorEl.textContent = err.message || '목록을 불러오지 못했습니다.';
    errorEl.style.display = 'block';
  }
})();