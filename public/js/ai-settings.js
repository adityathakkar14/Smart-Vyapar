/**
 * Smart Vyapar — AI Settings Modal Controller (Bootstrap 5)
 * Manages Gemini & Groq API key entry, storage, and the AI status badge.
 */
document.addEventListener('DOMContentLoaded', () => {

  const modalEl       = document.getElementById('aiSettingsModal');
  const btnSave       = document.getElementById('btn-save-ai-keys');
  const geminiInput   = document.getElementById('gemini-key-input');
  const groqInput     = document.getElementById('groq-key-input');
  const statusDiv     = document.getElementById('ai-keys-status');
  const badge         = document.getElementById('ai-status-badge');

  // Populate saved keys whenever modal is opened
  function loadKeys() {
    if (geminiInput) geminiInput.value = SmartVyaparAI.getGeminiKey();
    if (groqInput) groqInput.value = SmartVyaparAI.getGroqKey();
    updateStatus();
  }

  if (modalEl) {
    modalEl.addEventListener('show.bs.modal', loadKeys);
  }

  // Show / hide password toggle
  document.getElementById('toggle-gemini-key')?.addEventListener('click', () => {
    if (geminiInput) geminiInput.type = geminiInput.type === 'password' ? 'text' : 'password';
  });
  document.getElementById('toggle-groq-key')?.addEventListener('click', () => {
    if (groqInput) groqInput.type = groqInput.type === 'password' ? 'text' : 'password';
  });

  // Save keys
  btnSave?.addEventListener('click', () => {
    const gk = geminiInput ? geminiInput.value.trim() : '';
    const rk = groqInput ? groqInput.value.trim() : '';

    // If empty, save the default active key
    const activeKey = gk || 'AIzaSyCwgfkmhIaQmMcWueCqVHfImoXR4XgeA1I';
    SmartVyaparAI.saveGeminiKey(activeKey);
    if (rk) SmartVyaparAI.saveGroqKey(rk);

    updateBadge();
    showStatusMsg('✅ Active! Google Gemini AI is enabled.', 'success');

    // Blur focus and close modal after 1s
    setTimeout(() => {
      document.activeElement?.blur();
      if (modalEl && window.bootstrap) {
        const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
        modalInstance.hide();
      }
    }, 1000);
  });

  // Update badge in header
  function updateBadge() {
    if (!badge) return;
    const hasGemini = SmartVyaparAI.isGeminiConfigured();
    const hasGroq   = SmartVyaparAI.isGroqConfigured();

    if (hasGemini && hasGroq) {
      badge.className = 'badge rounded-pill bg-success';
      badge.innerHTML = '<i class="bi bi-stars"></i> AI: Dual Active';
      badge.title = '🟢 Dual AI Active (Groq Whisper + Gemini NLP)';
    } else if (hasGemini) {
      badge.className = 'badge rounded-pill bg-success';
      badge.innerHTML = '<i class="bi bi-stars"></i> AI: Gemini Active';
      badge.title = '🟢 Google Gemini AI Active';
    } else {
      badge.className = 'badge rounded-pill bg-danger';
      badge.innerHTML = '<i class="bi bi-stars"></i> AI: Offline';
      badge.title = '🔴 Offline mode. Tap to configure free AI keys.';
    }
  }

  function updateStatus() {
    const hasGemini = SmartVyaparAI.isGeminiConfigured();
    const hasGroq   = SmartVyaparAI.isGroqConfigured();
    if (hasGemini && hasGroq) {
      showStatusMsg('🟢 Both APIs active — Maximum 200% accuracy mode', 'success');
    } else if (hasGemini) {
      showStatusMsg('🟢 Google Gemini AI active & ready', 'success');
    } else if (hasGroq) {
      showStatusMsg('🟡 Groq Whisper active', 'info');
    } else {
      showStatusMsg('🟢 Using built-in cloud Gemini key', 'success');
    }
  }

  function showStatusMsg(msg, type) {
    if (!statusDiv) return;
    statusDiv.innerHTML = `<div class="alert alert-${type} py-1 px-2 small mb-0">${msg}</div>`;
  }

  // Initial badge update on page load
  loadKeys();
  updateBadge();
});
