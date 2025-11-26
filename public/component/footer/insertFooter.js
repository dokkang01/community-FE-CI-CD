export async function insertFooter() {
  const footerResponse = await fetch("/component/footer/footer.html");
  const footerHTML = await footerResponse.text();
  document.body.insertAdjacentHTML("beforeend", footerHTML);

  // footer.css 추가
  // 링크 경로 수정 (프론트에서 백엔드로 이동)
  document.querySelectorAll('.site-footer a[href="/terms"], .site-footer a[href="/privacy"]').forEach(link => {
    link.href = API.BASE_URL + link.getAttribute('href');
    link.target = "_blank"; // 선택사항: 새 탭에서 열기
  });
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/component/footer/footer.css";
  document.head.appendChild(link);
}