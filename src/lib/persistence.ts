import fs from "node:fs";
import path from "node:path";

/**
 * Persistência de emergência: a partida vive na memória (é o que a torna
 * rápida), mas um snapshot em disco permite retomar exatamente de onde parou
 * se o processo reiniciar no meio da aula.
 *
 * Nunca deixa a persistência derrubar o jogo: toda falha é engolida.
 */

export const STATE_PATH =
  process.env.DONS_STATE_PATH ?? path.join(process.cwd(), ".dons-state.json");

export function readState<T>(): T | null {
  try {
    if (!fs.existsSync(STATE_PATH)) return null;
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

let pending: ReturnType<typeof setTimeout> | null = null;
let builder: (() => unknown) | null = null;

/**
 * Grava no máximo uma vez por segundo, de forma atômica. O estado só é
 * serializado na hora de gravar — chamar isto a cada resposta é barato.
 */
export function scheduleWrite(build: () => unknown) {
  builder = build;
  if (pending) return;
  pending = setTimeout(() => {
    pending = null;
    flush();
  }, 1000);
}

export function flush() {
  if (!builder) return;
  try {
    const tmp = `${STATE_PATH}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(builder()), "utf8");
    fs.renameSync(tmp, STATE_PATH);
  } catch {
    /* disco somente leitura ou volume ausente: seguimos só com a memória */
  }
}
