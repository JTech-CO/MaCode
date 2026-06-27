/**
 * Canvas rendering engine (P3).
 *
 * Draws the Mac window chrome + the progressively-revealed, syntax-highlighted
 * code directly onto a <canvas>, then records that canvas via captureStream().
 * Unlike the getDisplayMedia path (utils.js VideoRecorder), this needs NO
 * permission prompt, no tab picker, is resolution-deterministic (1920x1080 by
 * default), and works regardless of window size / scroll / zoom / browser.
 *
 * Reuses tokenize() (editor.js) for highlighting and reads theme colors from
 * the active [data-theme] CSS variables, so the recorded window matches the
 * on-screen theme. speedSettings/pickVideoMime/downloadRecording/showToast come
 * from editor.js + utils.js (loaded before this file).
 */

class CanvasCodeRenderer {
    /**
     * @param {HTMLCanvasElement} canvas  target canvas (shown + recorded)
     * @param {number} width   output width in px (default 1920)
     * @param {number} height  output height in px (default 1080)
     */
    constructor(canvas, width = 1920, height = 1080) {
        this.canvas = canvas;
        this.W = canvas.width = width;
        this.H = canvas.height = height;
        this.ctx = canvas.getContext('2d');
        this._raf = null;
        this._timeout = null;
        this._cacheRevealed = -1;
        this._cacheLayout = null;
    }

    /** Reads the active theme's resolved colors from CSS custom properties. */
    _readTheme() {
        const cs = getComputedStyle(document.documentElement);
        const v = (name, fallback) => (cs.getPropertyValue(name).trim() || fallback);
        return {
            macBg: v('--mac-bg', '#1e1e1e'),
            titlebar: v('--mac-titlebar', '#2d2d2d'),
            border: v('--mac-border', 'rgba(255,255,255,0.1)'),
            codeFg: v('--code-fg', '#d4d4d4'),
            keyword: v('--token-keyword', '#569cd6'),
            string: v('--token-string', '#ce9178'),
            number: v('--token-number', '#b5cea8'),
            comment: v('--token-comment', '#6a9955'),
            function: v('--token-function', '#dcdcaa'),
            property: v('--token-property', '#9cdcfe'),
            class: v('--token-class', '#4ec9b0')
        };
    }

    /** Prepares a render run (call once before play()/drawFrame()). */
    setup(code, lang, fileName) {
        this.tokens = tokenize(code, lang);
        this.total = code.length;
        this.fileName = fileName || 'untitled';
        this.theme = this._readTheme();
        this._cacheRevealed = -1;

        // Layout metrics (scaled to the 1080p canvas, not the CSS viewport).
        const scale = this.H / 1080;
        this.pad = Math.round(64 * scale);
        this.radius = Math.round(20 * scale);
        this.titleH = Math.round(56 * scale);
        this.codePadX = Math.round(52 * scale);
        this.codePadY = Math.round(40 * scale);
        this.fontSize = Math.round(30 * scale);
        this.lineHeight = Math.round(this.fontSize * 1.55);
        this.font = `${this.fontSize}px 'Fira Code', monospace`;
        this.titleFont = `${Math.round(this.fontSize * 0.62)}px 'Fira Code', monospace`;

        this.winX = this.pad;
        this.winY = this.pad;
        this.winW = this.W - this.pad * 2;
        this.winH = this.H - this.pad * 2;

        this.codeX = this.winX + this.codePadX;
        this.codeY = this.winY + this.titleH + this.codePadY;
        this.codeW = this.winW - this.codePadX * 2;
        this.codeH = this.winH - this.titleH - this.codePadY * 2;

        this.ctx.font = this.font;
        this.charW = this.ctx.measureText('M').width || (this.fontSize * 0.6);
        this.maxCols = Math.max(1, Math.floor(this.codeW / this.charW));
        this.maxVisibleLines = Math.max(1, Math.floor(this.codeH / this.lineHeight));
    }

