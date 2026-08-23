/**
 * Smart Vyapar — AI Settings Panel Controller
 * Manages Gemini & Groq API key entry, storage, and the AI status badge.
 */
document.addEventListener('DOMContentLoaded', () => {

  const overlay       = document.getElementById('ai-settings-overlay');
  const btnOpen       = document.getElementById('btn-ai-settings');
  const btnClose      = document.getElementById('btn-close-ai-settings');
  const btnSave       = document.getElementById('btn-save-ai-keys');
  const geminiInput   = document.getElementById('gemini-key-input');
  const groqInput     = document.getElementById('groq-key-input');
  const statusDiv     = document.getElementById('ai-keys-status');
  const badge         = document.getElementById('ai-status-badge');

  // Populate saved keys on open
  function loadKeys() {
    geminiInput.value = SmartVyaparAI.getGeminiKey();
    groqInput.value   = SmartVyaparAI.getGroqKey();
    updateStatus();
  }

  // Show / hide panel
  btnOpen?.addEventListener('click', () => {
    loadKeys();
    overlay.classList.remove('d-none');
    setTimeout(() => overlay.classList.add('active'), 10);
  });

  function closePanel() {
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('d-none'), 280);
  }
  btnClose?.addEventListener('click', closePanel);
  overlay?.addEventListener('click', (e) => { if (e.target === overlay) closePanel(); });

  // Show / hide password toggle
  document.getElementById('toggle-gemini-key')?.addEventListener('click', () => {
    geminiInput.type = geminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('toggle-groq-key')?.addEventListener('click', () => {
    groqInput.type = groqInput.type === 'password' ? 'text' : 'password';
  });

  // Save keys
  btnSave?.addEventListener('click', () => {
    const gk = geminiInput.value.trim();
    const rk = groqInput.value.trim();

    if (!gk && !rk) {
      showStatusMsg('⚠️ Please enter at least one API key.', 'warning');
      return;
    }
    if (gk && !gk.startsWith('AIza')) {
      showStatusMsg('❌ Gemini key should start with "AIza". Please check and re-paste.', 'danger');
      return;
    }
    if (rk && !rk.startsWith('gsk_')) {
      showStatusMsg('❌ Groq key should start with "gsk_". Please check and re-paste.', 'danger');
      return;
    }

    if (gk) SmartVyaparAI.saveGeminiKey(gk);
    if (rk) SmartVyaparAI.saveGroqKey(rk);

    updateBadge();
    showStatusMsg('✅ Keys saved! AI voice parsing is now active.', 'success');
    setTimeout(closePanel, 1500);
  });

  // Update badge in header
  function updateBadge() {
    if (!badge) return;
    const hasGemini = SmartVyaparAI.isGeminiConfigured();
    const hasGroq   = SmartVyaparAI.isGroqConfigured();
    badge.className = 'ai-badge';
    if (hasGemini && hasGroq) {
      badge.classList.add('ai-badge-full');
      badge.title = '🟢 Full AI — Groq Whisper + Gemini NLP active';
    } else if (hasGemini) {
      badge.classList.add('ai-badge-partial');
      badge.title = '🟡 Gemini NLP active. Add Groq key for better Gujarati ASR.';
    } else {
      badge.classList.add('ai-badge-off');
      badge.title = '🔴 No AI keys — using offline regex parser. Tap gear ⚙️ to add keys.';
    }
  }

  function updateStatus() {
    const hasGemini = SmartVyaparAI.isGeminiConfigured();
    const hasGroq   = SmartVyaparAI.isGroqConfigured();
    if (hasGemini && hasGroq) {
      showStatusMsg('🟢 Both APIs active — Maximum accuracy mode', 'success');
    } else if (hasGemini) {
      showStatusMsg('🟡 Gemini active, Groq not configured', 'warning');
    } else if (hasGroq) {
      showStatusMsg('🟡 Groq active, Gemini not configured', 'warning');
    } else {
      showStatusMsg('🔴 No AI keys saved. App works in offline mode.', 'secondary');
    }
  }

  function showStatusMsg(msg, type) {
    if (!statusDiv) return;
    statusDiv.innerHTML = `<div class="alert alert-${type} py-1 px-2 small mb-0">${msg}</div>`;
  }

  // Initial badge update on page load
  updateBadge();
});
