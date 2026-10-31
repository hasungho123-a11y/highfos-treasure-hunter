# 하이포스 방학 트레저헌터

미션을 하면 배가 항로를 따라 나아가고, 보물섬을 지나면 보물 상자를 열고, 도착 항구에 닿으면 포인트를 받아 상점에서 원하는 걸 고르는 하이포스학원 방학 프로그램이에요.

- **학생**: 휴대폰으로 반 코드 → 내 이름 → 비밀번호 4자리로 들어와요. 미션을 끝내면 "다 했어요"를 누르고, 선생님이 승인하면 내 배가 움직이고 상자를 직접 세 번 눌러 열어요. 홈 화면에 추가하면 앱처럼 쓸 수 있어요.
- **선생님**: 학원 화면(TV·태블릿)에서 요청을 승인하거나 직접 지급하면 지도에서 배가 움직이고 상자가 열려요. 반·학생 관리, 보물 확률, 상점, 건네줄 것 목록을 관리해요.
- **시연**: 선생님 화면의 "시연용 예시 반 만들기"를 누르면 학생 8명(비밀번호 모두 1234)과 미션이 한 번에 만들어져요.

---

## 가장 쉬운 방법: Claude Code에 맡기기

이 폴더에서 Claude Code를 열고 이렇게 말하면 돼요.

> README 보고 Cloudflare에 배포하고, GitHub 비공개 저장소에도 올려 줘. 설정 코드는 ○○○○로 해 줘.

중간에 Cloudflare 로그인 창과 GitHub 로그인 창이 뜨면 로그인만 해 주세요.

---

## 직접 하는 방법

필요한 것: Node.js 20 이상, Cloudflare 계정, (선택) GitHub 계정과 `gh` 명령어

```bash
npm install
npx wrangler login                 # 브라우저에서 Cloudflare 로그인
npm run db:create                  # 출력된 database_id를 wrangler.toml에 붙여 넣기
npm run db:init                    # 표 만들기
npx wrangler secret put SETUP_CODE # 처음 설정에 쓸 코드 (아무 문자열)
npm run deploy                     # 끝나면 https://highfos-treasure-hunter.<계정>.workers.dev 주소가 나와요
```

배포된 주소를 열면 **처음 설정** 화면이 나와요. 방금 정한 설정 코드와 선생님 아이디·비밀번호를 넣으면 끝이에요.

> wrangler.toml의 `name`이 예전 테스트 버전과 같은 `highfos-treasure-hunter`라서, 같은 주소에 새 버전이 올라가요. 테스트 버전을 남겨 두고 싶으면 `name`을 바꿔 주세요.

### GitHub에 올리기 (어디서든 이어서 작업하려면)

```bash
git init && git add . && git commit -m "하이포스 방학 트레저헌터"
gh repo create highfos-treasure-hunter --private --source=. --push
```

다음부터는 고친 뒤 `git add . && git commit -m "내용" && git push` 하고 `npm run deploy` 하면 돼요.

### 내 컴퓨터에서 미리 보기

```bash
echo SETUP_CODE=test1234 > .dev.vars
npm run db:init:local
npm run dev        # http://localhost:8787
```

---

## 학원 로고로 아이콘 바꾸기

지금 아이콘은 보물상자 그림이에요. 학원 로고 파일을 이 폴더에 넣고 Claude Code에 "학원 로고로 트레저헌터 앱 아이콘 다시 만들어 줘"라고 하면 `tools/`의 스크립트로 `public/icons/`를 새로 만들어요.
아이콘을 바꾼 뒤에는 `public/sw.js`의 `CACHE` 이름 숫자를 하나 올려야 이미 설치한 휴대폰에도 반영돼요.

## 폴더 구성

| 경로 | 내용 |
| --- | --- |
| `src/worker.js` | 서버(API) — 로그인, 항해 계산, 보물 뽑기, 상점 |
| `schema.sql` | 데이터베이스 표 |
| `public/index.html` | 화면 껍데기 |
| `public/app.js` | 로그인·학생 화면·선생님 화면 |
| `public/voyage.js` | 항해 지도, 배 이동, 보물 상자 연출 |
| `public/style.css` | 디자인 |
| `public/manifest.webmanifest`, `public/sw.js`, `public/icons/` | 휴대폰 앱 설치용 |
