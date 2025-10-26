// Flask Session Forge - Pure Frontend Implementation

class FlaskSessionSerializer {
    constructor(secretKey) {
        this.secretKey = secretKey;
    }
    
    encode(data) {
        const json = JSON.stringify(data);
        const compressed = pako.deflate(json);
        
        let base64 = btoa(String.fromCharCode(...compressed));
        base64 = base64.replace(/\+/g, '-').replace(/\//g, '_');
        base64 = base64.replace(/=+$/, '');
        
        const hmac = CryptoJS.HmacSHA1(base64, this.secretKey);
        const sig = CryptoJS.enc.Base64.stringify(hmac);
        const signature = sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        
        return `${base64}.${signature}`;
    }
    
    decode(token) {
        const parts = token.split('.');
        if (parts.length !== 2) {
            throw new Error('Invalid token format');
        }
        
        const payload = parts[0];
        const signature = parts[1];
        
        const hmac = CryptoJS.HmacSHA1(payload, this.secretKey);
        const expectedSig = CryptoJS.enc.Base64.stringify(hmac);
        const expectedSigUrl = expectedSig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        
        if (expectedSigUrl !== signature) {
            throw new Error('Invalid signature - Wrong secret key');
        }
        
        let base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
            base64 += '=';
        }
        
        try {
            const decoded = atob(base64);
            const bytes = new Uint8Array(decoded.length);
            for (let i = 0; i < decoded.length; i++) {
                bytes[i] = decoded.charCodeAt(i);
            }
            
            const decompressed = pako.inflate(bytes, {to: 'string'});
            return JSON.parse(decompressed);
        } catch (e) {
            throw new Error('Failed to decode: ' + e.message);
        }
    }
}

// Theme toggle
function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        document.getElementById('theme-icon').textContent = 'L';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        document.getElementById('theme-icon').textContent = 'D';
        localStorage.setItem('theme', 'dark');
    }
}

// Load saved theme
window.addEventListener('DOMContentLoaded', function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-icon').textContent = 'D';
    }
    // Initialize status bars
    const sessionStatus = document.getElementById('session-status');
    const secretStatus = document.getElementById('secret-status');
    if (sessionStatus && !sessionStatus.textContent.trim()) {
        sessionStatus.textContent = 'Paste Flask Session Token';
    }
    if (secretStatus && !secretStatus.textContent.trim()) {
        secretStatus.textContent = 'Enter secret key';
    }
    // Prevent global wheel scrolling except when over form controls (inputs/textareas)
    function _wheelHandler(e) {
        try {
            const target = e.target;
            const tag = target && target.tagName ? target.tagName.toLowerCase() : '';
            // allow wheel when over textarea or input (so textareas can scroll)
            if (tag === 'textarea' || tag === 'input' || target.closest && target.closest('textarea, input')) {
                return; // allow default behavior
            }
            // otherwise prevent page from scrolling via mouse wheel / touchpad gestures
            e.preventDefault();
        } catch (err) {
            // swallow
        }
    }
    document.addEventListener('wheel', _wheelHandler, { passive: false });
});

// Helper to update status bars
function setStatusById(id, message, isError = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent = message || '';
    // isError can be: true (error), 'success' (success), false/null (neutral)
    if (isError === true) {
        el.classList.add('error');
        el.classList.remove('success');
    } else if (isError === 'success') {
        el.classList.remove('error');
        el.classList.add('success');
    } else {
        el.classList.remove('error');
        el.classList.remove('success');
    }
}

// Encode: Generate session from JSON
document.getElementById('payload-input').addEventListener('input', function() {
    const json = this.value.trim();
    const secret = document.getElementById('secret-input').value.trim();
    
    if (!json || !secret) {
        return;
    }
    
    try {
        const data = JSON.parse(json);
        const serializer = new FlaskSessionSerializer(secret);
        const token = serializer.encode(data);
        const input = document.getElementById('session-input');
        input.value = token;
        
        // Update highlight layer
        updateSessionDisplay();
        
        // Trigger decode to show result in JSON if it's encoded
        decodeSession();
    } catch (e) {
        // Invalid JSON or key, ignore
    }
});

// Decode: Extract and decode session
document.getElementById('secret-input').addEventListener('input', function() {
    decodeSession();
});

const sessionInput = document.getElementById('session-input');
sessionInput.addEventListener('input', function() {
    updateSessionDisplay();
    decodeSession();
});

function updateSessionDisplay() {
    const input = document.getElementById('session-input');
    const highlight = document.getElementById('session-highlight');
    const token = input.value;
    
    if (!token) {
        highlight.innerHTML = '';
        setStatusById('session-status', 'Paste Flask Session Token', false);
        return;
    }
    
    const parts = token.split('.');
    if (parts.length === 2) {
        const payload = escapeHtml(parts[0]);
        const signature = escapeHtml(parts[1]);
        highlight.innerHTML = `<span class="token-payload">${payload}</span>.<span class="token-signature">${signature}</span>`;
        setStatusById('session-status', 'Token contains payload and signature', false);
    } else if (parts.length === 1) {
        highlight.innerHTML = `<span class="token-payload">${escapeHtml(parts[0])}</span>`;
        setStatusById('session-status', 'Only payload present — signature missing', true);
    } else {
        highlight.textContent = escapeHtml(token);
        setStatusById('session-status', 'Invalid token format', true);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function decodeSession() {
    const input = document.getElementById('session-input');
    const token = input.value.trim();
    const secret = document.getElementById('secret-input').value.trim();
    
    if (!token || !secret) {
        const jsonInput = document.getElementById('payload-input');
        // Don't clear if user is typing
        if (jsonInput !== document.activeElement) {
            jsonInput.value = '';
        }
        // Update status hints
        if (!token) setStatusById('session-status', 'Paste Flask Session Token', false);
        if (!secret) setStatusById('secret-status', 'Enter secret key', false);
        return;
    }
    
    if (!token.includes('.')) {
        setStatusById('session-status', 'Token format seems wrong (no dot)', true);
        return;
    }
    
    try {
        const serializer = new FlaskSessionSerializer(secret);
        const data = serializer.decode(token);
        
        // Show decoded data in JSON input only if it's not focused
        const jsonInput = document.getElementById('payload-input');
        if (jsonInput !== document.activeElement) {
            jsonInput.value = JSON.stringify(data, null, 2);
        }
    setStatusById('session-status', 'Decoded successfully', 'success');
    setStatusById('secret-status', 'Secret accepted', 'success');
    } catch (e) {
        // Invalid signature - show error in JSON input
        const jsonInput = document.getElementById('payload-input');
        if (jsonInput !== document.activeElement) {
            jsonInput.value = `// Error: ${e.message}`;
        }
        // Show error statuses
        if (e.message && e.message.toLowerCase().includes('signature')) {
            setStatusById('session-status', 'Invalid signature', true);
            setStatusById('secret-status', 'Wrong secret key', true);
        } else {
            setStatusById('session-status', `Failed to decode: ${e.message}`, true);
        }
    }
}