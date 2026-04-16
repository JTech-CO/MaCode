/**
 * Editor logic and animation engine
 */

const speedSettings = {
    1: { delay: 150, label: "1 - 매우 느림" },
    2: { delay: 70, label: "2 - 느림" },
    3: { delay: 30, label: "3 - 보통" },
    4: { delay: 10, label: "4 - 빠름" },
    5: { delay: 2, label: "5 - 매우 빠름" }
};

/**
 * Highlights syntax for given text and language
 * @param {string} text 
 * @param {string} lang 
 * @returns {string} HTML string
 */
function highlightSyntax(text, lang) {
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    if (lang === 'javascript' || lang === 'java') {
        const regex = /(\/\/.*|\/\*[\s\S]*?\*\/)|("[^"]*"|'[^']*'|`[^`]*`)|(\b(?:async|function|const|let|var|for|while|if|else|return|await|class|import|export|public|private|protected|static|void|int|String|boolean|new|this|try|catch|switch|case|break|continue|default|true|false|null|undefined)\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*\()|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*:)|(\b\d+(\.\d+)?\b)/g;
        html = html.replace(regex, (match, comment, str, kw, cls, func, prop, num) => {
            if (comment) return `<span class="token-comment">${comment}</span>`;
            if (str) return `<span class="token-string">${str}</span>`;
            if (kw) return `<span class="token-keyword">${kw}</span>`;
            if (cls) return `<span class="token-class">${cls}</span>`;
            if (func) return `<span class="token-function">${func}</span>`;
            if (prop) return `<span class="token-property">${prop}</span>`;
            if (num) return `<span class="token-number">${num}</span>`;
            return match;
        });
    } else if (lang === 'python') {
        const regex = /(#.*)|("[^"]*"|'[^']*'|"""[\s\S]*?""")|(\b(?:def|class|import|from|if|elif|else|while|for|return|async|await|True|False|None|and|or|not|in|is|try|except|with|as|pass|break|continue|global|nonlocal|lambda)\b)|(\b[A-Z][a-zA-Z0-9_]*\b)|(\b[a-zA-Z_$][0-9a-zA-Z_$]*)(?=\s*\()|(\b\d+(\.\d+)?\b)/g;
        html = html.replace(regex, (match, comment, str, kw, cls, func, num) => {
            if (comment) return `<span class="token-comment">${comment}</span>`;
            if (str) return `<span class="token-string">${str}</span>`;
            if (kw) return `<span class="token-keyword">${kw}</span>`;
            if (cls) return `<span class="token-class">${cls}</span>`;
            if (func) return `<span class="token-function">${func}</span>`;
            if (num) return `<span class="token-number">${num}</span>`;
            return match;
        });
    } else if (lang === 'html') {
        const regex = /(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?[a-zA-Z0-9-]+)|("[^"]*"|'[^']*')|([a-zA-Z0-9-]+)(?=\s*=)/g;
        html = html.replace(regex, (match, comment, tag, str, attr) => {
            if (comment) return `<span class="token-comment">${comment}</span>`;
            if (tag) return `<span class="token-keyword">${tag}</span>`;
            if (str) return `<span class="token-string">${str}</span>`;
            if (attr) return `<span class="token-property">${attr}</span>`;
            return match;
        });
    } else if (lang === 'css') {
        const regex = /(\/\*[\s\S]*?\*\/)|(#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+)|([a-zA-Z0-9-]+)(?=\s*:)|("[^"]*"|'[^']*')|(\b\d+(px|em|rem|%|vh|vw)?\b)/g;
        html = html.replace(regex, (match, comment, selector, prop, str, num) => {
            if (comment) return `<span class="token-comment">${comment}</span>`;
            if (selector) return `<span class="token-class">${selector}</span>`;
            if (prop) return `<span class="token-property">${prop}</span>`;
            if (str) return `<span class="token-string">${str}</span>`;
            if (num) return `<span class="token-number">${num}</span>`;
            return match;
        });
    }

    return html;
}

let typingTimeout;

/**
 * Stops current typing animation
 */
function stopTyping() {
    if (typingTimeout) {
        clearTimeout(typingTimeout);
    }
}

/**
 * Core typing animation logic
 * @param {string} text 
 * @param {number} speedLevel 
 * @param {boolean} useChunk 
 * @param {string} lang 
 * @param {HTMLElement} outputBox 
 * @param {Function} onUpdate 
 * @param {Function} onComplete 
 */
function typeCode(text, speedLevel, useChunk, lang, outputBox, onUpdate, onComplete) {
    let index = 0;
    let currentHTML = "";
    outputBox.innerHTML = "";
    
    const baseDelay = speedSettings[speedLevel].delay;
    
    function type() {
        if (index < text.length) {
            let chunk = "";
            
            // AI Chunk Mode
            if (useChunk) {
                let chunkSize = Math.floor(Math.random() * 5) + 1;
                chunk = text.substring(index, index + chunkSize);
                index += chunkSize;
            } else {
                chunk = text.charAt(index);
                index++;
            }

            currentHTML += chunk;
            
            outputBox.innerHTML = highlightSyntax(currentHTML, lang);
            
            if (onUpdate) onUpdate();

            let currentDelay = baseDelay;
            if(useChunk) {
                currentDelay = baseDelay + (Math.random() > 0.8 ? 50 : 0);
            } else {
                currentDelay = baseDelay + (Math.random() * (baseDelay * 0.5));
            }
            
            typingTimeout = setTimeout(type, Math.max(1, currentDelay));
        } else {
            if (onComplete) onComplete();
        }
    }
    type();
}
