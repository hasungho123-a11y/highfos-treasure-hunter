// 하이포스 트레저 헌터 - 선생님 화면
const $ = s => document.querySelector(s);
const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const KIND = { daily: "매일", weekly: "매주", challenge: "도전" };
const fmt = ms => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
let D = null, tab = "req", cls = "all", selQ = null, selS = new Set(), selR = new Set(), detail = null, confirmBox = null, editQ = null, editR = null, issued = null, busy = false;

async function api(path, body) {
  const r = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const d = await r.json().catch(() => ({ error: "연결이 끊겼어요" }));
  if (r.status === 401 && !path.includes("login") && !path.includes("setup")) { showAuth(); throw new Error(d.error); }
  if (!r.ok) throw new Error(d.error || "문제가 생겼어요");
  return d;
}
function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => t.hidden = true, 3500); }

/* ---------- 로그인 / 처음 설정 ---------- */
let setupMode = false;
async function showAuth() {
  $("#app").hidden = true; $("#auth").hidden = false;
  const s = await api("/api/setup").catch(() => ({ needsSetup: false }));
  setupMode = s.needsSetup;
  $("#authTitle").textContent = setupMode ? "선생님 계정 만들기" : "선생님 로그인";
  $("#authHelp").textContent = setupMode ? "처음 한 번만 하는 설정이에요. 배포할 때 정한 설정 코드와, 앞으로 쓸 아이디·비밀번호(4자 이상)를 입력하세요." : "";
  $("#codeWrap").hidden = !setupMode; $("#au-go").textContent = setupMode ? "계정 만들기" : "로그인";
  $("#au-pw").autocomplete = setupMode ? "new-password" : "current-password";
}
$("#authForm").onsubmit = async e => {
  e.preventDefault(); $("#au-err").textContent = "";
  try {
    if (setupMode) await api("/api/setup", { setupCode: $("#au-code").value, username: $("#au-user").value, password: $("#au-pw").value });
    else await api("/api/teacher/login", { username: $("#au-user").value, password: $("#au-pw").value });
    $("#au-pw").value = ""; await load();
  } catch (err) { $("#au-err").textContent = err.message; }
};

async function load() {
  D = await api("/api/t/state");
  $("#auth").hidden = true; $("#app").hidden = false; render();
}
setInterval(() => { if (D && !document.hidden && !busy && !document.activeElement?.matches("input,select")) load().catch(() => {}); }, 15000);

/* ---------- 공통 계산 ---------- */
const clsName = id => D.classes.find(c => c.id === id)?.name || "";
const inCls = x => cls === "all" || x.class_id === cls;
const students = () => D.students.filter(inCls).sort((a, b) => clsName(a.class_id).localeCompare(clsName(b.class_id), "ko") || a.nickname.localeCompare(b.nickname, "ko"));
const classChips = () => D.classes.length < 2 ? "" : `<div class="chips">${[["all", "전체"], ...D.classes.map(c => [String(c.id), c.name])].map(([v, n]) => `<button class="chip" data-act="cls" data-v="${v}" aria-pressed="${String(cls) === v}">${esc(n)}</button>`).join("")}</div>`;
const waiting = () => D.chests.filter(c => c.status === "opened");
const poolTotal = () => D.rewards.filter(r => r.weight > 0 && (r.stock === null || r.stock > 0)).reduce((a, r) => a + r.weight, 0);
const chance = r => { const t = poolTotal(); return r.weight > 0 && (r.stock === null || r.stock > 0) && t ? Math.round(r.weight / t * 1000) / 10 + "%" : "안 나옴"; };

