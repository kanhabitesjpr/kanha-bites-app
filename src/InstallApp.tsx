import { useEffect, useState } from "react";

type InstallChoiceEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function InstallApp() {
  const [installPrompt, setInstallPrompt] = useState<InstallChoiceEvent | null>(null);
  const [showIOS, setShowIOS] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setShowIOS(ios && !standalone);

    const handler = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallChoiceEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIOS(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installedHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  async function installApp() {
    if (!installPrompt || busy) return;
    setBusy(true);
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setInstallPrompt(null);
    } finally {
      setBusy(false);
    }
  }

  if (installed) return null;

  return (
    <section className="install-card" aria-label="Install KANHA BITES">
      <h2>📱 KANHA BITES ऐप अपने मोबाइल में रखें</h2>
      <p>तेज़ पहुँच के लिए इसे Home Screen पर जोड़ें। यह वेबसाइट से खुलने वाला इंस्टॉल योग्य ऐप है।</p>
      {installPrompt && (
        <button type="button" onClick={() => void installApp()} disabled={busy}>
          {busy ? "कृपया प्रतीक्षा करें…" : "📲 Install KANHA BITES"}
        </button>
      )}
      {showIOS && (
        <div className="install-help">
          <strong>iPhone / iPad:</strong> Safari में इस पेज को खोलें → Share आइकन दबाएँ → “Add to Home Screen” चुनें → Add दबाएँ।
        </div>
      )}
      {!installPrompt && !showIOS && (
        <p className="install-help">Android पर Chrome के मेन्यू (⋮) में “Install app” या “Add to Home screen” विकल्प देखें।</p>
      )}
    </section>
  );
}

