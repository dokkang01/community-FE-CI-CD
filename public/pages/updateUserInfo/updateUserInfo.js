// 회원정보 수정 페이지 로직
// - 현재 로그인한 사용자 정보 불러오기 (/users/me)
// - 프로필 사진 표시 및 변경 (S3 업로드 via ImageUploader)
// - 닉네임 변경 및 중복 체크 (/users/check-nickname)
// - PATCH /users/{id} 로 변경사항 저장

(function () {
  const DEFAULT_AVATAR = "/assets/images/user.png";
  const S3_BASE = "https://express-backend-roy.s3.ap-northeast-2.amazonaws.com/";

  const avatarWrap = document.getElementById("avatarWrap");
  const avatarImg = document.getElementById("avatarImg");
  const avatarFile = document.getElementById("avatarFile");
  const nicknameInput = document.getElementById("nicknameInput");
  const saveBtn = document.getElementById("saveBtn");
  const doneBtn = document.getElementById("doneBtn");
  const deleteBtn = document.getElementById("deleteBtn");

  if (!avatarWrap || !avatarImg || !avatarFile || !nicknameInput || !saveBtn) {
    console.error("[updateUserInfo] 필수 DOM 요소를 찾을 수 없습니다.");
    return;
  }

  let currentUserId = null;
  let originalNickname = "";
  let originalProfileKey = "";
  let profilePictureKey = "";
  let nicknameDuplicate = false;

  function buildProfileImageUrl(key) {
    if (!key) return DEFAULT_AVATAR;
    if (/^https?:\/\//.test(key)) return key;
    return S3_BASE.replace(/\/$/, "") + "/" + key.replace(/^\//, "");
  }

  function ensureNicknameHelper() {
    let helper = document.getElementById("nicknameHelper");
    if (!helper) {
      helper = document.createElement("p");
      helper.id = "nicknameHelper";
      helper.className = "hint"; // CSS에서 스타일 지정 가능
      nicknameInput.insertAdjacentElement("afterend", helper);
    }
    return helper;
  }

  async function loadCurrentUser() {
    if (!window.API || !API.ENDPOINTS || !API.ENDPOINTS.USERS_ME) {
      console.error("[updateUserInfo] API 설정을 찾을 수 없습니다.");
      return;
    }

    try {
      const res = await fetch(API.url(API.ENDPOINTS.USERS_ME), {
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = "/pages/login/login.html";
        return;
      }

      if (!res.ok) {
        console.error("[updateUserInfo] /users/me 요청 실패", res.status);
        return;
      }

      const user = await res.json();

      currentUserId = user.id;
      originalNickname = user.nickname || "";
      originalProfileKey = user.profilePicture || ""; // S3 key 또는 빈 문자열
      profilePictureKey = originalProfileKey;

      nicknameInput.value = originalNickname;
      avatarImg.src = buildProfileImageUrl(profilePictureKey);
    } catch (e) {
      console.error("[updateUserInfo] 사용자 정보 로드 중 오류", e);
    }
  }

  async function checkNicknameDuplicate() {
    const helper = ensureNicknameHelper();
    const nickname = nicknameInput.value.trim();

    // 비어 있거나 기존 닉네임이면 중복 체크하지 않음
    if (!nickname || nickname === originalNickname) {
      helper.textContent = "";
      nicknameDuplicate = false;
      return;
    }

    if (!window.API || !API.ENDPOINTS || !API.ENDPOINTS.NICK_DUP) {
      console.error("[updateUserInfo] 닉네임 중복 체크 ENDPOINT 미설정");
      helper.textContent = "닉네임 중복 확인을 할 수 없습니다.";
      nicknameDuplicate = false;
      return;
    }

    try {
      const url = API.url(API.ENDPOINTS.NICK_DUP) + `?nickname=${encodeURIComponent(nickname)}`;
      const res = await fetch(url);
      if (!res.ok) {
        helper.textContent = "닉네임 중복 확인 중 오류가 발생했습니다.";
        nicknameDuplicate = false;
        return;
      }

      const exists = await res.json(); // true = 이미 존재, false = 사용 가능
      if (exists) {
        helper.textContent = "이미 사용 중인 닉네임입니다.";
        nicknameDuplicate = true;
      } else {
        helper.textContent = "사용 가능한 닉네임입니다.";
        nicknameDuplicate = false;
      }
    } catch (e) {
      console.error("[updateUserInfo] 닉네임 중복 체크 오류", e);
      helper.textContent = "닉네임 중복 확인 중 오류가 발생했습니다.";
      nicknameDuplicate = false;
    }
  }

  async function handleAvatarFileChange(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!window.ImageUploader || typeof window.ImageUploader.uploadImage !== "function") {
      alert("이미지 업로드 모듈을 찾을 수 없습니다.");
      return;
    }

    try {
      const key = await window.ImageUploader.uploadImage("PROFILE", file);
      profilePictureKey = key;
      // 선택한 파일로 미리보기 표시
      avatarImg.src = URL.createObjectURL(file);
    } catch (err) {
      console.error("[updateUserInfo] 이미지 업로드 실패", err);
      alert("이미지 업로드 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }

  async function handleSave() {
    if (!currentUserId) {
      alert("사용자 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const nickname = nicknameInput.value.trim();

    // 닉네임이 변경되었다면 중복 체크
    if (nickname && nickname !== originalNickname) {
      await checkNicknameDuplicate();
      if (nicknameDuplicate) {
        alert("이미 사용 중인 닉네임입니다. 다른 닉네임을 입력해주세요.");
        return;
      }
    }

    const payload = {};

    if (nickname && nickname !== originalNickname) {
      payload.nickname = nickname;
    }

    if (profilePictureKey && profilePictureKey !== originalProfileKey) {
      payload.profilePicture = profilePictureKey;
    }

    if (Object.keys(payload).length === 0) {
      alert("변경된 내용이 없습니다.");
      return;
    }

    try {
      // API.BASE_URL은 이미 /api 까지 포함하고 있으므로 /users/{id} 경로만 붙인다.
      const res = await fetch(API.url(`/users/${currentUserId}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.error("[updateUserInfo] 사용자 정보 수정 실패", res.status);
        alert("회원정보 수정에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      const updated = await res.json();

      originalNickname = updated.nickname || nickname;
      originalProfileKey = updated.profilePicture || profilePictureKey;
      profilePictureKey = originalProfileKey;

      avatarImg.src = buildProfileImageUrl(profilePictureKey);
      alert("회원정보가 수정되었습니다.");
    } catch (e) {
      console.error("[updateUserInfo] 사용자 정보 수정 중 오류", e);
      alert("회원정보 수정 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  function initEvents() {
    // 아바타 클릭 시 파일 선택
    avatarWrap.addEventListener("click", () => avatarFile.click());
    avatarWrap.addEventListener("keypress", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        avatarFile.click();
      }
    });

    avatarFile.addEventListener("change", handleAvatarFileChange);

    // 닉네임 입력 후 포커스가 빠져나갈 때 중복 체크
    nicknameInput.addEventListener("blur", () => {
      void checkNicknameDuplicate();
    });

    // 수정하기 버튼
    saveBtn.addEventListener("click", () => {
      void handleSave();
    });

    // 수정 완료 버튼: 게시판으로 이동
    if (doneBtn) {
      doneBtn.addEventListener("click", () => {
        window.location.href = "/pages/board/board.html";
      });
    }

    // 회원탈퇴 버튼(아직 미구현)
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        alert("회원탈퇴 기능은 아직 구현되지 않았습니다.");
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    initEvents();
    void loadCurrentUser();
  });
})();
