/**
 * Identidade do evento. Para trocar a igreja, defina NEXT_PUBLIC_CHURCH_NAME
 * no .env.local (ex.: NEXT_PUBLIC_CHURCH_NAME="Igreja Central do Brooklin").
 */
export const CHURCH_NAME =
  process.env.NEXT_PUBLIC_CHURCH_NAME ?? "Igreja Adventista do Brooklin";

export const EVENT_SUBTITLE =
  process.env.NEXT_PUBLIC_EVENT_SUBTITLE ?? "Escola Sabatina · Dons Espirituais";
