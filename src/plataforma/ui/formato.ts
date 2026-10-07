const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const SEMANA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const pad = (n: number) => String(n).padStart(2, "0");

export function data(isoOuDia: string): string {
  const d = isoOuDia.length === 10 ? new Date(`${isoOuDia}T12:00:00`) : new Date(isoOuDia);
  return `${d.getDate()} ${MESES[d.getMonth()]}`;
}

export function hora(iso: string): string {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dataHora(iso: string): string {
  return `${data(iso)}, ${hora(iso)}`;
}

export function diaDaSemana(isoOuDia: string): string {
  const d = isoOuDia.length === 10 ? new Date(`${isoOuDia}T12:00:00`) : new Date(isoOuDia);
  return SEMANA[d.getDay()];
}

export const nomeDia = (n: number) => SEMANA[n];

const inicioDoDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** "há 5 min", "ontem, 14:30", "3 out". */
export function quando(iso: string, agora: Date): string {
  const d = new Date(iso);
  const seg = (agora.getTime() - d.getTime()) / 1000;
  if (seg >= 0 && seg < 60) return "agora";
  if (seg >= 0 && seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  const dias = Math.round((inicioDoDia(agora) - inicioDoDia(d)) / 864e5);
  if (dias === 0) return `hoje, ${hora(iso)}`;
  if (dias === 1) return `ontem, ${hora(iso)}`;
  if (dias === -1) return `amanhã, ${hora(iso)}`;
  return data(iso);
}

/** Prazo legível: "vence hoje, 23:59", "vence amanhã", "venceu ontem", "vence sex, 9 out". */
export function prazo(iso: string, agora: Date): string {
  const dias = Math.round((inicioDoDia(new Date(iso)) - inicioDoDia(agora)) / 864e5);
  if (dias === 0) return new Date(iso) < agora ? `venceu hoje, ${hora(iso)}` : `vence hoje, ${hora(iso)}`;
  if (dias === 1) return `vence amanhã, ${hora(iso)}`;
  if (dias === -1) return "venceu ontem";
  if (dias < 0) return `venceu em ${data(iso)}`;
  if (dias < 7) return `vence ${diaDaSemana(iso).slice(0, 3)}, ${data(iso)}`;
  return `vence em ${data(iso)}`;
}

export function primeiroNome(nome: string) {
  return nome.split(" ")[0];
}

export function iniciais(nome: string) {
  const p = nome.split(" ").filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

export function plural(n: number, um: string, varios: string) {
  return `${n} ${n === 1 ? um : varios}`;
}

export function nota(v: number) {
  return v.toFixed(1).replace(".", ",");
}
