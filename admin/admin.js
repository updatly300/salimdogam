// 살림도감 CMS-lite 데모: data/*.json 을 불러와 브라우저 저장소(localStorage)에서 편집하고 JSON으로 내보낸다.
// 실제 인증·서버 저장이 없다. 사이트 반영은 내보낸 JSON을 data 폴더에 넣고 build.py 를 다시 실행한다.
(function () {
  var KEY = 'sd_cms_data', SESSION = 'sd_admin_session';
  var D = null;
  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var today = function () { var d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function save() { store(KEY, JSON.stringify(D)); }

  function loadDefaults() {
    var names = ['site', 'categories', 'posts', 'columns'];
    return Promise.all(names.map(function (n) { return fetch('/data/' + n + '.json').then(function (r) { return r.json(); }); }))
      .then(function (a) { return { site: a[0], categories: a[1], posts: a[2], columns: a[3] }; });
  }

  function init() {
    if (store(SESSION) !== 'on') { $('#login').hidden = false; $('#app').hidden = true; return; }
    $('#login').hidden = true; $('#app').hidden = false;
    var saved = store(KEY);
    var p = saved ? Promise.resolve(JSON.parse(saved)) : loadDefaults();
    p.then(function (d) { D = d; save(); route(); }).catch(function () { $('#view').innerHTML = '<p>기본 데이터를 불러오지 못했습니다. build.py로 만든 dist 폴더를 웹 서버로 열었는지 확인하세요.</p>'; });
  }

  $('#loginBtn').onclick = function () { store(SESSION, 'on'); init(); };
  $('#logoutBtn').onclick = function () { store(SESSION, null); location.hash = ''; init(); };
  window.addEventListener('hashchange', route);

  function route() {
    if (!D) return;
    var h = (location.hash || '#/dashboard').slice(2).split('/');
    document.querySelectorAll('.side nav a').forEach(function (a) { a.classList.toggle('on', a.dataset.r === h[0]); });
    var v = $('#view');
    if (h[0] === 'posts' && h[1] === 'new') return editForm('posts', null);
    if (h[0] === 'posts' && h[1] === 'edit') return editForm('posts', decodeURIComponent(h[2]));
    if (h[0] === 'columns' && h[1] === 'new') return editForm('columns', null);
    if (h[0] === 'columns' && h[1] === 'edit') return editForm('columns', decodeURIComponent(h[2]));
    ({ posts: function () { list('posts'); }, columns: function () { list('columns'); }, categories: cats, settings: settings, data: data }[h[0]] || dash)();
    window.scrollTo(0, 0);
    function dash() {
      var all = D.posts.concat(D.columns);
      var recent = all.slice().sort(function (a, b) { return (b.updated || b.published).localeCompare(a.updated || a.published); }).slice(0, 5);
      var pub = all.filter(function (x) { return (x.status || 'published') === 'published'; }).length;
      v.innerHTML = '<h1 class="at">대시보드</h1><div class="stats">' +
        stat('전체 글', D.posts.length) + stat('칼럼', D.columns.length) + stat('카테고리', D.categories.length) +
        stat('추천 글', D.posts.filter(function (x) { return x.featured; }).length) + stat('발행', pub) + stat('초안', all.length - pub) +
        '</div><div class="panel"><h2>최근 수정한 콘텐츠</h2><ul>' + recent.map(function (x) {
          var t = D.posts.indexOf(x) > -1 ? 'posts' : 'columns';
          return '<li><a href="#/' + t + '/edit/' + encodeURIComponent(x.slug) + '">' + esc(x.title) + '</a> <span class="hint">' + esc(x.updated || x.published) + '</span></li>';
        }).join('') + '</ul></div>';
    }
  }
  function stat(n, c) { return '<div class="stat"><b>' + c + '</b>' + n + '</div>'; }

  function list(type) {
    var isCol = type === 'columns';
    var rows = D[type].map(function (x) {
      var cat = isCol ? '운영자 칼럼' : ((D.categories.find(function (c) { return c.slug === x.category; }) || {}).name || '');
      var st = (x.status || 'published') === 'published';
      return '<tr><td><a href="#/' + type + '/edit/' + encodeURIComponent(x.slug) + '"><b>' + esc(x.title) + '</b></a><br><span class="hint">/' + (isCol ? 'columns' : 'posts') + '/' + esc(x.slug) + '/</span></td><td>' + esc(cat) + '</td><td><span class="badge ' + (st ? 'pub' : '') + '">' + (st ? '발행' : '초안') + '</span>' + (x.featured ? ' <span class="badge">추천</span>' : '') + '</td><td>' + esc(x.updated || x.published) + '</td><td><button class="abtn del" data-del="' + esc(x.slug) + '">삭제</button></td></tr>';
    }).join('');
    $('#view').innerHTML = '<h1 class="at">' + (isCol ? '칼럼' : '글') + ' <a class="abtn sec" href="#/' + type + '/new">새 ' + (isCol ? '칼럼' : '글') + ' 작성</a></h1>' +
      (isCol ? '<p class="col-note">칼럼은 운영자의 관점·정리 글입니다. 일반 정보 글과 구분해 「운영자 칼럼」으로 표시되고 작성자는 ' + esc(D.site.owner) + '로 연결됩니다.</p>' : '') +
      '<table class="list"><thead><tr><th>제목</th><th>분류</th><th>상태</th><th>수정일</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>';
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('이 브라우저의 편집 데이터에서 삭제합니다. 계속할까요?')) return;
        D[type] = D[type].filter(function (x) { return x.slug !== b.dataset.del; }); save(); list(type);
      };
    });
  }

  function editForm(type, slug) {
    var isCol = type === 'columns';
    var x = slug ? D[type].find(function (i) { return i.slug === slug; }) : null;
    var it = x ? JSON.parse(JSON.stringify(x)) : { slug: '', title: '', summary: '', subtitle: '', category: isCol ? '' : D.categories[0].slug, body: '', faq: [], related: [], featured: false, status: 'draft', published: today(), updated: today() };
    var catOpts = D.categories.map(function (c) { return '<option value="' + esc(c.slug) + '"' + (c.slug === it.category ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('');
    var faqText = (it.faq || []).map(function (f) { return 'Q: ' + f.q + '\nA: ' + f.a.replace(/<[^>]+>/g, ''); }).join('\n\n');
    $('#view').innerHTML = '<h1 class="at">' + (x ? '편집: ' + esc(it.title) : (isCol ? '새 칼럼 작성' : '새 글 작성')) + '</h1>' +
      (isCol ? '<p class="col-note">칼럼 메모·관점 글 편집 화면입니다. 겪지 않은 경험을 지어내지 말고 "요즘 자주 보이는 질문"처럼 정직하게 쓰세요.</p>' : '') +
      '<div class="form"><div class="box">' +
      '<label>제목</label><input type="text" id="f_title" value="' + esc(it.title) + '">' +
      '<label>슬러그(주소)</label><input type="text" id="f_slug" value="' + esc(it.slug) + '"><p class="hint">영문 소문자와 하이픈. 예: washing-machine-tub-cleaning</p>' +
      '<label>요약</label><textarea id="f_summary">' + esc(it.summary) + '</textarea>' +
      (isCol ? '<label>칼럼 메모(관점 한 줄)</label><input type="text" id="f_subtitle" value="' + esc(it.subtitle || '') + '">' : '') +
      '<label>본문(HTML)</label><textarea class="body" id="f_body">' + esc(it.body) + '</textarea>' +
      '<label>자주 묻는 질문</label><textarea id="f_faq" placeholder="Q: 질문&#10;A: 답">' + esc(faqText) + '</textarea>' +
      '<label>관련 글 슬러그(쉼표로 구분)</label><input type="text" id="f_related" value="' + esc((it.related || []).join(', ')) + '">' +
      '</div><div><div class="box">' +
      (isCol ? '' : '<label>카테고리</label><select id="f_cat">' + catOpts + '</select><label><input type="checkbox" id="f_feat"' + (it.featured ? ' checked' : '') + '> 추천 글</label>') +
      '<label>발행 상태</label><select id="f_status"><option value="draft"' + (it.status === 'draft' ? ' selected' : '') + '>초안</option><option value="published"' + ((it.status || 'published') === 'published' ? ' selected' : '') + '>발행</option></select>' +
      '<label>작성일</label><input type="date" id="f_pub" value="' + esc(it.published) + '">' +
      '<label>수정일</label><input type="date" id="f_upd" value="' + esc(it.updated || it.published) + '">' +
      '<p><button class="abtn" id="saveBtn">저장</button> <button class="abtn sec" id="prevBtn">미리보기</button></p><p class="hint" id="msg"></p>' +
      '</div></div></div><div id="prev"></div>';
    function collect() {
      it.title = $('#f_title').value.trim(); it.slug = $('#f_slug').value.trim(); it.summary = $('#f_summary').value.trim();
      it.body = $('#f_body').value; it.status = $('#f_status').value; it.published = $('#f_pub').value; it.updated = $('#f_upd').value;
      it.related = $('#f_related').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      it.faq = $('#f_faq').value.split(/\n\s*\n/).map(function (b) { var m = b.match(/Q:\s*([\s\S]*?)\nA:\s*([\s\S]*)/); return m ? { q: m[1].trim(), a: '<p>' + esc(m[2].trim()) + '</p>' } : null; }).filter(Boolean);
      if (isCol) { it.subtitle = $('#f_subtitle').value.trim(); delete it.category; } else { it.category = $('#f_cat').value; it.featured = $('#f_feat').checked; }
    }
    $('#saveBtn').onclick = function () {
      collect();
      if (!it.title || !/^[a-z0-9-]+$/.test(it.slug)) { $('#msg').textContent = '제목과 슬러그(영문 소문자·숫자·하이픈)를 확인하세요.'; return; }
      var i = D[type].findIndex(function (a) { return a.slug === (slug || it.slug); });
      if (!slug && i > -1) { $('#msg').textContent = '같은 슬러그가 이미 있습니다.'; return; }
      if (i > -1) D[type][i] = it; else D[type].push(it);
      save(); $('#msg').textContent = '이 브라우저에 저장했습니다. 사이트 반영은 데이터 내보내기 후 build.py 실행이 필요합니다.';
      if (!slug) location.hash = '#/' + type + '/edit/' + encodeURIComponent(it.slug);
    };
    $('#prevBtn').onclick = function () { collect(); $('#prev').innerHTML = '<div class="preview"><h1>' + esc(it.title) + '</h1><p><i>' + esc(it.summary) + '</i></p>' + it.body + '</div>'; };
  }

  function cats() {
    $('#view').innerHTML = '<h1 class="at">카테고리</h1><table class="list"><thead><tr><th>이름</th><th>슬러그</th><th>소개</th><th>글 수</th></tr></thead><tbody>' +
      D.categories.map(function (c, i) {
        return '<tr><td><input type="text" data-ci="' + i + '" data-k="name" value="' + esc(c.name) + '"></td><td>' + esc(c.slug) + '</td><td><textarea data-ci="' + i + '" data-k="description" rows="3" style="width:100%">' + esc(c.description) + '</textarea></td><td>' + D.posts.filter(function (p) { return p.category === c.slug; }).length + '</td></tr>';
      }).join('') + '</tbody></table><p><button class="abtn" id="catSave">저장</button> <span class="hint" id="msg"></span></p>';
    $('#catSave').onclick = function () {
      document.querySelectorAll('[data-ci]').forEach(function (el) { D.categories[+el.dataset.ci][el.dataset.k] = el.value; });
      save(); $('#msg').textContent = '저장했습니다.';
    };
  }

  function settings() {
    var f = [['name', '사이트명'], ['tagline', '한줄 소개'], ['owner', '운영자명'], ['ownerBio', '운영자 소개 문구'], ['email', '이메일'], ['mainColor', '메인 컬러'], ['subColor', '서브 컬러'], ['url', '기본 도메인']];
    $('#view').innerHTML = '<h1 class="at">사이트 설정</h1><div class="panel">' + f.map(function (a) {
      return '<label style="display:block;font-weight:600;margin-top:10px">' + a[1] + '</label><input type="text" style="width:100%;padding:6px" data-s="' + a[0] + '" value="' + esc(D.site[a[0]]) + '">';
    }).join('') + '<p class="hint">실제 사이트의 값은 data/site.json 한 곳에서 바뀝니다. 여기서 바꾼 값은 내보내기 후 그 파일에 반영하세요.</p><p><button class="abtn" id="setSave">저장</button> <span class="hint" id="msg"></span></p></div>';
    $('#setSave').onclick = function () {
      document.querySelectorAll('[data-s]').forEach(function (el) { D.site[el.dataset.s] = el.value; });
      save(); $('#msg').textContent = '저장했습니다.';
    };
  }

  function data() {
    $('#view').innerHTML = '<h1 class="at">데이터 내보내기·가져오기</h1><div class="panel"><h2>내보내기</h2><p>파일 4개(site, categories, posts, columns)를 받습니다. data 폴더의 같은 이름 파일과 바꾼 뒤 <code>python build.py</code>를 실행하면 사이트에 반영됩니다.</p><button class="abtn" id="exp">JSON 내보내기</button></div>' +
      '<div class="panel"><h2>가져오기</h2><p>예전에 내보낸 전체 백업 파일(salimdogam-backup.json)을 불러옵니다.</p><input type="file" id="imp" accept="application/json"> <button class="abtn sec" id="bak">전체 백업 파일 받기</button></div>' +
      '<div class="panel"><h2>초기화</h2><p>이 브라우저의 편집 내용을 지우고 사이트의 기본 데이터를 다시 불러옵니다.</p><button class="abtn del" id="reset">기본 데이터로 되돌리기</button></div><p class="hint" id="msg"></p>';
    function dl(name, obj) { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 1)], { type: 'application/json' })); a.download = name; a.click(); }
    $('#exp').onclick = function () { dl('site.json', D.site); dl('categories.json', D.categories); dl('posts.json', D.posts); dl('columns.json', D.columns); };
    $('#bak').onclick = function () { dl('salimdogam-backup.json', D); };
    $('#imp').onchange = function (ev) {
      var r = new FileReader();
      r.onload = function () { try { var d = JSON.parse(r.result); if (!d.site || !d.posts) throw 0; D = d; save(); $('#msg').textContent = '불러왔습니다.'; } catch (e) { $('#msg').textContent = '백업 파일 형식이 아닙니다.'; } };
      r.readAsText(ev.target.files[0]);
    };
    $('#reset').onclick = function () { if (!confirm('편집 내용을 지울까요?')) return; store(KEY, null); loadDefaults().then(function (d) { D = d; save(); $('#msg').textContent = '기본 데이터로 되돌렸습니다.'; }); };
  }

  init();
})();
