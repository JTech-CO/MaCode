function scrollToBottom(element) {
    if (element) element.scrollTop = element.scrollHeight;
}

function initResizer(resizer, sidebar) {
    let isResizing = false;
    resizer.addEventListener('mousedown', (e) => {
        isResizing = true;
        document.body.style.cursor = 'col-resize';
        e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newWidth = e.clientX;
        const maxWidth = window.innerWidth * 0.5;
        if (newWidth >= 250 && newWidth <= maxWidth) sidebar.style.width = newWidth + 'px';
    });
    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
}

// Non-blocking, auto-dismissing toast (record success/failure feedback).
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.textContent = message;
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('toast--visible'));
    setTimeout(() => {
        toast.classList.remove('toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// First supported container/codec (MP4 preferred for universal playback). Shared by both recorders.
function pickVideoMime() {
    if (typeof MediaRecorder === 'undefined') throw new Error(t('errors.noMediaRecorder'));
    const candidates = ['video/mp4;codecs=h264', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = candidates.find(type => MediaRecorder.isTypeSupported(type));
    if (!mimeType) throw new Error(t('errors.noCodec'));
    return { mimeType, extension: mimeType.includes('mp4') ? 'mp4' : 'webm' };
}

// Builds the Blob and downloads it; toast is tied to actual chunk data so it never reports false success.
function downloadRecording(chunks, extension) {
    if (!chunks || chunks.length === 0) { showToast(t('toast.noData'), 'error'); return; }
    const blobType = extension === 'mp4' ? 'video/mp4' : 'video/webm';
    const blob = new Blob(chunks, { type: blobType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `macode-render-${Date.now()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); window.URL.revokeObjectURL(url); }, 100);
    showToast(t('toast.done'), 'success');
}

// Screen-capture recorder (fallback path; the default canvas path lives in canvasRenderer.js).
class VideoRecorder {
    constructor(element) {
        this.element = element;
        this.recorder = null;
        this.stream = null;
        this.chunks = [];
        this.mimeType = 'video/webm';
        this.extension = 'webm';
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        this.video = document.createElement('video');
        this.video.muted = true;
    }

    async start() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) throw new Error(t('errors.noGetDisplayMedia'));
            if (typeof MediaRecorder === 'undefined') throw new Error(t('errors.noMediaRecorder'));

            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: { displaySurface: "browser", preferCurrentTab: true },
                audio: false
            });
            this.video.srcObject = this.stream;
            await this.video.play();

            // scaleX/Y already encode devicePixelRatio (videoWidth is device px) — do NOT multiply by DPR.
            const rect = this.element.getBoundingClientRect();
            const scaleX = this.video.videoWidth / window.innerWidth;
            const scaleY = this.video.videoHeight / window.innerHeight;
            this.canvas.width = rect.width * scaleX;
            this.canvas.height = rect.height * scaleY;

            const canvasStream = this.canvas.captureStream(60);
            const { mimeType, extension } = pickVideoMime();
            this.mimeType = mimeType;
            this.extension = extension;
            this.recorder = new MediaRecorder(canvasStream, { mimeType });
            this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
            this.recorder.onstop = () => this.download();
            this.recorder.start();
            this.recordFrame();
            return true;
        } catch (err) {
            console.error("Recording failed to start:", err);
            this.stop();
            throw err;
        }
    }

    recordFrame() {
        if (!this.stream || !this.stream.active) return;
        const rect = this.element.getBoundingClientRect();
        const scaleX = this.video.videoWidth / window.innerWidth;
        const scaleY = this.video.videoHeight / window.innerHeight;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.video, rect.left * scaleX, rect.top * scaleY, rect.width * scaleX, rect.height * scaleY, 0, 0, this.canvas.width, this.canvas.height);
        this.animationId = requestAnimationFrame(() => this.recordFrame());
    }

    stop() {
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    }

    download() {
        downloadRecording(this.chunks, this.extension);
    }
}