const TABS = [["req", "요청 확인"], ["chest", "보물 전달"], ["grant", "미션 지급"], ["crew", "탐험대원"], ["items", "미션·보물"], ["season", "시즌"], ["logs", "기록"]];
function render() {
  $("#seasonName").textContent = `${D.season.name} · ${D.teacher}`;
  const cnt = k => k === "req" ? D.requests.length : k === "chest" ? waiting().length : 0;
  $("#nav").innerHTML = TABS.map(([k, n]) => `<button data-act="tab" data-v="${k}" aria-current="${k === tab}">${n}${cnt(k) ? `<span class="cnt">${cnt(k)}</span>` : ""}</button>`).join("") + `<button data-act="logout">로그아웃</button>`;
  const keep = [...document.querySelectorAll("#view input[id], #view select[id]")].map(el => [el.id, el.value]);
  $("#view").innerHTML = { req: vReq, chest: vChest, grant: vGrant, crew: vCrew, items: vItems, season: vSeason, logs: vLogs }[tab]();
  for (const [id, v] of keep) { const el = document.getElementById(id); if (el && !el.dataset.fresh) el.value = v; }
}

function vReq() {
  const rs = D.requests.filter(inCls);
  for (const id of [...selR]) if (!rs.some(r => r.id === id)) selR.delete(id);
  return `<section class="panel"><div class="row between"><h2>미션 완료 확인</h2>${classChips()}</div>
    ${rs.length ? `<div class="row"><button class="btn sm" data-act="selrall">모두 선택</button><button class="btn sm ghost" data-act="selrnone">선택 해제</button>
      <span style="flex:1"></span><button class="btn primary" data-act="approve" ${selR.size ? "" : "disabled"}>${selR.size}개 승인</button><button class="btn danger" data-act="reject" ${selR.size ? "" : "disabled"}>거절</button></div>
      ${rs.map(r => `<label class="req"><input type="checkbox" data-act="selr" data-v="${r.id}" ${selR.has(r.id) ? "checked" : ""}>
        <span><b>${esc(r.avatar)} ${esc(r.nickname)}</b> <span class="muted small">${esc(clsName(r.class_id))}</span><br>
        ${esc(r.quest_title)} <span class="tag t-${esc(r.subject)}">${esc(r.subject)}</span> <span class="xp small">+${r.xp} P</span></span>
        <span class="muted small num">${fmt(r.created_at)}</span></label>`).join("")}`
      : `<p class="muted">새 요청이 없어요. 아이가 미션에서 "완료했어요!"를 누르면 여기에 나타나요.</p>`}</section>`;
}

function vChest() {
  const w = waiting().filter(inCls), done = D.chests.filter(c => c.status === "delivered").filter(inCls);
  const row = c => `<div class="req" style="grid-template-columns:minmax(0,1fr) auto"><span><b>${esc(c.avatar)} ${esc(c.nickname)}</b> <span class="muted small">${esc(clsName(c.class_id))} · ${c.level}번 보물섬 · ${fmt(c.opened_at)}</span><br>
      <span class="tag ${c.reward_kind === "특권" ? "r" : "q"}">${esc(c.reward_kind)}</span> <b>${esc(c.reward_name)}</b></span>
    <span class="row">${c.status === "opened" ? `<button class="btn sm primary" data-act="deliver" data-v="${c.id}">전달 완료</button>` : `<span class="pill ok">전달함</span>`}
      ${confirmBox === "reset" + c.id ? `<button class="btn sm danger" data-act="resetChest" data-v="${c.id}">되돌리기 확인</button><button class="btn sm" data-act="cancel">취소</button>` : `<button class="btn sm ghost" data-act="askReset" data-v="${c.id}">되돌리기</button>`}</span></div>`;
  return `<section class="panel"><div class="row between"><h2>전달할 보물</h2>${classChips()}</div>
    <p class="small muted">아이가 보물섬에서 상자를 열면 랜덤으로 뽑힌 보물이 여기에 나타나요. 실물이나 특권을 주고 "전달 완료"를 누르세요. "되돌리기"는 상자를 닫아서 아이가 다시 열 수 있게 해요.</p>
    ${w.length ? w.map(row).join("") : `<p class="muted">전달할 보물이 없어요.</p>`}</section>
    ${done.length ? `<section class="panel"><h3>최근 3일 동안 전달한 보물</h3>${done.map(row).join("")}</section>` : ""}`;
}

