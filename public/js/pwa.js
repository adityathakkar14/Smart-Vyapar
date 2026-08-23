/**
 * Smart Vyapar PWA Support
 * Handles Service Worker registration, install prompts, and offline status.
 */

let deferredPrompt = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('sw.js')
      .then((registration) => {
        console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        // Self-signed certificate or local dev environments without valid SSL
        if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
          console.warn('[PWA] ServiceWorker dev notice: SSL certificate on localhost requires approval or http://.', error.message);
        } else {
          console.error('[PWA] ServiceWorker registration failed:', error);
        }
      });
  });
}

// Handle Install Prompt (Android, Chrome, Edge)
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67 and earlier from automatically showing the prompt
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  
  // Show in-app install buttons if present
  const installBtns = document.querySelectorAll('.btn-pwa-install');
  installBtns.forEach((btn) => {
    btn.classList.remove('d-none');
    btn.addEventListener('click', installPWA);
  });

  const installBanner = document.getElementById('pwa-install-banner');
  if (installBanner) {
    installBanner.classList.remove('d-none');
  }
});

async function installPWA() {
  if (!deferredPrompt) {
    return;
  }
  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user to respond to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response to install prompt: ${outcome}`);
  
  // Clear the deferredPrompt variable
  deferredPrompt = null;
  
  // Hide the install buttons
  const installBtns = document.querySelectorAll('.btn-pwa-install');
  installBtns.forEach((btn) => btn.classList.add('d-none'));

  const installBanner = document.getElementById('pwa-install-banner');
  if (installBanner) {
    installBanner.classList.add('d-none');
  }
}

// Listen for successful installation
window.addEventListener('appinstalled', () => {
  console.log('[PWA] Smart Vyapar was installed successfully!');
  deferredPrompt = null;
  
  const installBtns = document.querySelectorAll('.btn-pwa-install');
  installBtns.forEach((btn) => btn.classList.add('d-none'));

  const installBanner = document.getElementById('pwa-install-banner');
  if (installBanner) {
    installBanner.classList.add('d-none');
  }

  if (typeof showToast === 'function') {
    showToast('Smart Vyapar installed to Home Screen!', 'success');
  }
});

// Online / Offline Status indicators
window.addEventListener('online', () => {
  if (typeof showToast === 'function') {
    showToast('You are back online!', 'success');
  }
  const offlineBadge = document.getElementById('offline-indicator');
  if (offlineBadge) offlineBadge.classList.add('d-none');
});

window.addEventListener('offline', () => {
  if (typeof showToast === 'function') {
    showToast('You are offline. Cached data is still available.', 'warning');
  }
  const offlineBadge = document.getElementById('offline-indicator');
  if (offlineBadge) offlineBadge.classList.remove('d-none');
});
