// Keep installation support independent of the demo animation.
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('Realsync offline support could not be enabled:', error);
    });
  });
}
