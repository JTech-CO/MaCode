

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const codeInput = document.getElementById('codeInput');
    const fileNameInput = document.getElementById('fileNameInput');
    const languageSelect = document.getElementById('languageSelect');
    const speedInput = document.getElementById('speedInput');
    const speedValue = document.getElementById('speedValue');
    const aiMode = document.getElementById('aiMode');
    const previewBtn = document.getElementById('previewBtn');
    const startBtn = document.getElementById('startBtn');
    const outputBox = document.getElementById('outputBox');
    const codeDisplay = document.getElementById('codeDisplay');
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('resizer');
    const toggleSidebar = document.getElementById('toggleSidebar');
    const windowTitle = document.getElementById('windowTitle');
    const cursorEl = document.getElementById('cursor');
    const recordModeSelect = document.getElementById('recordModeSelect');
    const renderCanvas = document.getElementById('renderCanvas');
    const macWindowEl = document.getElementById('macWindow');
    const langToggle = document.getElementById('langToggle');

    let isTyping = false;
    let recorder = null;      // screen-capture recorder (VideoRecorder)
    let canvasRec = null;     // canvas recorder (CanvasRecorder)
    let currentLang = 'ko';   // UI language (KR / EN)
    let codeIsDefault = true; // true while the editor still holds the default sample

    // Initialize Resizer
    initResizer(resizer, sidebar);

    // --- Registries + settings persistence (P2) ---
    const themeSelect = document.getElementById('themeSelect');
    const STORAGE_KEY = 'macode:settings';
    const THEMES = [
        { id: 'dark',    label: '다크 (VS Code)' },
        { id: 'light',   label: '라이트' },
        { id: 'monokai', label: '모노카이' }
    ];
    const THEME_IDS = THEMES.map(t => t.id);
    const RECORD_MODES = [
        { id: 'canvas', label: '캔버스 (권장 · 권한 불필요)' },
        { id: 'screen', label: '화면 캡처 (탭 선택)' }
    ];
    const RECORD_MODE_IDS = RECORD_MODES.map(m => m.id);

    // Build the <select> options from their registries (single source of truth):
    // languages from editor.js LANGUAGES; themes / record-modes from the lists above.
    LANGUAGES.forEach(({ id, label }) => languageSelect.add(new Option(label, id)));
    THEMES.forEach(({ id, label }) => themeSelect.add(new Option(label, id)));
    RECORD_MODES.forEach(({ id, label }) => recordModeSelect.add(new Option(label, id)));

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', THEME_IDS.includes(theme) ? theme : 'dark');
    }

    function saveSettings() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                code: codeIsDefault ? null : codeInput.value,
                fileName: fileNameInput.value,
                language: languageSelect.value,
                speed: speedInput.value,
                aiMode: aiMode.checked,
                theme: themeSelect.value,
                recordMode: recordModeSelect.value,
                lang: currentLang
            }));
        } catch (e) { /* storage blocked (private mode / quota) — non-fatal */ }
    }

    let saveTimer = null;
    function queueSave() {
        if (saveTimer) clearTimeout(saveTimer);
        saveTimer = setTimeout(saveSettings, 300);
    }

    function loadSettings() {
        let s = null;
        try { s = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch (e) { s = null; }
        if (!s) return;
        if (typeof s.code === 'string') { codeInput.value = s.code; codeIsDefault = false; }
        if (typeof s.fileName === 'string') fileNameInput.value = s.fileName;
        if (s.language && LANGUAGE_RULES[s.language]) languageSelect.value = s.language;
        if (s.speed && speedSettings[parseInt(s.speed)]) speedInput.value = s.speed;
        if (typeof s.aiMode === 'boolean') aiMode.checked = s.aiMode;
        if (THEME_IDS.includes(s.theme)) themeSelect.value = s.theme;
        if (RECORD_MODE_IDS.includes(s.recordMode)) recordModeSelect.value = s.recordMode;
        if (s.lang && I18N[s.lang]) currentLang = s.lang;
    }

    // Hydrate from storage, then reflect into dependent UI. (Language-dependent
    // text — speed label, select labels, default sample — is set by applyLanguage.)
    loadSettings();
    applyTheme(themeSelect.value);
    windowTitle.textContent = fileNameInput.value || 'untitled';

    // Persist on change (debounced); theme also applies live.
    [codeInput, fileNameInput, speedInput].forEach(el => el.addEventListener('input', queueSave));
    [languageSelect, aiMode, recordModeSelect].forEach(el => el.addEventListener('change', queueSave));
    themeSelect.addEventListener('change', () => { applyTheme(themeSelect.value); queueSave(); });
    codeInput.addEventListener('input', () => { codeIsDefault = false; }); // user edited the sample

    // Caret is hidden while idle; startAnimation() shows it during typing.
    cursorEl.style.display = "none";

    // Tab inserts spaces (indent) instead of moving focus out of the editor.
    codeInput.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        e.preventDefault();
        const INDENT = '    ';
        const val = codeInput.value;
        const start = codeInput.selectionStart;
        const end = codeInput.selectionEnd;
        if (start === end) {
            codeInput.value = val.slice(0, start) + INDENT + val.slice(end);
            codeInput.selectionStart = codeInput.selectionEnd = start + INDENT.length;
        } else {
            const lineStart = val.lastIndexOf('\n', start - 1) + 1;
            const block = val.slice(lineStart, end);
            if (e.shiftKey) {
                const out = block.replace(/^ {1,4}/gm, '');
                codeInput.value = val.slice(0, lineStart) + out + val.slice(end);
                codeInput.selectionStart = lineStart;
                codeInput.selectionEnd = end - (block.length - out.length);
            } else {
                const ind = block.replace(/^/gm, INDENT);
                codeInput.value = val.slice(0, lineStart) + ind + val.slice(end);
                codeInput.selectionStart = start + INDENT.length;
                codeInput.selectionEnd = end + (ind.length - block.length);
            }
        }
        queueSave(); // programmatic value change does not fire an 'input' event
    });

    // Canvas recording (the default) only needs MediaRecorder + canvas.captureStream,
    // which is broadly supported. Disable the button only if even that is missing.
    // (Screen-capture mode additionally needs getDisplayMedia; that gap is reported
    //  per-attempt by VideoRecorder.start() rather than by pre-disabling the button.)
    const canRecord = typeof MediaRecorder !== 'undefined'
        && typeof HTMLCanvasElement !== 'undefined'
        && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    if (!canRecord) {
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        const note = document.getElementById('recordUnsupportedNote');
        if (note) note.classList.remove('hidden');
    }

    // --- Internationalization (KR / EN) ---
    function applyLanguage(lang) {
        const L = I18N[lang] ? lang : 'ko';
        currentLang = L;
        setLangGlobal(L); // so t() (toasts/errors) localizes too
        document.documentElement.lang = L;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const v = t(el.getAttribute('data-i18n'));
            if (v != null) el.textContent = v;
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const v = t(el.getAttribute('data-i18n-aria'));
            if (v != null) el.setAttribute('aria-label', v);
        });

        // Localize select option labels (values stay), speed label, toggle text.
        [...themeSelect.options].forEach(o => { o.textContent = I18N[L].themes[o.value] || o.value; });
        [...recordModeSelect.options].forEach(o => { o.textContent = I18N[L].recordModes[o.value] || o.value; });
        speedValue.textContent = I18N[L].speed[parseInt(speedInput.value)] || '';
        langToggle.textContent = I18N[L].langToggle;
        if (!canRecord) startBtn.title = I18N[L].recordUnsupported;

        // The default sample follows the language — but only while unedited.
        if (codeIsDefault) codeInput.value = SAMPLE_CODE[L];
    }

    applyLanguage(currentLang);

    langToggle.addEventListener('click', () => {
        applyLanguage(currentLang === 'ko' ? 'en' : 'ko');
        queueSave();
    });

    // File name change event
    fileNameInput.addEventListener('input', (e) => {
        windowTitle.textContent = e.target.value || 'untitled';
    });

    // Speed label update
    speedInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        speedValue.textContent = I18N[currentLang].speed[val] || '';
    });

    /**
     * Resets and starts the animation
     * @param {Function} onComplete 
     */
    function startAnimation(onComplete) {
        if (isTyping) {
            stopTyping();
        }
        
        isTyping = true;
        const code = codeInput.value;
        const speedLevel = parseInt(speedInput.value);
        const isChunkMode = aiMode.checked;
        const selectedLang = languageSelect.value;
        
        outputBox.innerHTML = "";
        cursorEl.style.display = ""; // show caret while typing

        typeCode(
            code,
            speedLevel,
            isChunkMode,
            selectedLang,
            outputBox,
            () => scrollToBottom(codeDisplay),
            () => {
                isTyping = false;
                cursorEl.style.display = "none"; // hide caret on completion (clean final frame)
                if (onComplete) onComplete();
            }
        );
    }

    // Preview Button handler
    previewBtn.addEventListener('click', () => {
        startAnimation();
    });

    // --- Render UI helpers (hide controls during a render, restore after) ---
    function enterRenderUI() {
        document.body.classList.add('is-rendering');
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('lg:translate-x-0');
        toggleSidebar.classList.remove('lg:hidden');
    }
    function exitRenderUI() {
        document.body.classList.remove('is-rendering');
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('lg:translate-x-0');
        toggleSidebar.classList.add('lg:hidden');
    }

    // Screen-capture path (fallback): records the on-screen DOM Mac window via
    // getDisplayMedia. start() throws so a deliberate cancel is told apart from
    // a real / unsupported-browser error and surfaced via a toast.
    async function runScreenCaptureRender() {
        if (recorder) recorder.stop();
        recorder = new VideoRecorder(macWindowEl);
        try {
            await recorder.start();
        } catch (err) {
            if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                showToast(t('toast.cancelled'), 'info');
            } else {
                showToast(t('toast.startFail') + err.message, 'error');
            }
            return;
        }
        enterRenderUI();
        startAnimation(() => {
            recorder.stop();
            exitRenderUI();
            // Success feedback fires from downloadRecording() once the file exists.
        });
    }

    // Canvas path (default): draws the window + code straight onto a 1080p canvas
    // and records it — no permission prompt, deterministic output, any browser.
    async function runCanvasRender() {
        if (canvasRec) canvasRec.stop();
        // Ensure Fira Code is ready so canvas text isn't drawn in a fallback font.
        try { await document.fonts.load("30px 'Fira Code'"); await document.fonts.load("19px 'Fira Code'"); } catch (e) { /* font optional */ }

        const renderer = new CanvasCodeRenderer(renderCanvas, 1920, 1080);
        renderer.setup(codeInput.value, languageSelect.value, fileNameInput.value || 'untitled');
        renderer.drawFrame(0, false); // empty window as the first recorded frame

        canvasRec = new CanvasRecorder(renderCanvas, 30);
        try {
            canvasRec.start();
        } catch (err) {
            showToast('녹화를 시작할 수 없습니다: ' + err.message, 'error');
            return;
        }
        canvasRec.captureFrame(); // record the initial empty-window frame

        // Show the canvas (hide the DOM window) so the user sees what is recorded.
        macWindowEl.classList.add('hidden');
        renderCanvas.classList.remove('hidden');
        enterRenderUI();

        renderer.play(
            parseInt(speedInput.value),
            aiMode.checked,
            () => {
                // Hold the final frame briefly (it persists until stop), then stop.
                setTimeout(() => {
                    canvasRec.stop();
                    exitRenderUI();
                    renderCanvas.classList.add('hidden');
                    macWindowEl.classList.remove('hidden');
                }, 350);
            },
            () => canvasRec.captureFrame() // push each drawn frame to the recorder
        );
    }

    // Start Rendering Button — dispatches to the selected recording mode.
    startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        if (isTyping) stopTyping();
        if (recordModeSelect.value === 'screen') {
            runScreenCaptureRender();
        } else {
            runCanvasRender();
        }
    });

    // Sidebar toggle handler
    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        if (window.innerWidth >= 1024) {
            sidebar.classList.add('lg:translate-x-0');
            toggleSidebar.classList.add('lg:hidden');
        }
    });
});
