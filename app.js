function encode(data, secret, customTimestamp) {
    if (!data) {
        setStatusById('session-status', 'Payload is empty', true);
    }
    if (!secret) {
        setStatusById('secret-status', 'Secret key is empty', true);
    } else {
        setStatusById('secret-status', '', false);
    }

    let base64 = btoa(data);
    base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    let timestamp = customTimestamp || Math.floor(Date.now() / 1000);
    timestamp = String.fromCharCode((timestamp >> 24) & 0xFF) +
                String.fromCharCode((timestamp >> 16) & 0xFF) +
                String.fromCharCode((timestamp >> 8) & 0xFF) +
                String.fromCharCode(timestamp & 0xFF);
    let timestamp_base64 = btoa(timestamp);
    timestamp_base64 = timestamp_base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    base64 = `${base64}.${timestamp_base64}`;
    const signature = getSignature(base64, secret);
    setStatusById('session-status', 'Signature valid', false);
    
    return `${base64}.${signature}`;
}
    
function decode(token, secret) {
    const parts = token.split('.');
    
    const payload = parts.slice(0, 2).join('.');
    const signature = parts[2] || '';


    const expectedSigUrl = getSignature(payload, secret);
    
    if (expectedSigUrl !== signature) {
        setStatusById('session-status', 'Signature invalid', true);
    } else {
        setStatusById('session-status', 'Signature valid', false);
    }
    const timestamp = payload.split('.')[1];
    const payload_raw = payload.split('.')[0];
    let base64 = payload_raw.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
        base64 += '=';
    }
    
    const decoded = atob(base64);
    return decoded;
}

function getSignature(payload, secret) {
    const hmac_secret = CryptoJS.HmacSHA1("cookie-session", secret);
    const hmac = CryptoJS.HmacSHA1(payload, hmac_secret);
    const sig = CryptoJS.enc.Base64.stringify(hmac);
    const signature = sig.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return signature;
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
    encodePayload();
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.getElementById('theme-icon').textContent = 'D';
    }
    document.getElementById('timestamp-input').value = Math.floor(Date.now() / 1000);
    // Initialize status bars
    const sessionStatus = document.getElementById('session-status');
    const secretStatus = document.getElementById('secret-status');
    sessionStatus.textContent = 'Paste Flask Session Token';
    secretStatus.textContent = 'Enter secret key';
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
    if (isError === true) {
        el.classList.add('error');
        el.classList.remove('success');
    } else {
        el.classList.remove('error');
        el.classList.remove('success');
    }
}

// Encode Listeners
document.getElementById('payload-input').addEventListener('input', function() {
    encodePayload();
});

document.getElementById('secret-input').addEventListener('input', function() {
    encodePayload();
});

document.getElementById('timestamp-input').addEventListener('input', function() {
    encodePayload();
});

// Decode Listeners

document.getElementById('session-input').addEventListener('input', function() {
    decodeSession();
});

function encodePayload() {
    const payload = document.getElementById('payload-input').value.trim();
    const secret = document.getElementById('secret-input').value.trim();
    const timestampInput = document.getElementById('timestamp-input').value.trim();
    const customTimestamp = timestampInput ? parseInt(timestampInput) : null;
    document.getElementById('session-input').value = encode(payload, secret, customTimestamp);
}

function decodeSession() {
    const session = document.getElementById('session-input').value.trim();
    const secret = document.getElementById('secret-input').value.trim();
    document.getElementById('payload-input').value = decode(session, secret);
    
    // Extract timestamp from session and update timestamp input
    const parts = session.split('.');
    if (parts.length >= 2) {
        const timestampBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const timestampBytes = atob(timestampBase64);
        let timestamp = 0;
        for (let i = 0; i < 4; i++) {
            timestamp = (timestamp << 8) + timestampBytes.charCodeAt(i);
        }
        document.getElementById('timestamp-input').value = timestamp;
    }
}