function vGrant() {
  if (!D.students.length) return emptyCrew();
  const qs = D.quests.filter(q => q.active);
  const q = D.quests.find(x => x.id === selQ);
  const list = students();
  return `<div class="cols"><section class="panel"><h2>① 미션 고르기</h2>
      ${qs.map(x => `<button class="qpick" data-act="pickq" data-v="${x.id}" aria-pressed="${x.id === selQ}"><span>${esc(x.title)}<br><span class="tag t-${esc(x.subject)}">${esc(x.subject)}</span> <span class="small muted">${KIND[x.kind]}</span></span><span class="small xp">+${x.xp} P</span></button>`).join("")}</section>
    <section class="panel"><div class="row between"><h2>② 완료한 아이 고르기</h2><div class="row"><button class="btn sm ghost" data-act="selall">모두</button><button class="btn sm ghost" data-act="selnone">해제</button></div></div>
      ${classChips()}
      <p class="small muted">${q ? `${KIND[q.kind]} 미션이에요. 이미 받은 아이는 자동으로 빠져요. 같은 미션의 대기 요청은 함께 승인돼요.` : "왼쪽에서 미션을 먼저 고르세요."}</p>
      <div class="sgrid">${list.map(s => `<button class="spick" data-act="picks" data-v="${s.id}" aria-pressed="${selS.has(s.id)}" ${q ? "" : "disabled"}><b>${esc(s.avatar)} ${esc(s.nickname)}</b><span class="small muted">${esc(clsName(s.class_id))} · ${s.stats.level}번 섬 · ${s.stats.xp} P</span></button>`).join("")}</div>
      <div><button class="btn primary" data-act="grant" ${q && selS.size ? "" : "disabled"}>${selS.size ? `${selS.size}명에게 지급` : "아이를 고르세요"}</button></div></section></div>`;
}

function emptyCrew() { return `<section class="panel"><h2>아직 탐험대원이 없어요</h2><p class="muted">탐험대원 화면에서 반을 만들고 아이 닉네임을 등록하세요.</p><div><button class="btn primary" data-act="tab" data-v="crew">대원 등록하러 가기</button></div></section>`; }

