/**
 * Editor logic and animation engine.
 *
 * Rendering is APPEND-ONLY: the full source is tokenized once up front, then
 * revealed character-by-character by appending to the DOM (text nodes), so the
 * already-typed prefix is never re-escaped, re-tokenized, or rebuilt. This
 * turns the animation from O(C^2) into O(C), removes the per-frame innerHTML
 * subtree rebuild (and the cursor relayout it caused), and eliminates the
 * "unclosed string/comment renders as plain text until its closing delimiter
 * is typed, then snaps to color" flicker — the closer is already present at
 * tokenize time, so partial tokens are colored from the first character.
 */

const speedSettings = {
    1: { delay: 150, label: "1 - 매우 느림" },
    2: { delay: 70, label: "2 - 느림" },
    3: { delay: 30, label: "3 - 보통" },
    4: { delay: 10, label: "4 - 빠름" },
    5: { delay: 2, label: "5 - 매우 빠름" }
};

/* ---- Tokenizer ---------------------------------------------------------- */
// One combined regex per language. Capture-group index -> token type (the
// CSS class suffix used by the .token-* rules in components.css). Tokenizing
// runs on RAW (unescaped) source; escaping is the renderer's concern (DOM text
// nodes need none; highlightSyntax escapes per token).

const JS_RULES = {
    regex: /(\/\/.*|\/\*[\s\S]*?\*\/)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:async|function|const|let|var|for|while|if|else|return|await|class|import|export|public|private|protected|static|void|int|String|boolean|new|this|try|catch|switch|case|break|continue|default|true|false|null|undefined)\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*\()|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*:)|(\b\d+(\.\d+)?\b)/g,
    groups: { 1: 'comment', 2: 'string', 3: 'keyword', 4: 'class', 5: 'function', 6: 'property', 7: 'number' }
};
const PY_RULES = {
    regex: /(#.*)|("""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b(?:def|class|import|from|if|elif|else|while|for|return|async|await|True|False|None|and|or|not|in|is|try|except|with|as|pass|break|continue|global|nonlocal|lambda)\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*\()|(\b\d+(\.\d+)?\b)/g,
    groups: { 1: 'comment', 2: 'string', 3: 'keyword', 4: 'class', 5: 'function', 6: 'number' }
};
const HTML_RULES = {
    regex: /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z0-9-]+)|("[^"]*"|'[^']*')|([a-zA-Z0-9-]+)(?=\s*=)/g,
    groups: { 1: 'comment', 2: 'keyword', 3: 'string', 4: 'property' }
};
const CSS_RULES = {
    // Hex colors (#rgb/#rgba/#rrggbb/#rrggbbaa) are matched before the selector
    // rule so `color: #fff` reads as a value, not a selector. No lookbehind is
    // used (older Safari would throw a regex SyntaxError and break the whole file).
    regex: /(\/\*[\s\S]*?\*\/)|(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b)|(#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+)|([a-zA-Z0-9-]+)(?=\s*:)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d*\.?\d+(?:px|em|rem|ex|ch|vh|vw|vmin|vmax|%|s|ms|fr|deg|rad|turn|pt|pc|cm|mm|in)?)/g,
    groups: { 1: 'comment', 2: 'number', 3: 'class', 4: 'property', 5: 'string', 6: 'number' }
};

// Public registry — the SINGLE source of truth for supported languages. Both the
// tokenizer (LANGUAGE_RULES) and the UI <select> (built in main.js) derive from
// this list, so adding a language is a one-line change here. 'java' reuses the
// JS ruleset, matching the original highlighter.
const LANGUAGES = [
    { id: 'python',     label: 'Python',                  rules: PY_RULES },
    { id: 'javascript', label: 'JavaScript / TypeScript', rules: JS_RULES },
    { id: 'html',       label: 'HTML',                    rules: HTML_RULES },
    { id: 'css',        label: 'CSS',                     rules: CSS_RULES },
    { id: 'java',       label: 'Java / C++',              rules: JS_RULES }
];
const LANGUAGE_RULES = Object.fromEntries(LANGUAGES.map(l => [l.id, l.rules]));

/**
 * Splits source into a flat list of { type, text } tokens whose concatenated
 * text is exactly the input. `type` is null for plain (unhighlighted) runs.
 * @param {string} text
 * @param {string} lang
 * @returns {{type: (string|null), text: string}[]}
 */
function tokenize(text, lang) {
    const rule = LANGUAGE_RULES[lang];
    if (!rule) return text ? [{ type: null, text }] : [];

    const { regex, groups } = rule;
    const tokens = [];
    let last = 0;
    let m;
    regex.lastIndex = 0;

    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) {
            tokens.push({ type: null, text: text.slice(last, m.index) });
        }
        let type = null;
        for (let g = 1; g < m.length; g++) {
            if (m[g] !== undefined && groups[g] !== undefined) { type = groups[g]; break; }
        }
        tokens.push({ type, text: m[0] });
        last = m.index + m[0].length;
        if (regex.lastIndex === m.index) regex.lastIndex++; // guard against zero-width loop
    }
    if (last < text.length) {
        tokens.push({ type: null, text: text.slice(last) });
    }
    return tokens;
}

