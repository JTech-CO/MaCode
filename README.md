# MaCode

> **세련된 Mac 테마 UI에서 코드가 타이핑되는 애니메이션을 고화질 영상으로 추출하세요.**
>
> 🌐 **Live: [macode.me](https://macode.me)**

## 1. 소개 (Introduction)

소스코드나 개발 튜토리얼을 macOS 윈도우 스타일로 렌더링하고, 타이핑 애니메이션을 **고화질(1080p) 영상**으로 추출하는 정적 웹 애플리케이션입니다. 모든 처리가 **사용자 브라우저에서만** 일어나며 서버로 어떤 데이터도 전송되지 않습니다.

**주요 기능**
- **Mac 스타일 코드 윈도우** — 윈도우 컨트롤러·글래스모피즘이 적용된 프리미엄 렌더링 UI.
- **다이내믹 타이핑 애니메이션** — 속도 5단계 + AI 청크(단어 단위) 모드. append-only 렌더링으로 큰 파일도 부드럽게.
- **두 가지 녹화 방식**
  - **캔버스 (기본·권장)** — 코드와 창을 캔버스에 직접 그려 녹화. **권한 프롬프트·탭 선택 불필요**, 1920×1080 결정론적 출력, MP4 우선(브라우저 무관).
  - **화면 캡처 (폴백)** — Screen Capture API로 현재 탭의 Mac 창 영역만 크롭 녹화.
- **테마** — Dark (VS Code) / Light / Monokai. 전환 즉시 코드·창 색상 반영.
- **다국어 (KR / EN)** — UI·메시지·기본 샘플 코드 주석까지 한 번에 전환.
- **자동 저장** — 코드·언어·속도·테마·녹화방식·UI 언어를 localStorage에 보존(새로고침 유지).
- **빌드 불필요** — `index.html` 더블클릭만으로 즉시 실행.

## 2. 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (빌드리스)
- **CSS**: Tailwind CSS (Play CDN), CSS 변수 기반 테마
- **APIs**: Canvas 2D + `canvas.captureStream()`, MediaRecorder, Screen Capture API(폴백)
- **Typography**: Fira Code (코드), 시스템 폰트 스택 (UI)

## 3. 사용법 (Quick Start)

1. **실행** — [macode.me](https://macode.me) 접속, 또는 레포를 받아 `index.html`을 브라우저(Chrome/Edge 권장)에서 엽니다.
2. **작성** — 소스 코드를 입력하고 언어·테마·속도·녹화 방식을 설정합니다. 우상단 버튼으로 **KR/EN** 전환.
3. **렌더링** — `렌더링 시작` 클릭.
   - **캔버스 모드(기본)**: 팝업 없이 바로 애니메이션이 재생되고 끝나면 `macode-render-*.mp4`가 자동 다운로드됩니다.
   - **화면 캡처 모드**: 화면 공유 팝업에서 **현재 탭**을 선택합니다.

## 4. 폴더 구조 (Structure)

```text
MaCode/
├── css/
│   ├── base.css            # 전역 변수, 테마(dark/light/monokai), 타이포그래피
│   ├── layout.css          # 배경 그래디언트 및 글래스모피즘 레이아웃
│   └── components.css      # 버튼/입력창/구문강조/토스트/애니메이션
├── js/
│   ├── i18n.js             # KR/EN 문자열 테이블 + 기본 샘플 코드 + t()
│   ├── main.js             # 앱 초기화, UI 이벤트, 설정 영속화, 언어 전환
│   ├── editor.js           # 토크나이저(구문강조) + append-only 타이핑 엔진
│   ├── canvasRenderer.js   # 캔버스 렌더러 + 캔버스 녹화기 (기본 경로)
│   └── utils.js            # 화면캡처 녹화기, 토스트, 코덱/다운로드 유틸
├── index.html              # 메인 HTML 구조
├── CNAME / .nojekyll       # GitHub Pages 커스텀 도메인 설정
└── DEPLOY.md               # 배포 가이드
```

## 5. 배포 (Deployment)

100% 정적 앱이라 GitHub Pages에 올리고 도메인만 연결하면 됩니다 — 자세한 단계는 **[DEPLOY.md](DEPLOY.md)** 참고.

## 6. 정보 (Info)

- **License**: MIT License
