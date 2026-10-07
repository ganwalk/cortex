/*
  Regras de leitura e de permissão. Funções puras: recebem o banco e devolvem respostas.
  As mesmas funções valem no navegador (demonstração) e no servidor (produção), que revalida
  cada acesso. Esconder um botão não é controle de acesso.
*/
import type {
  AreaSimulado,
  Aviso,
  Banco,
  Entrega,
  EstagioFunil,
  Etapa,
  Material,
  Papel,
  Portal,
  SetorAtendimento,
  Tarefa,
  Usuario,
} from "./tipos";

/* ---------- portais ---------- */

export const PORTAIS: { id: Portal; rotulo: string; curto: string; papeis: Papel[] }[] = [
  { id: "aluno", rotulo: "Aluno", curto: "Aluno", papeis: ["aluno"] },
  { id: "professor", rotulo: "Professor", curto: "Professor", papeis: ["professor"] },
  { id: "pais", rotulo: "Responsável", curto: "Responsável", papeis: ["responsavel"] },
  { id: "gestao", rotulo: "Gestão", curto: "Gestão", papeis: ["coordenacao", "secretaria"] },
  { id: "crm", rotulo: "Captação", curto: "CRM", papeis: ["comercial", "secretaria"] },
];

export function portaisDe(u: Usuario | undefined): Portal[] {
  if (!u || !u.ativo) return [];
  return PORTAIS.filter((p) => p.papeis.some((r) => u.papeis.includes(r))).map((p) => p.id);
}

export function temPapel(u: Usuario | undefined, ...papeis: Papel[]): boolean {
  return !!u && u.ativo && papeis.some((p) => u.papeis.includes(p));
}

/* ---------- datas ---------- */

const pad = (n: number) => String(n).padStart(2, "0");

