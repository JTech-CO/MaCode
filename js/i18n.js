/**
 * Internationalization (KR / EN).
 *
 * The UI strings, runtime messages (toasts/errors), and the default sample code
 * all live here as the single source of truth. t(key) resolves a (dot-pathed)
 * string in the current language (MACODE_LANG); setLangGlobal() switches it.
 * The DOM updates themselves are done by main.js applyLanguage(). Loaded first
 * (before utils.js/editor.js/main.js) so t() is available everywhere.
 */

const I18N = {
    ko: {
        fileName: '파일 이름',
        sourceCode: '소스 코드',
        language: '언어 선택',
        theme: '테마',
        typingSpeed: '타이핑 속도',
        aiChunk: 'AI 청크 모드 (단어 단위 출력)',
        recordMode: '녹화 방식',
        preview: '미리보기 (재설정)',
        startRender: '렌더링 시작 (전체화면)',
        recording: 'REC 렌더링 중...',
        toggleSidebar: '컨트롤 패널 열기/닫기',
        langToggleAria: '언어 전환 (한국어/English)',
        recordUnsupported: '이 브라우저는 영상 녹화(MediaRecorder)를 지원하지 않습니다. 미리보기는 사용할 수 있습니다.',
        langToggle: 'EN',
        speed: ['', '1 - 매우 느림', '2 - 느림', '3 - 보통', '4 - 빠름', '5 - 매우 빠름'],
        themes: { dark: '다크 (VS Code)', light: '라이트', monokai: '모노카이' },
        recordModes: { canvas: '캔버스 (권장 · 권한 불필요)', screen: '화면 캡처 (탭 선택)' },
        toast: {
            cancelled: '녹화가 취소되었습니다.',
            startFail: '녹화를 시작할 수 없습니다: ',
            noData: '녹화된 데이터가 없어 영상을 저장하지 못했습니다.',
            done: '렌더링이 완료되었습니다! 영상 다운로드를 확인해 주세요.'
        },
        errors: {
            noGetDisplayMedia: '이 브라우저는 화면 녹화(getDisplayMedia)를 지원하지 않습니다. 데스크톱 Chrome/Edge를 사용해 주세요.',
            noMediaRecorder: '이 브라우저는 MediaRecorder를 지원하지 않습니다. (권장: 데스크톱 Chrome/Edge)',
            noCodec: '이 브라우저는 영상 녹화 코덱을 지원하지 않습니다. (권장: 데스크톱 Chrome/Edge)'
        }
    },
    en: {
        fileName: 'File name',
        sourceCode: 'Source code',
        language: 'Language',
        theme: 'Theme',
        typingSpeed: 'Typing speed',
        aiChunk: 'AI chunk mode (word-by-word)',
        recordMode: 'Recording mode',
        preview: 'Preview (reset)',
        startRender: 'Start render (full screen)',
        recording: 'REC rendering...',
        toggleSidebar: 'Toggle control panel',
        langToggleAria: 'Switch language (한국어/English)',
        recordUnsupported: 'This browser does not support video recording (MediaRecorder). Preview still works.',
        langToggle: '한국어',
        speed: ['', '1 - Very slow', '2 - Slow', '3 - Normal', '4 - Fast', '5 - Very fast'],
        themes: { dark: 'Dark (VS Code)', light: 'Light', monokai: 'Monokai' },
        recordModes: { canvas: 'Canvas (recommended · no permission)', screen: 'Screen capture (pick tab)' },
        toast: {
            cancelled: 'Recording cancelled.',
            startFail: "Couldn't start recording: ",
            noData: 'No recorded data — the video could not be saved.',
            done: 'Render complete! Check your download.'
        },
        errors: {
            noGetDisplayMedia: 'This browser does not support screen recording (getDisplayMedia). Please use desktop Chrome/Edge.',
            noMediaRecorder: 'This browser does not support MediaRecorder. (Recommended: desktop Chrome/Edge)',
            noCodec: 'This browser supports no recording codec. (Recommended: desktop Chrome/Edge)'
        }
    }
};

// Default sample code per language — same program, localized comments. The `\\n`
// inside the f-string is a literal backslash-n in the Python source (a template
// literal would otherwise turn it into a real newline).
const SAMPLE_CODE = {
    ko: `# 소수 찾기 프로그램 (Sieve of Eratosthenes)
# 1부터 n까지의 소수를 찾고, 개수와 합을 계산합니다.

def find_primes(n):
    # n+1 크기의 리스트를 True로 초기화 (모두 소수 후보)
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False  # 0과 1은 소수가 아님

    # 에라토스테네스의 체 알고리즘 적용
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            # i의 배수들을 모두 소수가 아니라고 표시
            for j in range(i*i, n+1, i):
                is_prime[j] = False

    # 소수 리스트 생성
    primes = [i for i in range(2, n+1) if is_prime[i]]
    return primes


# 메인 로직
if __name__ == "__main__":
    n = 100                     # 1부터 찾을 최대 숫자

    primes = find_primes(n)     # 소수 찾기 함수 호출

    print(f"1부터 {n}까지의 소수 목록:")
    print(primes)               # 소수 리스트 출력

    prime_count = len(primes)   # 소수의 개수
    prime_sum = sum(primes)     # 소수의 합

    print(f"\\n소수의 개수: {prime_count}개")
    print(f"소수의 합: {prime_sum}")`,
    en: `# Sieve of Eratosthenes
# Find all prime numbers from 1 to n, then count them and sum them.

def find_primes(n):
    # Initialize a list of size n+1 to True (all are prime candidates)
    is_prime = [True] * (n + 1)
    is_prime[0] = is_prime[1] = False  # 0 and 1 are not prime

    # Apply the Sieve of Eratosthenes algorithm
    for i in range(2, int(n**0.5) + 1):
        if is_prime[i]:
            # Mark every multiple of i as not prime
            for j in range(i*i, n+1, i):
                is_prime[j] = False

    # Build the list of primes
    primes = [i for i in range(2, n+1) if is_prime[i]]
    return primes


# Main logic
if __name__ == "__main__":
    n = 100                     # the maximum number to search up to

    primes = find_primes(n)     # call the prime-finding function

    print(f"Primes from 1 to {n}:")
    print(primes)               # print the list of primes

    prime_count = len(primes)   # how many primes were found
    prime_sum = sum(primes)     # the sum of the primes

    print(f"\\nNumber of primes: {prime_count}")
    print(f"Sum of primes: {prime_sum}")`
};

let MACODE_LANG = 'ko';

/** Switches the active language used by t(). */
function setLangGlobal(lang) {
    MACODE_LANG = I18N[lang] ? lang : 'ko';
}

/**
 * Resolves a dot-pathed key (e.g. 'toast.done') in the current language,
 * falling back to Korean, then to the key itself.
 * @param {string} key
 * @returns {*}
 */
function t(key) {
    const parts = key.split('.');
    const dig = (table) => {
        let v = table;
        for (const p of parts) v = (v == null ? undefined : v[p]);
        return v;
    };
    let v = dig(I18N[MACODE_LANG] || I18N.ko);
    if (v == null) v = dig(I18N.ko);
    return v == null ? key : v;
}
