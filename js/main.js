document.addEventListener('DOMContentLoaded', () => {
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
    const themeSelect = document.getElementById('themeSelect');

    let isTyping = false;
    let recorder = null;      // screen-capture recorder
    let canvasRec = null;     // canvas recorder
    let currentLang = 'ko';
    let codeIsDefault = true; // true while the editor still holds the default sample

    initResizer(resizer, sidebar);

    const STORAGE_KEY = 'macode:settings';
    const THEME_IDS = ['dark', 'light', 'monokai'];
    const RECORD_MODE_IDS = ['canvas', 'screen'];

    // Build <select> options from the registries (labels localized later by applyLanguage).
    LANGUAGES.forEach(({ id, label }) => languageSelect.add(new Option(label, id)));
    THEME_IDS.forEach(id => themeSelect.add(new Option(id, id)));
    RECORD_MODE_IDS.forEach(id => recordModeSelect.add(new Option(id, id)));

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

    loadSettings();
    applyTheme(themeSelect.value);
    windowTitle.textContent = fileNameInput.value || 'untitled';

    [codeInput, fileNameInput, speedInput].forEach(el => el.addEventListener('input', queueSave));
    [languageSelect, aiMode, recordModeSelect].forEach(el => el.addEventListener('change', queueSave));
    themeSelect.addEventListener('change', () => { applyTheme(themeSelect.value); queueSave(); });
    codeInput.addEventListener('input', () => { codeIsDefault = false; });

    cursorEl.style.display = "none";

    // Tab inserts spaces (indent/outdent) instead of moving focus out of the editor.
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
        queueSave(); // programmatic value change does not fire 'input'
    });

    // Canvas recording (default) needs only MediaRecorder + canvas.captureStream. Screen-capture
    // mode additionally needs getDisplayMedia, reported per-attempt rather than pre-disabling.
    const canRecord = typeof MediaRecorder !== 'undefined'
        && typeof HTMLCanvasElement !== 'undefined'
        && typeof HTMLCanvasElement.prototype.captureStream === 'function';
    if (!canRecord) {
        startBtn.disabled = true;
        startBtn.classList.add('opacity-50', 'cursor-not-allowed');
        const note = document.getElementById('recordUnsupportedNote');
        if (note) note.classList.remove('hidden');
    }

    function applyLanguage(lang) {
        const L = I18N[lang] ? lang : 'ko';
        currentLang = L;
        setLangGlobal(L);
        document.documentElement.lang = L;

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const v = t(el.getAttribute('data-i18n'));
            if (v != null) el.textContent = v;
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const v = t(el.getAttribute('data-i18n-aria'));
            if (v != null) el.setAttribute('aria-label', v);
        });

        [...themeSelect.options].forEach(o => { o.textContent = I18N[L].themes[o.value] || o.value; });
        [...recordModeSelect.options].forEach(o => { o.textContent = I18N[L].recordModes[o.value] || o.value; });
        speedValue.textContent = I18N[L].speed[parseInt(speedInput.value)] || '';
        langToggle.textContent = I18N[L].langToggle;
        if (!canRecord) startBtn.title = I18N[L].recordUnsupported;

        // Default sample follows the language — only while unedited.
        if (codeIsDefault) codeInput.value = SAMPLE_CODE[L];
    }

    applyLanguage(currentLang);

    langToggle.addEventListener('click', () => {
        applyLanguage(currentLang === 'ko' ? 'en' : 'ko');
        queueSave();
    });

    fileNameInput.addEventListener('input', (e) => {
        windowTitle.textContent = e.target.value || 'untitled';
    });

    speedInput.addEventListener('input', (e) => {
        speedValue.textContent = I18N[currentLang].speed[parseInt(e.target.value)] || '';
    });

    function startAnimation(onComplete) {
        if (isTyping) stopTyping();
        isTyping = true;
        outputBox.innerHTML = "";
        cursorEl.style.display = ""; // show caret while typing
        typeCode(
            codeInput.value,
            parseInt(speedInput.value),
            aiMode.checked,
            languageSelect.value,
            outputBox,
            () => scrollToBottom(codeDisplay),
            () => {
                isTyping = false;
                cursorEl.style.display = "none"; // hide caret on completion
                if (onComplete) onComplete();
            }
        );
    }

    previewBtn.addEventListener('click', () => { startAnimation(); });

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

    // Screen-capture path (fallback): records the DOM Mac window via getDisplayMedia.
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
        });
    }

    // Canvas path (default): draws window + code onto a 1080p canvas and records it.
    async function runCanvasRender() {
        if (canvasRec) canvasRec.stop();
        try { await document.fonts.load("30px 'Fira Code'"); await document.fonts.load("19px 'Fira Code'"); } catch (e) { /* font optional */ }

        const renderer = new CanvasCodeRenderer(renderCanvas, 1920, 1080);
        renderer.setup(codeInput.value, languageSelect.value, fileNameInput.value || 'untitled');
        renderer.drawFrame(0, false);

        canvasRec = new CanvasRecorder(renderCanvas, 30);
        try {
            canvasRec.start();
        } catch (err) {
            showToast(t('toast.startFail') + err.message, 'error');
            return;
        }
        canvasRec.captureFrame(); // record the initial empty-window frame

        macWindowEl.classList.add('hidden');
        renderCanvas.classList.remove('hidden');
        enterRenderUI();

        renderer.play(
            parseInt(speedInput.value),
            aiMode.checked,
            () => {
                setTimeout(() => {
                    canvasRec.stop();
                    exitRenderUI();
                    renderCanvas.classList.add('hidden');
                    macWindowEl.classList.remove('hidden');
                }, 350);
            },
            () => canvasRec.captureFrame()
        );
    }

    startBtn.addEventListener('click', () => {
        if (startBtn.disabled) return;
        if (isTyping) stopTyping();
        if (recordModeSelect.value === 'screen') runScreenCaptureRender();
        else runCanvasRender();
    });

    toggleSidebar.addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        if (window.innerWidth >= 1024) {
            sidebar.classList.add('lg:translate-x-0');
            toggleSidebar.classList.add('lg:hidden');
        }
    });
});
