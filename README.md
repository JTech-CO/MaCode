# MaCode

> **세련된 Mac 테마 UI에서 코드가 타이핑되는 애니메이션을 1080p 고화질 영상으로 추출하세요.**

## 1. 소개 (Introduction)

이 프로젝트는 소스코드와 개발 튜토리얼을 macOS 윈도우 스타일로 렌더링하고, 타이핑 애니메이션을 고화질 영상으로 제작하기 위해 개발된 정적 웹 애플리케이션입니다.
모든 처리가 사용자 브라우저에서만 실행되어(서버리스), 설치·가입 없이 즉시 사용하고 권한 프롬프트 없이 영상을 추출할 수 있습니다.

**주요 기능**
- **권한 불필요 캔버스 녹화**: 코드와 Mac 창을 캔버스에 직접 그려 1920×1080 MP4로 추출(기본). 화면 캡처 방식도 폴백으로 지원합니다.
- **타이핑 · 테마 · 다국어**: 속도 5단계와 AI 청크 모드, Dark/Light/Monokai 테마, KR/EN 즉시 전환(샘플 코드 주석 포함), 설정 자동 저장(localStorage)을 제공합니다.

## 2. 기술 스택 (Tech Stack)

- **Frontend**: HTML5, Vanilla JavaScript, CSS3, Tailwind CSS (Play CDN)
- **Backend**: 없음 — 100% 클라이언트 사이드 (서버리스)
- **APIs**: Canvas 2D · `captureStream()`, MediaRecorder, Screen Capture API
- **State Management**: localStorage (설정 자동 저장)
- **Deployment**: GitHub Pages — [macode.me](https://macode.me)

## 3. 설치 및 실행 (Quick Start)

**요구 사항**: 모던 브라우저(Chrome / Edge 권장) — Node.js나 빌드 과정이 필요 없습니다.

1. **설치 (Install)**
   ```bash
   git clone https://github.com/JTech-CO/MaCode.git
   cd MaCode
   ```

2. **환경 변수 (Environment)**
   설정할 환경 변수가 없습니다. 서버나 API 키 없이 동작합니다.

3. **실행 (Run)**
   ```bash
   # index.html을 브라우저에서 바로 열거나, 정적 서버로 실행
   python -m http.server 8080
   ```
   또는 배포된 [macode.me](https://macode.me)에 바로 접속합니다.

## 4. 폴더 구조 (Structure)

```text
MaCode/
├── css/
│   ├── base.css            # 전역 변수, 테마(dark/light/monokai), 타이포그래피
│   ├── layout.css          # 배경 그래디언트 · 글래스모피즘 레이아웃
│   └── components.css      # 버튼 · 입력창 · 구문 강조 · 토스트
├── js/
│   ├── i18n.js             # KR/EN 문자열 + 기본 샘플 코드
│   ├── editor.js           # 토크나이저(구문 강조) + 타이핑 엔진
│   ├── canvasRenderer.js   # 캔버스 렌더러 + 녹화기 (기본 경로)
│   ├── utils.js            # 화면 캡처 녹화기 · 토스트 · 유틸
│   └── main.js             # 앱 초기화 · UI 이벤트 · 설정 영속화
├── index.html              # 메인 HTML 구조
├── DEPLOY.md               # 배포 가이드 (GitHub Pages + 도메인)
└── CNAME, .nojekyll        # GitHub Pages 커스텀 도메인 설정
```

## 5. 정보 (Info)

- **License**: MIT License
- **Live**: [macode.me](https://macode.me)
