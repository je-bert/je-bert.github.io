if ('serviceWorker' in navigator && window.isSecureContext && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
      console.warn('La présentation hors ligne n’est pas disponible.', error);
    });
  });
}
