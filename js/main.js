

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

    let isTyping = false;
    let recorder = null;

    // Initialize Resizer
    initResizer(resizer, sidebar);

    // File name change event
    fileNameInput.addEventListener('input', (e) => {
        windowTitle.textContent = e.target.value || 'untitled';
    });

    // Speed label update
    speedInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        speedValue.textContent = speedSettings[val].label;
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
        
        typeCode(
            code, 
            speedLevel, 
            isChunkMode, 
            selectedLang, 
            outputBox, 
            () => scrollToBottom(codeDisplay),
            () => { 
                isTyping = false; 
                if (onComplete) onComplete();
            }
        );
    }

    // Preview Button handler
    previewBtn.addEventListener('click', () => {
        startAnimation();
    });

    // Start Rendering Button handler (Full Screen style with Recording)
    startBtn.addEventListener('click', async () => {
        // Clear previous state
        if (isTyping) stopTyping();
        if (recorder) recorder.stop();

        // Target the Mac Window
        const macWindow = document.querySelector('main > div');
        recorder = new VideoRecorder(macWindow);

        // Try to start recording
        const started = await recorder.start();
        if (!started) return;

        // Show "Recording" status (can be handled in HTML/CSS)
        document.body.classList.add('is-rendering');
        
        // Hide sidebar
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('lg:translate-x-0');
        toggleSidebar.classList.remove('lg:hidden');
        
        // Start typing and stop recording when done
        startAnimation(() => {
            recorder.stop();
            document.body.classList.remove('is-rendering');
            // Show sidebar again if needed, or leave it for clean download
            alert("렌더링이 완료되었습니다! 파일 다운로드를 확인해 주세요.");
        });
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
