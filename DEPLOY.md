# 배포 가이드 (Deployment) — GitHub Pages + `macode.me`

MaCode는 빌드/서버가 전혀 없는 100% 정적 클라이언트 앱입니다. 모든 처리가 사용자 브라우저에서만 돌아가므로 Vercel·Netlify 같은 연동 없이 **GitHub Pages에 정적 파일을 올리고 도메인만 연결**하면 됩니다.

> MaCode is a 100% static, client-only app (no build, no server). Just host the files on GitHub Pages and point the domain at it — no Vercel/Netlify needed.

---

## 1. 공개 레포에 푸시 (Push to a public repo)

```bash
cd MaCode
git init
git add .
git commit -m "Deploy MaCode"
git branch -M main
git remote add origin https://github.com/<YOUR_USERNAME>/macode.git
git push -u origin main
```

- 레포는 **Public** 으로 생성하세요 (GitHub Pages 무료 사용 조건).
- `CNAME`(= `macode.me`)와 `.nojekyll` 파일이 이미 레포 루트에 포함되어 있습니다.

## 2. GitHub Pages 켜기 (Enable Pages)

레포 **Settings → Pages**:
- **Source**: `Deploy from a branch`
- **Branch**: `main` / `/ (root)` → **Save**
- **Custom domain**: `macode.me` 입력 (`CNAME` 파일이 있어 자동 인식될 수도 있음) → **Save**

## 3. DNS 설정 (at your domain registrar)

`macode.me`를 등록한 등록기관(예: Namecheap, Cloudflare, GoDaddy)의 DNS에 아래를 추가합니다.

**Apex 도메인 `macode.me` → A 레코드 4개** (GitHub Pages 고정 IP):

| Type | Host | Value |
|------|------|-------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

(선택, IPv6) AAAA 레코드:
`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

**`www.macode.me` → CNAME**:

| Type | Host | Value |
|------|------|-------|
| CNAME | `www` | `<YOUR_USERNAME>.github.io.` |

> Cloudflare를 쓴다면 처음엔 프록시(주황 구름)를 끄고(DNS only) GitHub가 인증서를 발급하게 한 뒤, 동작 확인 후 다시 켜는 것을 권장.

## 4. HTTPS 강제 (Enforce HTTPS)

DNS 전파(보통 수십 분~수 시간) 후 **Settings → Pages** 에서 **Enforce HTTPS** 를 체크합니다. GitHub가 Let's Encrypt 인증서를 자동 발급합니다.

---

## 이후 업데이트 (Updating)

코드를 수정한 뒤 `git push` 하면 1~2분 내 자동 반영됩니다.

```bash
git add .
git commit -m "Update"
git push
```

## 참고 (Notes)

- 경로는 모두 상대경로(`css/…`, `js/…`)라 서브경로/커스텀도메인 어디서든 동작합니다.
- 외부 의존성은 Tailwind Play CDN과 Google Fonts(둘 다 HTTPS) 뿐입니다. 의도적으로 **build-less** 를 유지했습니다(필요 시 추후 Tailwind CLI로 정적 빌드 가능).
- 녹화는 사용자 브라우저에서만 일어나며 어떤 데이터도 서버로 전송되지 않습니다.