    /** Builds wrapped/tab-expanded visual lines for the first `revealed` chars. */
    _layout(revealed) {
        if (revealed === this._cacheRevealed) return this._cacheLayout;
        const t = this.theme;
        const colorFor = (type) => (type && t[type]) ? t[type] : t.codeFg;
        const maxCols = this.maxCols;
        const lines = [];
        let runs = [];
        let runText = '';
        let runColor = null;
        let col = 0;

        const flushRun = () => { if (runText) { runs.push({ text: runText, color: runColor }); runText = ''; } };
        const endLine = () => { flushRun(); lines.push({ runs }); runs = []; col = 0; runColor = null; };
        const pushChar = (ch, color) => {
            if (runColor !== color) { flushRun(); runColor = color; }
            runText += ch;
            col++;
            if (col >= maxCols) { flushRun(); lines.push({ runs }); runs = []; col = 0; runColor = null; } // wrap
        };

        let remaining = revealed;
        for (const tok of this.tokens) {
            if (remaining <= 0) break;
            const color = colorFor(tok.type);
            const text = tok.text;
            for (let i = 0; i < text.length && remaining > 0; i++) {
                const ch = text[i];
                remaining--;
                if (ch === '\n') { endLine(); }
                else if (ch === '\t') {
                    const spaces = 4 - (col % 4);
                    for (let s = 0; s < spaces; s++) pushChar(' ', t.codeFg);
                } else {
                    pushChar(ch, color);
                }
            }
        }
        flushRun();
        lines.push({ runs }); // the in-progress (cursor) line
        const layout = { lines, cursorRow: lines.length - 1, cursorCol: col };
        this._cacheRevealed = revealed;
        this._cacheLayout = layout;
        return layout;
    }

    _roundRectPath(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    _drawBackdrop() {
        const ctx = this.ctx, W = this.W, H = this.H;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, H);
        const g1 = ctx.createRadialGradient(W * 0.1, H * 0.2, 0, W * 0.1, H * 0.2, W * 0.65);
        g1.addColorStop(0, 'rgba(26,42,108,0.45)');
        g1.addColorStop(1, 'rgba(26,42,108,0)');
        ctx.fillStyle = g1;
        ctx.fillRect(0, 0, W, H);
        const g2 = ctx.createRadialGradient(W * 0.9, H * 0.85, 0, W * 0.9, H * 0.85, W * 0.65);
        g2.addColorStop(0, 'rgba(178,31,31,0.30)');
        g2.addColorStop(1, 'rgba(178,31,31,0)');
        ctx.fillStyle = g2;
        ctx.fillRect(0, 0, W, H);
    }

    _drawWindow() {
        const ctx = this.ctx, t = this.theme;
        const { winX, winY, winW, winH, radius, titleH } = this;

        // Drop shadow + body
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = Math.round(60 * this.H / 1080);
        ctx.shadowOffsetY = Math.round(25 * this.H / 1080);
        this._roundRectPath(winX, winY, winW, winH, radius);
        ctx.fillStyle = t.macBg;
        ctx.fill();
        ctx.restore();

        // Title bar (clip to the window's rounded top)
        ctx.save();
        this._roundRectPath(winX, winY, winW, winH, radius);
        ctx.clip();
        ctx.fillStyle = t.titlebar;
        ctx.fillRect(winX, winY, winW, titleH);
        ctx.restore();

        // Border
        this._roundRectPath(winX, winY, winW, winH, radius);
        ctx.strokeStyle = t.border;
        ctx.lineWidth = Math.max(1, Math.round(this.H / 1080));
        ctx.stroke();

        // Traffic lights (Tailwind red/yellow/green-500, matching the DOM window)
        const cy = winY + titleH / 2;
        const r = Math.round(9 * this.H / 1080);
        const gap = Math.round(28 * this.H / 1080);
        let cx = winX + Math.round(28 * this.H / 1080);
        for (const c of ['#ef4444', '#eab308', '#22c55e']) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fillStyle = c;
            ctx.fill();
            cx += gap;
        }

