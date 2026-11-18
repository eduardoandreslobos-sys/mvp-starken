const entero = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const compacto = new Intl.NumberFormat("es-CL", { notation: "compact", maximumFractionDigits: 1 });
const decimal1 = new Intl.NumberFormat("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const n = (v: number) => entero.format(v);
export const clp = (v: number) => `$${entero.format(Math.round(v))}`;
export const pct = (v: number) => `${decimal1.format(v)} %`;
export const d1 = (v: number) => decimal1.format(v);

/** $271,3 M / $12,9 mil — montos grandes legibles. */
export function clpCorto(v: number) {
  if (Math.abs(v) >= 1e9) return `$${decimal1.format(v / 1e9)} mil M`;
  if (Math.abs(v) >= 1e6) return `$${decimal1.format(v / 1e6)} M`;
  if (Math.abs(v) >= 1e4) return `$${entero.format(v / 1e3)} mil`;
  return clp(v);
}
export const nCorto = (v: number) => (Math.abs(v) >= 10_000 ? compacto.format(v) : entero.format(v));

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];
export function fechaCorta(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}
export function fechaLarga(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"][m - 1]} de ${y}`;
}
export const DIAS_CORTOS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
