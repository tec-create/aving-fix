# AVING FIX — avingfix.news

AVING이 보도한 **FIX(Future Innovation tech eXpo, 대구 EXCO)** 영문 기사를 모아 보여주는 디스커버리 허브입니다.
구조는 [avingces.news](https://avingces.news/)를 참고했습니다: 빌드 없는 정적 사이트 + JSON 데이터 + 클라이언트 렌더링. 기사 카드는 us.aving.net 원문으로 연결됩니다.

## 폴더 구조

```
aving-fix/
├─ index.html              # 페이지 뼈대 (헤더/검색/플레이어/푸터)
├─ assets/
│  ├─ style.css            # 다크 테마 디자인
│  ├─ app.js               # 렌더링 + 해시 라우팅 + 검색 + 영상 플레이어
│  ├─ favicon.svg
│  └─ og.png               # SNS 공유 이미지 (1200x630)
├─ data/
│  └─ stories.json         # 사이트가 읽는 데이터 (meta + items)
├─ scripts/
│  ├─ update-fix.mjs       # us.aving.net에서 FIX 기사 재수집 (1.5초/건)
│  └─ raw-fix.json         # 수집 원본 캐시 (다음 업데이트 때 새 기사만 요청)
└─ vercel.json             # 캐시 헤더, www → 루트 도메인 리다이렉트
```

## 페이지(해시 라우팅)

| 주소 | 내용 |
|---|---|
| `/#/` | 홈: 히어로(기사 1건 = 사각형 1개), 대표 영상, 최신, Best of FIX, 에디션, 영상 |
| `/#/edition/2026` | 연도별 에디션 (섹션 필터) |
| `/#/awards` | Best of FIX · Global Media Awards |
| `/#/videos` | 영상이 있는 기사 |
| `/#/all` | 전체 기사 |

검색: 우측 상단 돋보기 또는 키보드 `/`, `Ctrl+K`.

## 로컬에서 보기

```bash
cd aving-fix
npx serve .        # 또는: python -m http.server 8080
```
`file://`로 바로 열면 JSON fetch가 막히니 꼭 로컬 서버로 여세요.

## 데이터 업데이트 (새 FIX 기사 반영)

```bash
node scripts/update-fix.mjs        # 예상 요청 횟수 출력 → y 입력 시 진행
node scripts/update-fix.mjs --build  # 네트워크 없이 stories.json만 재생성
```
- 요청 간격 1.5초, 이미 받은 기사는 다시 요청하지 않습니다.
- 수집 기준: us.aving.net 검색어 `FIX` 결과 중 **본문/제목에 `FIX`(대문자) 또는 `Future Innovation tech eXpo`가 있는 기사**만 사용.
- 에디션 연도: 제목의 `FIX 20xx` → 본문의 `FIX 20xx` → 기사 날짜 순으로 판단.
- 태그: 제목/리드에 `Best of FIX`·`Global Media Award` → awards, 제목에 `Interview` → interview.

업데이트 후 `git commit` + `git push` 하면 Vercel이 자동 배포합니다.

## 배포 (GitHub → Vercel → Namecheap)

1. **GitHub**: 저장소 `aving-fix` 생성 → 이 폴더를 push
   ```bash
   git init -b main
   git add .
   git commit -m "Initial AVING FIX site"
   git remote add origin https://github.com/<계정>/aving-fix.git
   git push -u origin main
   ```
   공동 개발자: Settings → Collaborators → `j.sean1316@gmail.com` 초대
2. **Vercel**: Add New → Project → GitHub `aving-fix` Import
   - Framework Preset: **Other**, Build Command: 비움, Output Directory: 비움(루트)
3. **도메인**: Vercel 프로젝트 → Settings → Domains → `avingfix.news`, `www.avingfix.news` 추가
4. **Namecheap** (도메인 등록 후): Domain List → Manage → Advanced DNS
   - Vercel Domains 화면에 표시되는 값을 그대로 입력 (일반적으로)
     - `A` / Host `@` / Value `76.76.21.21`
     - `CNAME` / Host `www` / Value `cname.vercel-dns.com`
   - 반영까지 수 분~수 시간. SSL은 Vercel이 자동 발급.

> 참고 (Vercel 요금제)
> - Vercel에서 다른 사람을 **팀 멤버(배포 권한)** 로 추가하려면 Pro 플랜이 필요하고, 배포 권한 좌석은 멤버당 월 $20입니다. 읽기 전용 Viewer 좌석은 무료.
> - Hobby(무료)에서는 **비공개(private) 저장소**에 공동 개발자가 push한 커밋의 배포가 막힙니다. 공개(public) 저장소라면 Hobby에서도 공동 개발자 push가 자동 배포됩니다.
> - Hobby는 약관상 비상업용입니다. 회사(AVING) 사이트로 운영한다면 Pro를 권장합니다.
