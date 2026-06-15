"use client";

import { useState } from "react";

export function AdminPanel() {
  const [login, setLogin] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(endpoint: "/api/admin/seed" | "/api/admin/refresh") {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, pin })
      });
      const json = (await response.json()) as {
        error?: string;
        imported?: number;
        matchesSynced?: number;
        leaderboardUsers?: number;
      };

      if (!response.ok) {
        setMessage(json.error ?? "Operacja nie powiodła się.");
        return;
      }

      if (endpoint === "/api/admin/seed") {
        setMessage(`Zaimportowano ${json.imported ?? 0} meczów fazy grupowej.`);
      } else {
        setMessage(
          `Zsynchronizowano ${json.matchesSynced ?? 0} meczów i przeliczono tabelę dla ${json.leaderboardUsers ?? 0} graczy.`
        );
      }
    } catch {
      setMessage("Błąd połączenia z serwerem.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-wrap">
      <div className="admin-card">
        <div className="badge">Admin • football-data.org → Firebase</div>
        <h1>Panel administracyjny</h1>
        <p className="muted">
          Najpierw importujesz fazę grupową, potem odświeżasz wyniki. Przy odświeżeniu tabela punktowa liczy się od nowa
          na podstawie dokładnie trafionych wyników.
        </p>

        <div className="auth-form">
          <label>
            Login admina
            <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="admin" />
          </label>
          <label>
            PIN admina
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              type="password"
              placeholder="1234"
            />
          </label>
        </div>

        <div className="admin-actions">
          <button className="secondary-btn" disabled={loading} onClick={() => void run("/api/admin/seed")} type="button">
            Importuj fazę grupową z API
          </button>
          <button className="primary-btn" disabled={loading} onClick={() => void run("/api/admin/refresh")} type="button">
            Odśwież wyniki i przelicz tabelę
          </button>
        </div>

        {message ? <div className="message">{message}</div> : null}
        <a className="ghost-link" href="/">
          ← Wróć do aplikacji
        </a>
      </div>
    </div>
  );
}
