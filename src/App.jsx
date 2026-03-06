import React, { useEffect, useState } from "react";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
};

export default function App() {
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    let mounted = true;

    async function bootLegacyApp() {
      const roomQuery = new URLSearchParams(window.location.search).get("room");
      window.__FIREBASE_CONFIG__ = firebaseConfig;
      window.__PARTY_ROOM_ID__ = roomQuery || "party-room-1";

      const res = await fetch("/legacy-markup.html", { cache: "no-store" });
      const html = await res.text();
      if (!mounted) return;
      setMarkup(html);

      // Wait one frame so the injected DOM exists before the legacy app boots.
      requestAnimationFrame(async () => {
        if (!mounted) return;
        if (window.__PARTY_LEGACY_BOOTED__) return;
        await import("../app.js");
        window.__PARTY_LEGACY_BOOTED__ = true;
      });
    }

    bootLegacyApp();
    return () => {
      mounted = false;
    };
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
