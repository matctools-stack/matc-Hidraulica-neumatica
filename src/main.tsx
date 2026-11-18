import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined' && 'serviceWorker' in navigator && !window.fluidDesktop?.isElectron) {
  if (import.meta.env.PROD) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    let activeRegistration: ServiceWorkerRegistration | undefined;
    const triggerSwUpdate = () => {
      if (navigator.onLine && activeRegistration) {
        void activeRegistration.update().catch(() => {});
      }
    };

    const updateSW = registerSW({
      immediate: true,
      onRegisteredSW(_swUrl, registration) {
        if (registration) {
          activeRegistration = registration;
          triggerSwUpdate();
          window.addEventListener('online', triggerSwUpdate);
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              triggerSwUpdate();
            }
          });
          window.setInterval(triggerSwUpdate, 5 * 60 * 1000);
        }
      },
      onNeedRefresh() {
        void updateSW(true);
      },
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        void registration.unregister();
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(<App />);
