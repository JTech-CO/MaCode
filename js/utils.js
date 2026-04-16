/**
 * Utility functions for MaCode
 */

/**
 * Scrolls the element to the bottom
 * @param {HTMLElement} element 
 */
function scrollToBottom(element) {
    if (element) {
        element.scrollTop = element.scrollHeight;
    }
}

/**
 * Initializes the resizer logic for the sidebar
 * @param {HTMLElement} resizer 
 * @param {HTMLElement} sidebar 
 */
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
        if (newWidth >= 250 && newWidth <= maxWidth) {
            sidebar.style.width = newWidth + 'px';
        }
    });

    document.addEventListener('mouseup', () => {
        if (isResizing) {
            isResizing = false;
            document.body.style.cursor = 'default';
        }
    });
}
/**
 * VideoRecorder class to capture a specific DOM element as a video file
 */
class VideoRecorder {
    constructor(element) {
        this.element = element;
        this.recorder = null;
        this.stream = null;
        this.chunks = [];
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        this.video = document.createElement('video');
        this.video.muted = true;
    }

    async start() {
        try {
            // Request screen capture for the current tab
            this.stream = await navigator.mediaDevices.getDisplayMedia({
                video: { 
                    displaySurface: "browser",
                    preferCurrentTab: true 
                },
                audio: false
            });

            this.video.srcObject = this.stream;
            await this.video.play();

            // Calculate ratios between physical stream and CSS viewport
            const rect = this.element.getBoundingClientRect();
            const scaleX = this.video.videoWidth / window.innerWidth;
            const scaleY = this.video.videoHeight / window.innerHeight;

            // Set canvas size based on physical pixels for 4K support and quality
            this.canvas.width = rect.width * scaleX;
            this.canvas.height = rect.height * scaleY;

            const canvasStream = this.canvas.captureStream(60); // 60 FPS
            
            // Check supported mime types
            const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
                ? 'video/webm;codecs=vp9' 
                : 'video/webm';

            this.recorder = new MediaRecorder(canvasStream, { mimeType });
            
            this.recorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.chunks.push(e.data);
            };
            
            this.recorder.onstop = () => this.download();

            this.recorder.start();
            this.recordFrame();
            
            return true;
        } catch (err) {
            console.error("Recording failed to start:", err);
            return false;
        }
    }

    recordFrame() {
        if (!this.stream || !this.stream.active) return;

        const rect = this.element.getBoundingClientRect();
        
        // Recalculate scaling to handle any mid-recording viewport changes (though rare)
        const scaleX = this.video.videoWidth / window.innerWidth;
        const scaleY = this.video.videoHeight / window.innerHeight;
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(
            this.video, 
            rect.left * scaleX, rect.top * scaleY, rect.width * scaleX, rect.height * scaleY, // Scoped source
            0, 0, this.canvas.width, this.canvas.height  // Destination
        );
        
        this.animationId = requestAnimationFrame(() => this.recordFrame());
    }

    stop() {
        if (this.recorder && this.recorder.state !== 'inactive') {
            this.recorder.stop();
        }
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    download() {
        if (this.chunks.length === 0) return;

        const blob = new Blob(this.chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `macode-render-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
}