/** Dia local em AAAA-MM-DD. */
export function diaDe(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function somarDias(d: Date, dias: number): Date {
  const n = new Date(d);
  n.setDate(n.getDate() + dias);
  return n;
}

/** Soma dias úteis (segunda a sexta), sem feriados. */
export function somarDiasUteis(d: Date, dias: number): Date {
  const n = new Date(d);
  let falta = dias;
  while (falta > 0) {
    n.setDate(n.getDate() + 1);
    const s = n.getDay();
    if (s !== 0 && s !== 6) falta--;
  }
  return n;
}

const vigente = (v: { desde: string; ate?: string }, dia: string) => v.desde <= dia && (!v.ate || v.ate >= dia);

/* ---------- pessoas e vínculos ---------- */

export const usuario = (b: Banco, id: string | undefined) => b.usuarios.find((u) => u.id === id);
export const nomeDe = (b: Banco, id: string | undefined) => usuario(b, id)?.nome ?? "Pessoa removida";
export const turma = (b: Banco, id: string) => b.turmas.find((t) => t.id === id);
export const disciplina = (b: Banco, id: string) => b.disciplinas.find((d) => d.id === id);

export function turmasDoAluno(b: Banco, alunoId: string, dia: string): string[] {
  return b.vinculosAluno.filter((v) => v.alunoId === alunoId && vigente(v, dia)).map((v) => v.turmaId);
}

export function alunosDaTurma(b: Banco, turmaId: string, dia: string): string[] {
  return b.vinculosAluno.filter((v) => v.turmaId === turmaId && vigente(v, dia)).map((v) => v.alunoId);
}

export function aulasDoProfessor(b: Banco, professorId: string, dia: string) {
  return b.vinculosProfessor.filter((v) => v.professorId === professorId && vigente(v, dia));
}

export function podeEnsinar(b: Banco, professorId: string, turmaId: string, disciplinaId: string, dia: string) {
  return aulasDoProfessor(b, professorId, dia).some((v) => v.turmaId === turmaId && v.disciplinaId === disciplinaId);
}

/** Filhos com vínculo ativo de responsável. */
export function filhosDe(b: Banco, responsavelId: string): string[] {
  return b.vinculosResponsavel.filter((v) => v.responsavelId === responsavelId && v.ativo).map((v) => v.alunoId);
}

export function eResponsavelPor(b: Banco, responsavelId: string, alunoId: string) {
  return filhosDe(b, responsavelId).includes(alunoId);
}

export function responsaveisDe(b: Banco, alunoId: string) {
  return b.vinculosResponsavel.filter((v) => v.alunoId === alunoId && v.ativo);
}

/** Aluno maior de idade que responde pela própria matrícula. */
export function respondePorSi(b: Banco, alunoId: string) {
  return responsaveisDe(b, alunoId).some((v) => v.responsavelId === alunoId);
}

/* ---------- materiais ---------- */

export type MotivoBloqueio = "nao-encontrado" | "sem-permissao" | "retirado";
export type Acesso = { ok: true; material: Material } | { ok: false; motivo: MotivoBloqueio };

const cruza = (a: string[], b: string[]) => a.some((x) => b.includes(x));

/**
 * Pode abrir o material? Revalidado a cada acesso, inclusive por endereço direto.
 * Material retirado só é anunciado como "retirado" a quem teria acesso; aos demais, "sem permissão".
 */
export function acessoMaterial(b: Banco, u: Usuario | undefined, materialId: string, dia: string): Acesso {
  const m = b.materiais.find((x) => x.id === materialId);
  if (!m || !u || !u.ativo) return { ok: false, motivo: "nao-encontrado" };

  // a coordenação vê tudo, inclusive o registro do que foi retirado
  if (temPapel(u, "coordenacao")) return { ok: true, material: m };

  const autor = m.autorId === u.id;
  if (autor) return { ok: true, material: m };

  if (temPapel(u, "aluno")) {
    const minhas = turmasDoAluno(b, u.id, dia);
    if (!cruza(minhas, m.turmaIds)) return { ok: false, motivo: m.status === "rascunho" ? "nao-encontrado" : "sem-permissao" };
    if (m.status === "rascunho") return { ok: false, motivo: "nao-encontrado" };
    if (m.status === "retirado") return { ok: false, motivo: "retirado" };
    return { ok: true, material: m };
  }

  if (temPapel(u, "professor")) {
    // colegas da mesma turma veem o que foi publicado, sem editar
    const turmas = aulasDoProfessor(b, u.id, dia).map((v) => v.turmaId);
    if (m.status === "publicado" && cruza(turmas, m.turmaIds)) return { ok: true, material: m };
  }
  return { ok: false, motivo: m.status === "rascunho" ? "nao-encontrado" : "sem-permissao" };
}

export function materiaisDoAluno(b: Banco, alunoId: string, dia: string): Material[] {
  const minhas = turmasDoAluno(b, alunoId, dia);
  return b.materiais
    .filter((m) => m.status === "publicado" && cruza(minhas, m.turmaIds))
    .sort((x, y) => (y.publicadoEm ?? "").localeCompare(x.publicadoEm ?? ""));
}

/** Autor com vínculo vigente na disciplina e em pelo menos uma das turmas do material. */
export function podeEditarMaterial(b: Banco, u: Usuario | undefined, m: Material, dia: string): boolean {
  if (!u || m.autorId !== u.id || m.status === "retirado") return false;
  return m.turmaIds.some((t) => podeEnsinar(b, u.id, t, m.disciplinaId, dia)) || m.status === "rascunho";
}

export function podeRetirarMaterial(b: Banco, u: Usuario | undefined, m: Material, dia: string): boolean {
  if (!u || m.status !== "publicado") return false;
  return temPapel(u, "coordenacao") || podeEditarMaterial(b, u, m, dia);
}

/** Link de material: só http(s), com domínio. Bloqueia javascript:, data:, file: e afins. */
export function validarLink(url: string): { ok: true; url: string } | { ok: false; erro: string } {
  const bruto = url.trim();
  if (!bruto) return { ok: false, erro: "Cole o endereço do link." };
  let u: URL;
  try {
    u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(bruto) ? bruto : `https://${bruto}`);
  } catch {
    return { ok: false, erro: "Esse endereço não é válido. Confira se copiou o link inteiro." };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    return { ok: false, erro: "Use um link que comece com https://." };
  }
  if (!u.hostname.includes(".")) return { ok: false, erro: "Falta o domínio do site no endereço." };
  return { ok: true, url: u.toString() };
}

/* ---------- arquivos ---------- */

export const LIMITE_ARQUIVO = 25 * 1024 * 1024;
export const TIPOS_MATERIAL = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "audio/mpeg",
  "video/mp4",
];
export const TIPOS_ENTREGA = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];

const EXTENSOES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  pptx: TIPOS_MATERIAL[5],
  docx: TIPOS_MATERIAL[6],
  xlsx: TIPOS_MATERIAL[7],
  mp3: "audio/mpeg",
  mp4: "video/mp4",
};