function vCrew() {
  const list = students(), s = D.students.find(x => x.id === detail);
  const waitBy = id => waiting().filter(c => c.student_id === id).length;
  return `${issued ? `<div class="notice"><b>로그인 카드 · 이 비밀번호는 지금 한 번만 보여요</b>
      <div class="pincard"><span class="muted small">반 코드</span><span class="muted small">닉네임</span><span class="muted small">처음 비밀번호</span><b>${esc(issued.code)}</b><b>${esc(issued.nickname)}</b><b>${esc(issued.pin)}</b></div>
      <span class="small">아이에게 전해 주세요. 처음 로그인하면 아이가 자기만의 비밀번호로 바꿔요.</span><div><button class="btn sm" data-act="closeIssued">다 적었어요</button></div></div>` : ""}
    <div class="cols"><section class="panel"><h2>반(탐험대)</h2>
      ${D.classes.map(c => `<div class="row between"><span><b>${esc(c.name)}</b> <span class="muted small">${D.students.filter(s => s.class_id === c.id).length}명</span></span><span class="small">반 코드 <b class="num" style="letter-spacing:.08em">${esc(c.code)}</b></span></div>`).join("") || `<p class="muted small">첫 반을 만들어 주세요.</p>`}
      <form class="row" data-form="addClass"><input type="text" id="nc-name" placeholder="예: 3학년 A반" maxlength="20" required style="flex:1"><button class="btn">반 만들기</button></form>
      <h3>대원 등록</h3>
      ${D.classes.length ? `<form class="row" data-form="addStudent"><select id="ns-cls">${D.classes.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select>
        <input type="text" id="ns-nick" placeholder="닉네임 (실명 대신)" maxlength="12" required style="flex:1 1 120px"><button class="btn primary">등록</button></form>
        <p class="small muted">아이 개인정보 보호를 위해 실명 말고 닉네임을 쓰세요. 등록하면 처음 비밀번호 4자리가 나와요.</p>` : `<p class="small muted">반을 먼저 만들어야 등록할 수 있어요.</p>`}
    </section>
    <section class="panel"><div class="row between"><h2>대원 현황</h2>${classChips()}</div>
      ${list.length ? `<div class="tablewrap"><table><thead><tr><th>닉네임</th><th>반</th><th>섬</th><th>항해 포인트</th><th>보물상자</th><th>상태</th></tr></thead><tbody>
      ${list.map(x => { const closed = x.stats.closedChests.length, w = waitBy(x.id);
        return `<tr class="click" data-act="detail" data-v="${x.id}" aria-selected="${x.id === detail}"><td><b>${esc(x.avatar)} ${esc(x.nickname)}</b></td><td class="muted">${esc(clsName(x.class_id))}</td>
        <td class="num">${x.stats.level}/${D.season.maxLevel}</td><td class="num xp">${x.stats.xp}</td>
        <td class="small">${w ? `<span class="pill wait">전달 대기 ${w}</span> ` : ""}${closed ? `<span class="muted">안 연 상자 ${closed}</span>` : ""}${!w && !closed ? "-" : ""}</td>
        <td class="small">${x.must_change ? `<span class="muted">첫 로그인 전</span>` : x.locked_until > Date.now() ? `<span style="color:var(--danger)">잠김</span>` : "사용 중"}</td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted small">등록된 대원이 없어요.</p>`}
    </section></div>
    ${s ? vDetail(s) : ""}`;
}

function vDetail(s) {
  const c = D.season, st = s.stats, del = confirmBox === "del" + s.id;
  const mine = Object.fromEntries(D.chests.filter(x => x.student_id === s.id).map(x => [x.level, x]));
  return `<section class="panel" id="detail"><div class="row between"><h2>${esc(s.avatar)} ${esc(s.nickname)} <span class="muted small">${esc(clsName(s.class_id))}</span></h2>
      <div class="row"><span class="xp num">${st.level}번 섬 · ${st.xp} P</span><button class="btn sm ghost" data-act="detail" data-v="${s.id}">닫기</button></div></div>
    <h3>보물섬</h3>
    ${c.chestLevels.map(l => { const ch = mine[l], opened = st.opened.includes(l);
      return `<div class="tierrow"><b>${l}번 섬</b><span>${ch ? `${esc(ch.reward_name)}` : opened ? "열었음 (3일 지난 기록)" : st.level >= l ? "도착 · 아이가 아직 상자를 안 열었어요" : `${l - st.level}섬 남음`}</span>
        ${ch ? (ch.status === "opened" ? `<button class="btn sm primary" data-act="deliver" data-v="${ch.id}">전달 완료</button>` : `<span class="pill ok">전달함</span>`) : `<span class="pill ${st.level >= l ? "wait" : "lock"}">${st.level >= l ? "열기 대기" : "잠김"}</span>`}</div>`; }).join("")}
    <h3>항해 포인트 직접 조정</h3>
    <form class="row" data-form="adjust"><input type="number" id="adj-amt" placeholder="+10 / -5" required><input type="text" id="adj-why" placeholder="사유 (예: 발표왕)" maxlength="40" style="flex:1 1 160px"><button class="btn">반영</button></form>
    <h3>계정</h3>
    <div class="row"><button class="btn" data-act="resetPin" data-v="${s.id}">비밀번호 새로 발급</button>
      ${del ? `<span class="notice d row">${esc(s.nickname)} 대원을 삭제할까요? 기록은 남아요. <button class="btn sm danger" data-act="delStudent" data-v="${s.id}">삭제</button><button class="btn sm" data-act="cancel">취소</button></span>`
        : `<button class="btn ghost" data-act="askDel" data-v="${s.id}">대원 삭제</button>`}</div>
    <p class="small muted">비밀번호를 잊어버린 아이는 새로 발급하면 돼요. 5번 틀려서 잠긴 계정도 바로 풀려요.</p></section>`;
}

function vItems() {
  const e = D.quests.find(q => q.id === editQ), r = D.rewards.find(x => x.id === editR);
  return `<section class="panel"><h2>${e ? "미션 수정" : "새 미션"}</h2>
    <form class="row" data-form="saveQuest"><label class="f" style="flex:1 1 220px">내용<input type="text" id="q-title" maxlength="40" required value="${esc(e?.title || "")}" data-fresh="1"></label>
    <label class="f">과목<select id="q-subj" data-fresh="1">${["영어", "수학", "공통"].map(s => `<option ${e?.subject === s ? "selected" : ""}>${s}</option>`).join("")}</select></label>
    <label class="f">주기<select id="q-kind" data-fresh="1">${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${e?.kind === k ? "selected" : ""}>${v}</option>`).join("")}</select></label>
    <label class="f">항해 포인트<input type="number" id="q-xp" min="0" value="${e?.xp ?? 20}" data-fresh="1"></label>
    <button class="btn primary" style="align-self:end">${e ? "저장" : "추가"}</button>${e ? `<button type="button" class="btn ghost" style="align-self:end" data-act="editQ">취소</button>` : ""}</form>
    <div class="tablewrap"><table><thead><tr><th>미션</th><th>과목</th><th>주기</th><th>포인트</th><th>아이 화면</th><th></th></tr></thead><tbody>
    ${D.quests.map(q => `<tr><td>${esc(q.title)}</td><td><span class="tag t-${esc(q.subject)}">${esc(q.subject)}</span></td><td>${KIND[q.kind]}</td><td class="num xp">+${q.xp}</td>
      <td><button class="btn sm ${q.active ? "primary" : ""}" data-act="toggleQ" data-v="${q.id}">${q.active ? "보임" : "숨김"}</button></td><td><button class="btn sm ghost" data-act="editQ" data-v="${q.id}">수정</button></td></tr>`).join("")}
    </tbody></table></div></section>
    <section class="panel"><h2>보물 풀</h2>
    <p class="small muted">보물상자를 열면 아래 보물 중 하나가 "뽑힐 비율"에 따라 랜덤으로 나와요. 숫자가 클수록 잘 나오고, 0이면 안 나와요. 재고가 0이 된 보물도 더 이상 나오지 않아요. 아이 화면에는 확률 대신 흔함·보통·희귀로 보여요.</p>
    <div class="tablewrap"><table><thead><tr><th>보물</th><th>종류</th><th>뽑힐 비율</th><th>확률</th><th>재고</th><th></th></tr></thead><tbody>
    ${D.rewards.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.kind)}</td><td class="num">${x.weight}</td><td class="num">${chance(x)}</td><td class="num">${x.stock ?? "무제한"}</td>
      <td class="row"><button class="btn sm ghost" data-act="editR" data-v="${x.id}">수정</button><button class="btn sm ghost" data-act="delReward" data-v="${x.id}">빼기</button></td></tr>`).join("")}
    </tbody></table></div>
    <h3>${r ? "보물 수정" : "보물 추가"}</h3>
    <form class="row" data-form="saveReward"><label class="f" style="flex:1 1 180px">이름<input type="text" id="r-name" maxlength="30" required value="${esc(r?.name || "")}" data-fresh="1"></label>
      <label class="f">종류<select id="r-kind" data-fresh="1"><option ${r?.kind === "실물" ? "selected" : ""}>실물</option><option ${r?.kind === "특권" ? "selected" : ""}>특권</option></select></label>
      <label class="f">뽑힐 비율<input type="number" id="r-weight" min="0" max="100" value="${r?.weight ?? 3}" data-fresh="1"></label>
      <label class="f">재고 (비우면 무제한)<input type="number" id="r-stock" min="0" value="${r?.stock ?? ""}" data-fresh="1"></label>
      <button class="btn primary" style="align-self:end">${r ? "저장" : "추가"}</button>${r ? `<button type="button" class="btn ghost" style="align-self:end" data-act="editR">취소</button>` : ""}</form></section>`;
}

function vSeason() {
  const c = D.season, ns = confirmBox === "newSeason";
  return `<section class="panel"><h2>시즌 설정</h2>
    <form class="row" data-form="saveSeason"><label class="f" style="flex:1 1 200px">시즌 이름<input type="text" id="se-name" value="${esc(c.name)}" maxlength="30" data-fresh="1"></label>
    <label class="f">섬 하나당 포인트<input type="number" id="se-per" value="${c.xpPerLevel}" min="10" data-fresh="1"></label>
    <label class="f">섬 개수<input type="number" id="se-max" value="${c.maxLevel}" min="1" max="50" data-fresh="1"></label>
    <label class="f">반 주간 목표<input type="number" id="se-goal" value="${c.weeklyClassGoal}" min="0" data-fresh="1"></label>
    <label class="f" style="flex:1 1 220px">보물섬 번호 (쉼표로 구분)<input type="text" id="se-chests" value="${c.chestLevels.join(", ")}" data-fresh="1"></label>
    <button class="btn primary" style="align-self:end">저장</button></form>
    <p class="small muted">지금 설정이면 ${c.chestLevels.map(l => `${l * c.xpPerLevel}`).join(" · ")} 포인트에 도달할 때마다 보물상자가 하나씩 열려요. 아이 한 명이 시즌 동안 받는 보물은 최대 ${c.chestLevels.length}개예요.</p></section>
    <section class="panel"><h2>새 시즌 시작</h2><p class="muted">모든 아이의 항해 포인트와 섬이 처음부터 다시 시작하고, 보물상자도 다시 닫혀요. 훈장 기록은 그대로 남아요.</p>
    ${ns ? `<form class="notice d row" data-form="newSeason"><input type="text" id="ns-name" maxlength="30" placeholder="예: 여름방학 트레저 헌터" required style="flex:1"><button class="btn danger">시작</button><button type="button" class="btn" data-act="cancel">취소</button></form>`
      : `<div><button class="btn" data-act="askNewSeason">새 시즌 시작…</button></div>`}</section>`;
}

function vLogs() {
  return `<section class="panel"><h2>최근 기록</h2><p class="small muted">잘못 지급했으면 취소하세요.</p>
    <div class="tablewrap"><table><thead><tr><th>시간</th><th>대원</th><th>내용</th><th>포인트</th><th></th></tr></thead><tbody>
    ${D.logs.filter(l => l.xp).map(l => `<tr><td class="muted small num">${fmt(l.at)}</td><td>${esc(l.nickname)}</td><td>${esc(l.title)}</td><td class="num xp">${l.xp > 0 ? "+" : ""}${l.xp}</td><td><button class="btn sm ghost" data-act="undo" data-v="${l.id}">취소</button></td></tr>`).join("") || `<tr><td colspan="5" class="muted">기록이 없어요</td></tr>`}
    </tbody></table></div></section>`;
}

/* ---------- 동작 ---------- */
async function act(fn) { if (busy) return; busy = true; try { const m = await fn(); if (m) toast(m); await load(); } catch (e) { toast(e.message); } busy = false; }
const val = id => document.getElementById(id).value.trim();
const A = {
  tab: v => { tab = v; confirmBox = null; render(); scrollTo(0, 0); },
  logout: () => api("/api/logout", {}).finally(() => { D = null; showAuth(); }),
  cls: v => { cls = v === "all" ? "all" : +v; render(); },
  selr: v => { const id = +v; selR.has(id) ? selR.delete(id) : selR.add(id); render(); },
  selrall: () => { D.requests.filter(inCls).forEach(r => selR.add(r.id)); render(); },
  selrnone: () => { selR.clear(); render(); },
  approve: () => act(async () => { const r = await api("/api/t/requests/approve", { ids: [...selR] }); selR.clear(); return `${r.approved}개 승인${r.problems.length ? ` · 처리 못 한 요청: ${r.problems.join(", ")}` : ""}`; }),
  reject: () => act(async () => { await api("/api/t/requests/reject", { ids: [...selR] }); selR.clear(); return "거절했어요"; }),
  deliver: v => act(async () => { await api(`/api/t/chests/${v}/deliver`, {}); return "전달 완료로 표시했어요"; }),
  askReset: v => { confirmBox = "reset" + v; render(); },
  resetChest: v => act(async () => { await api(`/api/t/chests/${v}/reset`, {}); confirmBox = null; return "상자를 되돌렸어요. 아이가 다시 열 수 있어요"; }),
  pickq: v => { selQ = selQ === +v ? null : +v; render(); },
  picks: v => { const id = +v; selS.has(id) ? selS.delete(id) : selS.add(id); render(); },
  selall: () => { students().forEach(s => selS.add(s.id)); render(); },
  selnone: () => { selS.clear(); render(); },
  grant: () => act(async () => { const r = await api("/api/t/grant", { questId: selQ, studentIds: [...selS] }); selS.clear(); return `${r.granted}명에게 지급${r.skipped ? ` · ${r.skipped}명은 이미 받은 미션이라 빠졌어요` : ""}`; }),
  detail: v => { detail = detail === +v ? null : +v; confirmBox = null; render(); if (detail) $("#detail")?.scrollIntoView({ behavior: "smooth" }); },
  resetPin: v => act(async () => { const r = await api(`/api/t/students/${v}/reset-pin`, {}); const s = D.students.find(x => x.id === +v);
    issued = { code: D.classes.find(c => c.id === s.class_id)?.code, nickname: s.nickname, pin: r.pin }; scrollTo(0, 0); return "새 비밀번호를 발급했어요"; }),
  askDel: v => { confirmBox = "del" + v; render(); },
  delStudent: v => act(async () => { await api(`/api/t/students/${v}/delete`, {}); detail = null; confirmBox = null; return "대원을 삭제했어요"; }),
  cancel: () => { confirmBox = null; render(); },
  closeIssued: () => { issued = null; render(); },
  toggleQ: v => act(() => api(`/api/t/quests/${v}/toggle`, {}).then(() => null)),
  editQ: v => { editQ = v ? +v : null; render(); scrollTo(0, 0); },
  editR: v => { editR = v ? +v : null; render(); },
  delReward: v => act(async () => { await api(`/api/t/rewards/${v}/delete`, {}); return "보물 풀에서 뺐어요"; }),
  askNewSeason: () => { confirmBox = "newSeason"; render(); },
  undo: v => act(async () => { await api(`/api/t/logs/${v}/undo`, {}); return "기록을 취소했어요"; })
};
const F = {
  addClass: () => act(async () => { const r = await api("/api/t/classes", { name: val("nc-name") }); $("#nc-name").value = ""; return `반을 만들었어요. 반 코드: ${r.code}`; }),
  addStudent: () => act(async () => { const classId = +val("ns-cls"), nickname = val("ns-nick"); const r = await api("/api/t/students", { classId, nickname });
    issued = { code: D.classes.find(c => c.id === classId).code, nickname, pin: r.pin }; $("#ns-nick").value = ""; return `${nickname} 대원을 등록했어요`; }),
  adjust: () => act(async () => { await api("/api/t/adjust", { studentId: detail, title: val("adj-why") || "선생님 조정", xp: Math.round(+val("adj-amt")) }); $("#adj-amt").value = ""; $("#adj-why").value = ""; return "반영했어요"; }),
  saveQuest: () => act(async () => { await api("/api/t/quests", { id: editQ, title: val("q-title"), subject: val("q-subj"), kind: val("q-kind"), xp: +val("q-xp") });
    const was = editQ; editQ = null; return was ? "미션을 저장했어요" : "미션을 추가했어요"; }),
  saveReward: () => act(async () => { await api("/api/t/rewards", { id: editR, name: val("r-name"), kind: val("r-kind"), weight: +val("r-weight"), stock: val("r-stock") });
    const was = editR; editR = null; return was ? "보물을 저장했어요" : "보물을 추가했어요"; }),
  saveSeason: () => act(async () => { await api("/api/t/season", { name: val("se-name"), xpPerLevel: +val("se-per"), maxLevel: +val("se-max"), weeklyClassGoal: +val("se-goal"),
    chestLevels: val("se-chests").split(/[,\s]+/).filter(Boolean).map(Number) }); return "저장했어요"; }),
  newSeason: () => act(async () => { await api("/api/t/season", { name: val("ns-name"), newSeason: true }); confirmBox = null; return "새 시즌을 시작했어요"; })
};
document.addEventListener("click", e => {
  const b = e.target.closest("[data-act]"); if (!b || b.disabled || $("#app").hidden) return;
  if (b.tagName === "INPUT") { A[b.dataset.act]?.(b.dataset.v); return; }
  e.preventDefault(); A[b.dataset.act]?.(b.dataset.v);
});
document.addEventListener("submit", e => { const f = F[e.target.dataset.form]; if (f) { e.preventDefault(); f(); } });

load().catch(() => showAuth());
