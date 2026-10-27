import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./app-polish.css";
import "./polish-v2.css";
import "./signup-scroll.css";

// FreeText is designed dark-first on mobile. Respect an existing user choice,
// but make the first visit match the production mobile experience.
if (localStorage.getItem("freetext_dark_mode") === null) {
  localStorage.setItem("freetext_dark_mode", "true");
  document.documentElement.classList.add("dark");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
