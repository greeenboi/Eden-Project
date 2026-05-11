import { router } from "@/app/router";
import { audioPlayer } from "@/services/audio-player";
import { announceAppReady, setupTrayListeners } from "@/services/tauri-runtime";
import { useAuthStore } from "@/stores/auth-store";
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";

function App() {
  const { initialize, initialized } = useAuthStore();

  useEffect(() => {
    audioPlayer.bind();
    initialize().catch(() => undefined);

    let cleanup: () => void = () => undefined;
    setupTrayListeners()
      .then((fn: () => void) => {
        cleanup = fn;
      })
      .catch(() => undefined);

    return () => cleanup();
  }, [initialize]);

  useEffect(() => {
    if (!initialized) {
      return;
    }

    announceAppReady().catch(() => undefined);
  }, [initialized]);

  if (!initialized) {
    return <main className="eden-loading">Hydrating Eden session</main>;
  }

  return <RouterProvider router={router} />;
}

export default App;