        // Title text (file name), centered like the DOM title
        ctx.fillStyle = '#94a3b8';
        ctx.font = this.titleFont;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.fileName, winX + winW / 2, cy + 1);
    }

    /** Draws one full frame: backdrop, window, code revealed so far, caret. */
    drawFrame(revealed, showCursor) {
        const ctx = this.ctx, t = this.theme;
        this._drawBackdrop();
        this._drawWindow();

        const { lines, cursorRow, cursorCol } = this._layout(revealed);
        const startLine = Math.max(0, lines.length - this.maxVisibleLines);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = this.font;
        for (let row = startLine; row < lines.length; row++) {
            const vis = row - startLine;
            const y = this.codeY + vis * this.lineHeight + this.fontSize;
            let col = 0;
            for (const run of lines[row].runs) {
                ctx.fillStyle = run.color;
                ctx.fillText(run.text, this.codeX + col * this.charW, y);
                col += run.text.length;
            }
        }

        if (showCursor) {
            const cvRow = cursorRow - startLine;
            if (cvRow >= 0 && cvRow < this.maxVisibleLines) {
                const cx = this.codeX + cursorCol * this.charW;
                const cyTop = this.codeY + cvRow * this.lineHeight + (this.lineHeight - this.fontSize) / 2;
                ctx.fillStyle = t.codeFg;
                ctx.fillRect(cx, cyTop, Math.max(2, this.charW * 0.55), this.fontSize);
            }
        }
    }

    /**
     * Runs the typing animation, drawing each frame. A timer advances the
     * reveal target (preserving per-speed pacing + AI-chunk bursts); a single
     * rAF draws each frame (so the caret blinks and captureStream stays fed).
     * @param {Function} [onFrame]  called after each frame is drawn (e.g. to push
     *                              the frame to the recorder via requestFrame).
     * @returns {Function} stop() to abort early.
     */
    play(speedLevel, useChunk, onComplete, onFrame) {
        const baseDelay = speedSettings[speedLevel].delay;
        const total = this.total;
        let cursorChars = 0;
        let done = false;
        const startTime = performance.now();

        const advance = () => {
            this._timeout = null;
            const step = useChunk ? Math.floor(Math.random() * 5) + 1 : 1;
            cursorChars = Math.min(total, cursorChars + step);
            const delay = useChunk
                ? baseDelay + (Math.random() > 0.8 ? 50 : 0)
                : baseDelay + (Math.random() * (baseDelay * 0.5));
            if (cursorChars < total) this._timeout = setTimeout(advance, Math.max(1, delay));
        };

        const frame = (now) => {
            this._raf = null;
            const blink = Math.floor((now - startTime) / 500) % 2 === 0;
            this.drawFrame(cursorChars, cursorChars < total ? blink : false);
            if (onFrame) onFrame();
            if (cursorChars < total) {
                this._raf = requestAnimationFrame(frame);
            } else if (!done) {
                done = true;
                this.drawFrame(total, false); // clean final frame, no caret
                if (onFrame) onFrame();
                if (onComplete) onComplete();
            }
        };

        this._raf = requestAnimationFrame(frame);
        if (total > 0) {
            advance();
        } else {
            this.drawFrame(0, false);
            if (onFrame) onFrame();
            if (onComplete) onComplete();
        }
        return () => this.stop();
    }

    stop() {
        if (this._timeout) { clearTimeout(this._timeout); this._timeout = null; }
        if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    }
}

/**
 * Records a canvas to a video file via captureStream() — no getDisplayMedia,
 * no permission prompt. Shares codec selection + download with VideoRecorder.
 */
class CanvasRecorder {
    constructor(canvas, fps = 30) {
        this.canvas = canvas;
        this.fps = fps;
        this.chunks = [];
        this.recorder = null;
        this.stream = null;
        this.track = null;
        this.manual = false;
        this.extension = 'webm';
    }

    /** Throws (with a user-facing message) if recording is unsupported. */
    start() {
        const { mimeType, extension } = pickVideoMime();
        this.extension = extension;
        // Manual-frame capture (captureStream(0) + track.requestFrame) records
        // exactly the frames we draw and keeps producing frames even when the tab
        // isn't actively compositing. Fall back to auto fps if requestFrame is
        // unavailable on this browser.
        this.stream = this.canvas.captureStream(0);
        this.track = this.stream.getVideoTracks()[0];
        this.manual = !!(this.track && typeof this.track.requestFrame === 'function');
        if (!this.manual) {
            this.stream.getTracks().forEach((t) => t.stop());
            this.stream = this.canvas.captureStream(this.fps);
        }
        this.recorder = new MediaRecorder(this.stream, { mimeType });
        this.recorder.ondataavailable = (e) => { if (e.data.size > 0) this.chunks.push(e.data); };
        this.recorder.onstop = () => downloadRecording(this.chunks, this.extension);
        this.recorder.start();
    }

    /** Pushes the current canvas content as one video frame (manual mode). */
    captureFrame() {
        if (this.manual && this.track) this.track.requestFrame();
    }

    stop() {
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
        if (this.stream) this.stream.getTracks().forEach((track) => track.stop());
    }
}
