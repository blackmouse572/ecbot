import { useSyncExternalStore } from "react";
import { isStandalone } from "./push-support";

// Chrome, Edge and Android fire this once, early in the page load; Safari
// never does (iOS installs from Share > Add to Home Screen).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Call once at startup, before React, so the early event is not missed. */
export function listenForInstallPrompt(): void {
  installed = isStandalone();
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    installed = true;
    emit();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Whether the browser offers its install dialog, and a way to open it. */
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, () => deferred !== null);
  const isInstalled = useSyncExternalStore(subscribe, () => installed);

  const install = async () => {
    if (!deferred) return;
    const prompt = deferred;
    await prompt.prompt();
    await prompt.userChoice;
    deferred = null;
    emit();
  };

  return { canInstall, isInstalled, install };
}
