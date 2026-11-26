// 공통 스크립트: 모바일 메뉴, 관리자 세션 표시(브라우저 저장소 기반 데모)
(function () {
  var btn = document.querySelector('.nav-toggle');
  var nav = document.getElementById('gnb');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var isAdmin = false;
  try { isAdmin = localStorage.getItem('sd_admin_session') === 'on'; } catch (err) { isAdmin = false; }
  document.querySelectorAll('[data-admin-only]').forEach(function (el) { el.hidden = !isAdmin; });
  document.querySelectorAll('[data-visitor-only]').forEach(function (el) { el.hidden = isAdmin; });
})();