/** Confere extensão, tipo declarado e tamanho. O servidor confere de novo o conteúdo. */
export function validarArquivo(
  nome: string,
  tipo: string,
  tamanho: number,
  aceitos: string[],
): { ok: true; tipo: string } | { ok: false; erro: string } {
  const ext = nome.split(".").pop()?.toLowerCase() ?? "";
  const pelaExtensao = EXTENSOES[ext];
  if (!pelaExtensao || !aceitos.includes(pelaExtensao)) {
    return { ok: false, erro: `Formato .${ext || "?"} não aceito aqui.` };
  }
  if (tipo && tipo !== pelaExtensao && !(tipo === "image/heif" && pelaExtensao === "image/heic")) {
    return { ok: false, erro: "A extensão não bate com o conteúdo do arquivo." };
  }
  if (tamanho === 0) return { ok: false, erro: "O arquivo está vazio." };
  if (tamanho > LIMITE_ARQUIVO) return { ok: false, erro: "O arquivo passa de 25 MB." };
  return { ok: true, tipo: pelaExtensao };
}

export function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

/* ---------- tarefas ---------- */

export type SituacaoTarefa = "pendente" | "atrasada" | "enviada" | "enviada-com-atraso" | "conferida" | "devolvida";

export function tarefasDoAluno(b: Banco, alunoId: string, dia: string): Tarefa[] {
  const minhas = turmasDoAluno(b, alunoId, dia);
  return b.tarefas.filter((t) => cruza(minhas, t.turmaIds)).sort((x, y) => x.prazo.localeCompare(y.prazo));
}

/** Última entrega do aluno para a tarefa. */
export function entregaDe(b: Banco, tarefaId: string, alunoId: string): Entrega | undefined {
  return b.entregas
    .filter((e) => e.tarefaId === tarefaId && e.alunoId === alunoId)
    .sort((x, y) => y.tentativa - x.tentativa)[0];
}

/* ---------- redação ---------- */

/** As cinco competências da redação do Enem. Cada uma vale de 0 a 200, em passos de 40. */
export const COMPETENCIAS = [
  { id: "C1", rotulo: "Norma padrão da língua escrita" },
  { id: "C2", rotulo: "Compreensão da proposta e repertório" },
  { id: "C3", rotulo: "Seleção e organização dos argumentos" },
  { id: "C4", rotulo: "Coesão do texto" },
  { id: "C5", rotulo: "Proposta de intervenção" },
] as const;

export const NIVEIS_COMPETENCIA = [0, 40, 80, 120, 160, 200];

export function validarCompetencias(c: number[] | undefined): string | null {
  if (!c || c.length !== COMPETENCIAS.length) return "Dê a nota de cada uma das cinco competências.";
  if (c.some((n) => !NIVEIS_COMPETENCIA.includes(n))) return "Cada competência vale 0, 40, 80, 120, 160 ou 200.";
  return null;
}

export const notaRedacao = (c: number[]) => c.reduce((s, n) => s + n, 0);

export function situacaoTarefa(t: Tarefa, e: Entrega | undefined, agora: Date): SituacaoTarefa {
  if (!e) return agora.toISOString() > t.prazo ? "atrasada" : "pendente";
  if (e.status === "conferida") return "conferida";
  if (e.status === "devolvida") return "devolvida";
  return e.enviadaEm > t.prazo ? "enviada-com-atraso" : "enviada";
}

/** Reenvio: até o prazo (se a tarefa permitir) ou quando o professor devolveu. */
export function podeReenviar(t: Tarefa, e: Entrega | undefined, agora: Date): boolean {
  if (!e) return true;
  if (e.status === "devolvida") return true;
  if (e.status === "conferida") return false;
  return t.permiteReenvio && agora.toISOString() <= t.prazo;
}

/* ---------- plantões ---------- */

export function plantoesDoDia(b: Banco, dia: string) {
  const semana = new Date(`${dia}T12:00:00`).getDay();
  return b.plantoes.filter((p) => p.diasSemana.includes(semana)).sort((x, y) => x.inicio.localeCompare(y.inicio));
}

/** Fila ativa (aguardando e chamado), na ordem de entrada. */
export function filaAtiva(b: Banco, plantaoId: string, dia: string) {
  return b.fila
    .filter((f) => f.plantaoId === plantaoId && f.data === dia && (f.status === "aguardando" || f.status === "chamado"))
    .sort((x, y) => (x.status === y.status ? x.entrouEm.localeCompare(y.entrouEm) : x.status === "chamado" ? -1 : 1));
}

export function entradaDoAluno(b: Banco, plantaoId: string, dia: string, alunoId: string) {
  return filaAtiva(b, plantaoId, dia).find((f) => f.alunoIds.includes(alunoId));
}