function escapeHtml(s) {
    return s.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

/**
 * Returns a highlighted HTML string for the full text. Single source of truth
 * is tokenize(); kept for one-shot static rendering (e.g. a future live
 * preview). The typing animation uses the append-only DOM path in typeCode().
 * @param {string} text
 * @param {string} lang
 * @returns {string}
 */
function highlightSyntax(text, lang) {
    return tokenize(text, lang)
        .map(tok => tok.type
            ? `<span class="token-${tok.type}">${escapeHtml(tok.text)}</span>`
            : escapeHtml(tok.text))
        .join('');
}

/* ---- Typing animation --------------------------------------------------- */

let typingTimeout = null;
let typingRaf = null;

/** Stops the current typing animation (both the advance timer and render loop). */
function stopTyping() {
    if (typingTimeout !== null) { clearTimeout(typingTimeout); typingTimeout = null; }
    if (typingRaf !== null) { cancelAnimationFrame(typingRaf); typingRaf = null; }
}

/**
 * Core typing animation. Pre-tokenizes once, then reveals progressively.
 * A timer advances the target cursor position (preserving per-speed pacing and
 * the AI-chunk burst/jitter feel); a single requestAnimationFrame coalesces all
 * DOM appends due since the last frame into one reflow, capping rendering work
 * at the display refresh rate instead of running it on every (down to 2ms) tick.
 *
 * @param {string} text
 * @param {number} speedLevel
 * @param {boolean} useChunk
 * @param {string} lang
 * @param {HTMLElement} outputBox
 * @param {Function} onUpdate    called after each rendered frame (e.g. scroll)
 * @param {Function} onComplete  called once when fully revealed
 */
function typeCode(text, speedLevel, useChunk, lang, outputBox, onUpdate, onComplete) {
    stopTyping();

    const tokens = tokenize(text, lang);
    const total = text.length;
    const baseDelay = speedSettings[speedLevel].delay;

    outputBox.textContent = "";

    let tokenIdx = 0;       // next token to append from
    let offsetInToken = 0;  // chars already appended from tokens[tokenIdx]
    let activeNode = null;  // Text node currently being appended into
    let revealedChars = 0;  // chars currently in the DOM
    let cursorChars = 0;    // target chars (advanced by the timer)
    let done = false;

    function openToken(type) {
        const textNode = document.createTextNode("");
        if (type) {
            const span = document.createElement("span");
            span.className = "token-" + type;
            span.appendChild(textNode);
            outputBox.appendChild(span);
        } else {
            outputBox.appendChild(textNode);
        }
        return textNode;
    }

    // Appends characters until revealedChars reaches `target`. Each character is
    // appended exactly once across the whole animation -> O(C) total. Text-node
    // appendData treats content as literal, so no HTML escaping is needed and
    // user code can never inject markup.
    function revealTo(target) {
        while (revealedChars < target && tokenIdx < tokens.length) {
            const tok = tokens[tokenIdx];
            if (offsetInToken === 0) activeNode = openToken(tok.type);

            const take = Math.min(tok.text.length - offsetInToken, target - revealedChars);
            activeNode.appendData(tok.text.slice(offsetInToken, offsetInToken + take));
            offsetInToken += take;
            revealedChars += take;

            if (offsetInToken >= tok.text.length) {
                tokenIdx++;
                offsetInToken = 0;
                activeNode = null;
            }
        }
    }

    function render() {
        typingRaf = null;
        if (revealedChars < cursorChars) {
            revealTo(cursorChars);
            if (onUpdate) onUpdate();
        }
        if (revealedChars < total) {
            typingRaf = requestAnimationFrame(render);
        } else if (!done) {
            done = true;
            if (onComplete) onComplete();
        }
    }

    function advance() {
        typingTimeout = null;
        const step = useChunk ? Math.floor(Math.random() * 5) + 1 : 1;
        cursorChars = Math.min(total, cursorChars + step);

        const delay = useChunk
            ? baseDelay + (Math.random() > 0.8 ? 50 : 0)
            : baseDelay + (Math.random() * (baseDelay * 0.5));

        if (cursorChars < total) {
            typingTimeout = setTimeout(advance, Math.max(1, delay));
        }
    }

    typingRaf = requestAnimationFrame(render);
    if (total > 0) advance();
}
