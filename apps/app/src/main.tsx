import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { listenForInstallPrompt, registerServiceWorker } from "./modules/pwa";

listenForInstallPrompt();
registerServiceWorker();

createRoot(document.getElementById("root")!).render(<App />);