/** Posição contando só quem aguarda. 0 = está sendo chamado agora. */
export function posicaoNaFila(b: Banco, plantaoId: string, dia: string, alunoId: string): number | null {
  const fila = filaAtiva(b, plantaoId, dia);
  const minha = fila.find((f) => f.alunoIds.includes(alunoId));
  if (!minha) return null;
  if (minha.status === "chamado") return 0;
  return fila.filter((f) => f.status === "aguardando").indexOf(minha) + 1;
}

/* ---------- avisos ---------- */

function alcanca(b: Banco, a: Aviso | { publico: Aviso["publico"] }, alunoId: string, dia: string) {
  return a.publico.tipo === "escola" || cruza(turmasDoAluno(b, alunoId, dia), a.publico.turmaIds);
}

export function avisosDoAluno(b: Banco, alunoId: string, dia: string): Aviso[] {
  return b.avisos
    .filter((a) => a.paraAlunos && alcanca(b, a, alunoId, dia))
    .sort((x, y) => y.publicadoEm.localeCompare(x.publicadoEm));
}

/** Avisos para o responsável, com os filhos a que cada um se refere. */
export function avisosDoResponsavel(b: Banco, responsavelId: string, dia: string) {
  const filhos = filhosDe(b, responsavelId);
  return b.avisos
    .filter((a) => a.paraResponsaveis)
    .map((a) => ({ aviso: a, alunoIds: filhos.filter((f) => alcanca(b, a, f, dia)) }))
    .filter((x) => x.alunoIds.length > 0)
    .sort((x, y) => y.aviso.publicadoEm.localeCompare(x.aviso.publicadoEm));
}

export const deuCiencia = (a: Aviso, usuarioId: string) => a.ciencias.some((c) => c.usuarioId === usuarioId);

export function eventosDoAluno(b: Banco, alunoId: string, dia: string) {
  return b.agenda.filter((e) => e.data >= dia && alcanca(b, e, alunoId, dia)).sort((x, y) => x.data.localeCompare(y.data));
}

/** Leitura de um aviso que exige ciência: famílias alcançadas e quantas confirmaram. */
export function adesaoAviso(b: Banco, a: Aviso, dia: string) {
  const alunos = b.usuarios.filter((u) => temPapel(u, "aluno") && u.ativo && alcanca(b, a, u.id, dia)).map((u) => u.id);
  const responsaveis = new Set(alunos.flatMap((al) => responsaveisDe(b, al).map((v) => v.responsavelId)));
  const alvo = a.paraResponsaveis ? responsaveis.size : alunos.length;
  return { alvo, confirmados: a.ciencias.length };
}

/* ---------- simulados ---------- */

export const AREAS: { id: AreaSimulado; rotulo: string }[] = [
  { id: "linguagens", rotulo: "Linguagens" },
  { id: "humanas", rotulo: "Ciências Humanas" },
  { id: "natureza", rotulo: "Ciências da Natureza" },
  { id: "matematica", rotulo: "Matemática" },
];

export function simuladosDoAluno(b: Banco, alunoId: string) {
  return b.simulados
    .filter((s) => s.resultados.some((r) => r.alunoId === alunoId))
    .sort((x, y) => x.data.localeCompare(y.data))
    .map((s) => ({ simulado: s, resultado: s.resultados.find((r) => r.alunoId === alunoId)! }));
}

/** Acertos somados e o total de questões de um resultado. */
export function totalSimulado(s: { questoes: Record<AreaSimulado, number> }, acertos: Record<AreaSimulado, number>) {
  return {
    acertos: AREAS.reduce((t, a) => t + acertos[a.id], 0),
    questoes: AREAS.reduce((t, a) => t + s.questoes[a.id], 0),
  };
}

/** Média de acertos (em %) de cada área entre os alunos de uma turma que fizeram o simulado. */
export function mediaTurmaSimulado(b: Banco, simuladoId: string, turmaId: string, dia: string) {
  const s = b.simulados.find((x) => x.id === simuladoId);
  if (!s) return null;
  const alunos = alunosDaTurma(b, turmaId, dia);
  const rs = s.resultados.filter((r) => alunos.includes(r.alunoId));
  if (!rs.length) return null;
  const porArea = Object.fromEntries(
    AREAS.map((a) => [a.id, rs.reduce((t, r) => t + r.acertos[a.id], 0) / rs.length / s.questoes[a.id]]),
  ) as Record<AreaSimulado, number>;
  return { participantes: rs.length, porArea };
}

/* ---------- notas ---------- */

