import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./app-polish.css";
import "./polish-v2.css";
import "./signup-scroll.css";
import "./profile-download.css";

if (localStorage.getItem("freetext_dark_mode") === null) {
  localStorage.setItem("freetext_dark_mode", "true");
  document.documentElement.classList.add("dark");
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => { void navigator.serviceWorker.register("/sw.js").catch(() => undefined); });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
