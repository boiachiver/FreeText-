import { Download, Smartphone, MonitorDown, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function AppDownload() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  useEffect(() => {
    const handler = (event: Event) => { event.preventDefault(); setDeferredPrompt(event); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstalled(true));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (deferredPrompt) { deferredPrompt.prompt(); await deferredPrompt.userChoice; setDeferredPrompt(null); return; }
    if (isIOS) alert("On iPhone: tap Share, then Add to Home Screen.");
    else alert("Use your browser menu and choose Install app or Add to Home screen.");
  };

  return <section className="download-page">
    <div className="download-hero"><div className="download-icon"><Smartphone size={30} /></div><span className="download-kicker">FREE TEXT EVERYWHERE</span><h1>Take FreeText with you.</h1><p>Install the same FreeText experience on your phone. Your account, messages, calls and community stay connected.</p><button onClick={install} className="download-primary"><Download size={19} /> {installed ? "FreeText installed" : "Install FreeText"}</button></div>
    <div className="download-options">
      <article><div><Smartphone size={22} /></div><h2>Android</h2><p>Install FreeText from the website as an app. No separate account is needed.</p><button onClick={install}>Install on Android</button></article>
      <article><div><Share2 size={22} /></div><h2>iPhone</h2><p>Open FreeText in Safari, tap Share, then choose <strong>Add to Home Screen</strong>.</p><button onClick={install}>Show iPhone steps</button></article>
      <article><div><MonitorDown size={22} /></div><h2>Web app</h2><p>Use FreeText directly from any modern browser with no download.</p><button onClick={() => window.location.assign("/">}>Open FreeText</button></article>
    </div>
    <p className="download-note">Native Google Play and Apple App Store packages can be published once the store developer accounts are connected. The website is prepared as an installable PWA now.</p>
  </section>;
}