export const MEDIA_APROVACAO = 6;

export function notasDoAluno(b: Banco, alunoId: string) {
  const porDisciplina = new Map<string, { periodo: string; valor: number; origem: string; atualizadoEm: string }[]>();
  for (const n of b.notas.filter((x) => x.alunoId === alunoId)) {
    const lista = porDisciplina.get(n.disciplinaId) ?? [];
    lista.push(n);
    porDisciplina.set(n.disciplinaId, lista);
  }
  return [...porDisciplina.entries()]
    .map(([disciplinaId, notas]) => ({
      disciplinaId,
      notas: notas.sort((x, y) => x.periodo.localeCompare(y.periodo)),
      media: notas.reduce((s, n) => s + n.valor, 0) / notas.length,
    }))
    .sort((x, y) => (disciplina(b, x.disciplinaId)?.nome ?? "").localeCompare(disciplina(b, y.disciplinaId)?.nome ?? ""));
}

/* ---------- atendimento ---------- */

/** Prazo de primeira resposta, em dias úteis, por setor. A escola define os números. */
export const PRAZO_SETOR: Record<SetorAtendimento, number> = {
  Secretaria: 1,
  Coordenação: 2,
  Financeiro: 2,
  Professor: 3,
};

export function solicitacaoAtrasada(s: { status: string; prazoResposta: string }, agora: Date) {
  return (s.status === "aberta" || s.status === "em-andamento") && agora.toISOString() > s.prazoResposta;
}

/* ---------- CRM ---------- */

export const ESTAGIOS: { id: EstagioFunil; rotulo: string }[] = [
  { id: "novo", rotulo: "Novo contato" },
  { id: "em-conversa", rotulo: "Em conversa" },
  { id: "agendado", rotulo: "Visita ou prova marcada" },
  { id: "compareceu", rotulo: "Visitou ou fez a prova" },
  { id: "proposta", rotulo: "Proposta enviada" },
  { id: "matriculado", rotulo: "Matriculado" },
  { id: "perdido", rotulo: "Perdido" },
];

export const rotuloEstagio = (e: EstagioFunil) => ESTAGIOS.find((x) => x.id === e)?.rotulo ?? e;

export const ETAPAS: { id: Etapa; rotulo: string }[] = [
  { id: "medio", rotulo: "Ensino Médio" },
  { id: "pre-vestibular", rotulo: "Pré-vestibular" },
];

/** Séries que a captação oferece. A Prova de Bolsas vale para a 1ª, a 2ª e a 3ª série. */
export const SERIES: { id: string; rotulo: string; etapa: Etapa; provaDeBolsas: boolean }[] = [
  { id: "1a", rotulo: "1ª série", etapa: "medio", provaDeBolsas: true },
  { id: "2a", rotulo: "2ª série", etapa: "medio", provaDeBolsas: true },
  { id: "3a", rotulo: "3ª série", etapa: "medio", provaDeBolsas: true },
  { id: "extensivo", rotulo: "Extensivo", etapa: "pre-vestibular", provaDeBolsas: false },
];

/** Mensalidade de referência da demonstração. Valores fictícios: em produção vêm da tabela do colégio. */
export const MENSALIDADE_DEMO: Record<Etapa, number> = { medio: 2400, "pre-vestibular": 1100 };

export const comBolsa = (valor: number, bolsa?: number) => Math.round(valor * (1 - (bolsa ?? 0) / 100));

export const rotuloEtapa = (e: Etapa) => ETAPAS.find((x) => x.id === e)?.rotulo ?? e;

/** Funil em números: quantas oportunidades chegaram a cada estágio (perdidas contam até onde foram). */
export function resumoFunil(b: Banco, anoLetivo: number) {
  const ops = b.oportunidades.filter((o) => o.anoLetivo === anoLetivo && o.tipo === "captacao");
  const abertas = ops.filter((o) => o.estagio !== "matriculado" && o.estagio !== "perdido");
  const ganhas = ops.filter((o) => o.estagio === "matriculado");
  const perdidas = ops.filter((o) => o.estagio === "perdido");
  const fechadas = ganhas.length + perdidas.length;
  return {
    total: ops.length,
    abertas: abertas.length,
    ganhas: ganhas.length,
    perdidas: perdidas.length,
    conversao: fechadas ? ganhas.length / fechadas : null,
    receitaAberta: abertas.reduce((s, o) => s + o.valorMensal, 0),
    receitaGanha: ganhas.reduce((s, o) => s + o.valorMensal, 0),
  };
}

export const reais = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
