"use client";

export interface StoredPlayer {
  playerId: string;
  name: string;
}

const key = (code: string) => `dons:player:${code.toUpperCase()}`;

export function loadPlayer(code: string): StoredPlayer | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(code));
    return raw ? (JSON.parse(raw) as StoredPlayer) : null;
  } catch {
    return null;
  }
}

export function savePlayer(code: string, player: StoredPlayer) {
  try {
    window.localStorage.setItem(key(code), JSON.stringify(player));
  } catch {
    /* modo privado / storage cheio: o jogo segue sem persistência */
  }
}

/**
 * Quando a entrada acontece pelo POST nativo do formulário, o servidor devolve
 * o jogador em cookie — aqui ele é promovido para o localStorage.
 */
export function playerFromCookie(code: string): StoredPlayer | null {
  if (typeof document === "undefined") return null;
  const name = `dons_p_${code.toUpperCase()}`;
  const hit = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`));
  if (!hit) return null;
  const playerId = decodeURIComponent(hit.slice(name.length + 1));
  return playerId ? { playerId, name: "" } : null;
}

export function lastName(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem("dons:lastName") ?? "";
  } catch {
    return "";
  }
}

export function rememberName(name: string) {
  try {
    window.localStorage.setItem("dons:lastName", name);
  } catch {
    /* ignora */
  }
}
