const speedSettings = { 1: { delay: 150 }, 2: { delay: 70 }, 3: { delay: 30 }, 4: { delay: 10 }, 5: { delay: 2 } };

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
    // Hex colors matched before selectors; no lookbehind (older Safari would throw a regex SyntaxError).
    regex: /(\/\*[\s\S]*?\*\/)|(#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b)|(#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+)|([a-zA-Z0-9-]+)(?=\s*:)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')|(\b\d*\.?\d+(?:px|em|rem|ex|ch|vh|vw|vmin|vmax|%|s|ms|fr|deg|rad|turn|pt|pc|cm|mm|in)?)/g,
    groups: { 1: 'comment', 2: 'number', 3: 'class', 4: 'property', 5: 'string', 6: 'number' }
};

// Single source of truth for supported languages — drives both the tokenizer and the UI <select>.
const LANGUAGES = [
    { id: 'python',     label: 'Python',                  rules: PY_RULES },
    { id: 'javascript', label: 'JavaScript / TypeScript', rules: JS_RULES },
    { id: 'html',       label: 'HTML',                    rules: HTML_RULES },
    { id: 'css',        label: 'CSS',                     rules: CSS_RULES },
    { id: 'java',       label: 'Java / C++',              rules: JS_RULES }
];
const LANGUAGE_RULES = Object.fromEntries(LANGUAGES.map(l => [l.id, l.rules]));

function tokenize(text, lang) {
    const rule = LANGUAGE_RULES[lang];
    if (!rule) return text ? [{ type: null, text }] : [];
    const { regex, groups } = rule;
    const tokens = [];
    let last = 0;
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(text)) !== null) {
        if (m.index > last) tokens.push({ type: null, text: text.slice(last, m.index) });
        let type = null;
        for (let g = 1; g < m.length; g++) {
            if (m[g] !== undefined && groups[g] !== undefined) { type = groups[g]; break; }
        }
        tokens.push({ type, text: m[0] });
        last = m.index + m[0].length;
        if (regex.lastIndex === m.index) regex.lastIndex++;
    }
    if (last < text.length) tokens.push({ type: null, text: text.slice(last) });
    return tokens;
}

function escapeHtml(s) {
    return s.replace(/[&<>]/g, c => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
}

function highlightSyntax(text, lang) {
    return tokenize(text, lang)
        .map(tok => tok.type ? `<span class="token-${tok.type}">${escapeHtml(tok.text)}</span>` : escapeHtml(tok.text))
        .join('');
}

let typingTimeout = null;
let typingRaf = null;

function stopTyping() {
    if (typingTimeout !== null) { clearTimeout(typingTimeout); typingTimeout = null; }
    if (typingRaf !== null) { cancelAnimationFrame(typingRaf); typingRaf = null; }
}

// Append-only typing: tokenize once, then reveal via text-node appendData (O(C), no innerHTML
// rebuild, no flicker). A timer advances the target; a single rAF coalesces appends per frame.
function typeCode(text, speedLevel, useChunk, lang, outputBox, onUpdate, onComplete) {
    stopTyping();
    const tokens = tokenize(text, lang);
    const total = text.length;
    const baseDelay = speedSettings[speedLevel].delay;
    outputBox.textContent = "";

    let tokenIdx = 0, offsetInToken = 0, activeNode = null, revealedChars = 0, cursorChars = 0, done = false;

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

    function revealTo(target) {
        while (revealedChars < target && tokenIdx < tokens.length) {
            const tok = tokens[tokenIdx];
            if (offsetInToken === 0) activeNode = openToken(tok.type);
            const take = Math.min(tok.text.length - offsetInToken, target - revealedChars);
            activeNode.appendData(tok.text.slice(offsetInToken, offsetInToken + take));
            offsetInToken += take;
            revealedChars += take;
            if (offsetInToken >= tok.text.length) { tokenIdx++; offsetInToken = 0; activeNode = null; }
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
        const delay = useChunk ? baseDelay + (Math.random() > 0.8 ? 50 : 0) : baseDelay + (Math.random() * (baseDelay * 0.5));
        if (cursorChars < total) typingTimeout = setTimeout(advance, Math.max(1, delay));
    }

    typingRaf = requestAnimationFrame(render);
    if (total > 0) advance();
}
