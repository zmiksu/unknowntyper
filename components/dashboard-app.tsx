"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { LeaderboardEntry, MatchDoc, PickDoc, SessionPayload } from "@/lib/types";
import { getStatusLabel, isLocked } from "@/lib/scoring";

type ApiState = {
  user: SessionPayload | null;
  matches: MatchDoc[];
  leaderboard: LeaderboardEntry[];
  picks: Record<string, PickDoc>;
};

type Section = "leaderboard" | "betting";
type AuthMode = "login" | "register";

export function DashboardApp() {
  const [booting, setBooting] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [login, setLogin] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [section, setSection] = useState<Section>("leaderboard");
  const [state, setState] = useState<ApiState>({
    user: null,
    matches: [],
    leaderboard: [],
    picks: {}
  });

  const groups = useMemo(
    () => [...new Set(state.matches.map((match) => match.groupLabel))].sort((a, b) => a.localeCompare(b)),
    [state.matches]
  );
  const [activeGroup, setActiveGroup] = useState<string>("A");

  useEffect(() => {
    void boot();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void boot();
    }, 60000);

    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!groups.length) return;
    if (!groups.includes(activeGroup)) {
      setActiveGroup(groups[0]);
    }
  }, [groups, activeGroup]);

  async function boot() {
    setMessage(null);
    try {
      const [meRes, matchesRes, leaderboardRes] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/matches", { cache: "no-store" }),
        fetch("/api/leaderboard", { cache: "no-store" })
      ]);

      const meJson = (await meRes.json()) as { user: SessionPayload | null; picks: Record<string, PickDoc> };
      const matchesJson = (await matchesRes.json()) as { matches: MatchDoc[] };
      const leaderboardJson = (await leaderboardRes.json()) as { leaderboard: LeaderboardEntry[] };

      setState({
        user: meJson.user,
        picks: meJson.picks ?? {},
        matches: matchesJson.matches ?? [],
        leaderboard: leaderboardJson.leaderboard ?? []
      });
    } catch {
      setMessage("Nie udało się pobrać danych. Odśwież stronę.");
    } finally {
      setBooting(false);
    }
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, pin })
      });

      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(json.error ?? "Operacja nie powiodła się.");
        return;
      }

      setLogin("");
      setPin("");
      setSection("betting");
      await boot();
    } catch {
      setMessage("Błąd połączenia z serwerem.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setState((current) => ({ ...current, user: null, picks: {} }));
    setSection("leaderboard");
  }

  function setPick(matchId: string, side: "homeScore" | "awayScore", value: string) {
    const numeric = value.replace(/[^0-9]/g, "");
    setState((current) => {
      const existing = current.picks[matchId];
      const updated: PickDoc = {
        userId: current.user?.userId ?? "",
        login: current.user?.login ?? "",
        matchId,
        homeScore: existing?.homeScore ?? 0,
        awayScore: existing?.awayScore ?? 0,
        updatedAt: new Date().toISOString()
      };

      if (numeric === "") {
        if (!existing) {
          return current;
        }
        if (side === "homeScore") updated.homeScore = Number.NaN;
        if (side === "awayScore") updated.awayScore = Number.NaN;
      } else {
        updated[side] = Number(numeric);
      }

      return {
        ...current,
        picks: {
          ...current.picks,
          [matchId]: updated
        }
      };
    });
  }

  async function savePredictions() {
    setMessage(null);
    setSaving(true);

    const payload = state.matches
      .filter((match) => !isLocked(match))
      .map((match) => {
        const pick = state.picks[match.matchId];
        return {
          matchId: match.matchId,
          homeScore: Number.isInteger(pick?.homeScore) ? pick.homeScore : null,
          awayScore: Number.isInteger(pick?.awayScore) ? pick.awayScore : null
        };
      });

    if (!payload.length) {
      setMessage("Nie masz żadnych meczów do zapisu.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/picks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks: payload })
      });
      const json = (await response.json()) as { error?: string; saved?: number };
      if (!response.ok) {
        setMessage(json.error ?? "Nie udało się zapisać typów.");
        return;
      }
      setMessage(`Zapisano ${json.saved ?? payload.length} typów.`);
      await boot();
    } catch {
      setMessage("Wystąpił błąd podczas zapisywania.");
    } finally {
      setSaving(false);
    }
  }

  const myPosition = useMemo(() => {
    if (!state.user) return null;
    const index = state.leaderboard.findIndex((entry) => entry.userId === state.user?.userId);
    return index === -1 ? null : index + 1;
  }, [state.leaderboard, state.user]);

  const matchesForGroup = useMemo(
    () => state.matches.filter((match) => match.groupLabel === activeGroup),
    [activeGroup, state.matches]
  );

  if (booting) {
    return <div className="center-card">Ładowanie aplikacji…</div>;
  }

  if (!state.user) {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="badge">Discord Typer • Mundial 2026</div>
          <h1>Obstawiaj wyniki z ekipą</h1>
          <p className="muted">
            Login + PIN, tabela graczy, blokada edycji po starcie meczu i wyniki liczone po odświeżeniu admina.
          </p>
          <div className="mode-switch">
            <button
              className={authMode === "login" ? "mode-btn active" : "mode-btn"}
              onClick={() => setAuthMode("login")}
              type="button"
            >
              Logowanie
            </button>
            <button
              className={authMode === "register" ? "mode-btn active" : "mode-btn"}
              onClick={() => setAuthMode("register")}
              type="button"
            >
              Rejestracja
            </button>
          </div>
          <form className="auth-form" onSubmit={handleAuth}>
            <label>
              Login
              <input value={login} onChange={(e) => setLogin(e.target.value)} placeholder="np. czatowski" />
            </label>
            <label>
              PIN
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                placeholder="4–8 cyfr"
                maxLength={8}
                type="password"
              />
            </label>
            <button className="primary-btn" disabled={saving} type="submit">
              {saving ? "Chwila…" : authMode === "login" ? "Wejdź do gry" : "Załóż konto"}
            </button>
          </form>
          {message ? <p className="message error">{message}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="badge">Mundial 2026</div>
          <h2 style={{ marginTop: 12, marginBottom: 6 }}>Cześć, {state.user.login}</h2>
          <p className="muted small">
            {myPosition ? `Twoja pozycja: #${myPosition}` : "Jeszcze nie masz miejsca w tabeli."}
          </p>
        </div>

        <nav className="sidebar-nav">
          <button
            className={section === "leaderboard" ? "nav-btn active" : "nav-btn"}
            onClick={() => setSection("leaderboard")}
            type="button"
          >
            🏆 Tabela wyników
          </button>
          <button
            className={section === "betting" ? "nav-btn active" : "nav-btn"}
            onClick={() => setSection("betting")}
            type="button"
          >
            ✍️ Typowanie
          </button>
        </nav>

        <div className="sidebar-footer">
          <a className="ghost-link" href="/admin">
            Panel admina
          </a>
          <button className="ghost-btn" onClick={handleLogout} type="button">
            Wyloguj
          </button>
        </div>
      </aside>

      <main className="content-panel">
        {message ? <div className="message">{message}</div> : null}

        {section === "leaderboard" ? (
          <section>
            <div className="section-header">
              <div>
                <div className="section-kicker">Klasyfikacja</div>
                <h1>Tabela obstawiających</h1>
              </div>
              <button className="secondary-btn" onClick={() => void boot()} type="button">
                Odśwież
              </button>
            </div>

            <div className="leaderboard-card">
              <div className="leaderboard-row leaderboard-head">
                <span>#</span>
                <span>Gracz</span>
                <span>Punkty</span>
              </div>
              {state.leaderboard.length ? (
                state.leaderboard.map((entry, index) => (
                  <div className="leaderboard-row" key={entry.userId}>
                    <span>{index + 1}</span>
                    <span>
                      {entry.login}
                      {entry.userId === state.user?.userId ? <strong className="self-pill">Ty</strong> : null}
                    </span>
                    <span>{entry.points}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">Brak wyników. Admin musi najpierw zsynchronizować mecze i tabelę.</div>
              )}
            </div>
          </section>
        ) : (
          <section>
            <div className="section-header">
              <div>
                <div className="section-kicker">Faza grupowa</div>
                <h1>Typuj dokładne wyniki</h1>
              </div>
              <button className="primary-btn" disabled={saving} onClick={() => void savePredictions()} type="button">
                {saving ? "Zapisywanie…" : "Zapisz typy"}
              </button>
            </div>

            {!state.matches.length ? (
              <div className="empty-state">
                Nie ma jeszcze meczów w bazie. Wejdź do panelu admina i zaimportuj fazę grupową.
              </div>
            ) : (
              <>
                <div className="group-tabs">
                  {groups.map((group) => (
                    <button
                      className={group === activeGroup ? "group-tab active" : "group-tab"}
                      key={group}
                      onClick={() => setActiveGroup(group)}
                      type="button"
                    >
                      Grupa {group}
                    </button>
                  ))}
                </div>

                <div className="matches-grid">
                  {matchesForGroup.map((match) => {
                    const locked = isLocked(match);
                    const pick = state.picks[match.matchId];

                    return (
                      <article className={locked ? "match-card locked" : "match-card"} key={match.matchId}>
                        <div className="match-topline">
                          <span>{formatDate(match.kickoffUtc)}</span>
                          <span className={`status-pill status-${match.status.toLowerCase()}`}>{getStatusLabel(match)}</span>
                        </div>

                        <div className="teams-row">
                          <TeamBadge code={match.homeTla} name={match.homeTeam} />
                          <div className="score-box">
                            {locked ? (
                              <div className="final-score">
                                <span>{match.scoreHome ?? pick?.homeScore ?? "-"}</span>
                                <span>:</span>
                                <span>{match.scoreAway ?? pick?.awayScore ?? "-"}</span>
                              </div>
                            ) : (
                              <>
                                <input
                                  className="score-input"
                                  inputMode="numeric"
                                  maxLength={2}
                                  onChange={(e) => setPick(match.matchId, "homeScore", e.target.value)}
                                  value={Number.isInteger(pick?.homeScore) ? pick?.homeScore : ""}
                                />
                                <span className="score-divider">:</span>
                                <input
                                  className="score-input"
                                  inputMode="numeric"
                                  maxLength={2}
                                  onChange={(e) => setPick(match.matchId, "awayScore", e.target.value)}
                                  value={Number.isInteger(pick?.awayScore) ? pick?.awayScore : ""}
                                />
                              </>
                            )}
                          </div>
                          <TeamBadge code={match.awayTla} name={match.awayTeam} align="right" />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

function TeamBadge({ code, name, align = "left" }: { code: string; name: string; align?: "left" | "right" }) {
  return (
    <div className={align === "right" ? "team-badge right" : "team-badge"}>
      <span className="team-code">{code}</span>
      <span className="team-name">{name}</span>
    </div>
  );
}

function formatDate(utc: string) {
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(utc));
}
