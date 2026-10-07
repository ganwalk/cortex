/*
  Ações que mudam o banco. Cada uma confere quem age, valida os dados, registra auditoria e
  devolve um banco novo (o original não é alterado). No servidor, cada ação vira uma rota
  transacional com a mesma assinatura.
*/
import {
  ESTAGIOS,
  MENSALIDADE_DEMO,
  PRAZO_SETOR,
  SERIES,
  comBolsa,
  diaDe,
  eResponsavelPor,
  entradaDoAluno,
  entregaDe,
  podeEditarMaterial,
  podeEnsinar,
  podeReenviar,
  podeRetirarMaterial,
  somarDiasUteis,
  rotuloEtapa,
  temPapel,
  turmasDoAluno,
  usuario,
  validarCompetencias,
  validarLink,
} from "./regras";
import type {
  Anexo,
  Aviso,
  Banco,
  Candidato,
  EstagioFunil,
  Etapa,
  LinkMaterial,
  Oportunidade,
  Material,
  OrigemLead,
  RevisaoMaterial,
  SetorAtendimento,
  Usuario,
} from "./tipos";

export type Resultado = { ok: true; banco: Banco; id?: string } | { ok: false; erro: string };

let contador = 0;
export function novoId(prefixo: string): string {
  const aleatorio =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefixo}-${aleatorio}${(contador++).toString(36)}`;
}

function protocolo(prefixo: string, agora: Date): string {
  const n = Math.floor(Math.random() * 1e6)
    .toString()
    .padStart(6, "0");
  return `${prefixo}-${diaDe(agora).replace(/-/g, "")}-${n}`;
}

function ator(b: Banco, atorId: string): Usuario | undefined {
  const u = usuario(b, atorId);
  return u?.ativo ? u : undefined;
}

function auditar(n: Banco, atorId: string, acao: string, entidade: string, entidadeId: string, agora: Date, detalhe?: string) {
  n.auditoria.unshift({ id: novoId("aud"), atorId, acao, entidade, entidadeId, em: agora.toISOString(), detalhe });
  if (n.auditoria.length > 500) n.auditoria.length = 500;
}

const falha = (erro: string): Resultado => ({ ok: false, erro });
const copia = (b: Banco): Banco => structuredClone(b);

/* ---------- materiais ---------- */

export interface DadosMaterial {
  titulo: string;
  contexto: string;
  disciplinaId: string;
  turmaIds: string[];
  anexos: Anexo[];
  link?: LinkMaterial;
}

function conferirMaterial(b: Banco, atorId: string, d: DadosMaterial, dia: string, publicar: boolean): string | null {
  if (!d.titulo.trim()) return "Dê um título que o aluno reconheça, como o tema da aula.";
  if (d.turmaIds.length === 0) return "Escolha pelo menos uma turma.";
  const fora = d.turmaIds.filter((t) => !podeEnsinar(b, atorId, t, d.disciplinaId, dia));
  if (fora.length) return "Você só pode publicar nas turmas em que dá essa disciplina.";
  if (!publicar) return null;
  if (d.anexos.some((a) => a.estado === "enviando" || a.estado === "validando")) {
    return "Espere o envio dos arquivos terminar.";
  }
  if (d.anexos.some((a) => a.estado === "falhou")) return "Remova ou reenvie o arquivo que falhou.";
  const temArquivo = d.anexos.some((a) => a.estado === "pronto");
  if (d.link) {
    const v = validarLink(d.link.url);
    if (!v.ok) return v.erro;
  }
  if (!temArquivo && !d.link) return "Anexe um arquivo ou cole um link.";
  return null;
}

function revisao(d: DadosMaterial, autorId: string, versao: number, agora: Date, nota?: string): RevisaoMaterial {
  const v = d.link ? validarLink(d.link.url) : null;
  return {
    versao,
    titulo: d.titulo.trim(),
    contexto: d.contexto.trim(),
    anexos: [...d.anexos],
    link: d.link ? { url: v?.ok ? v.url : d.link.url.trim(), rotulo: d.link.rotulo.trim() || "Abrir link" } : undefined,
    autorId,
    em: agora.toISOString(),
    nota,
  };
}

/** Cria um material em rascunho ou publica direto. `chave` evita duplicar se a rede cair e o professor tentar de novo. */
export function criarMaterial(b: Banco, atorId: string, d: DadosMaterial, publicar: boolean, agora: Date, chave?: string): Resultado {
  const u = ator(b, atorId);
  if (!temPapel(u, "professor")) return falha("Só professores publicam materiais.");
  if (chave) {
    const existente = b.materiais.find((m) => m.id === chave);
    if (existente) return { ok: true, banco: b, id: existente.id };
  }
  const erro = conferirMaterial(b, atorId, d, diaDe(agora), publicar);
  if (erro) return falha(erro);
  const n = copia(b);
  const id = chave ?? novoId("mat");
  const m: Material = {
    id,
    autorId: atorId,
    disciplinaId: d.disciplinaId,
    turmaIds: [...d.turmaIds],
    status: publicar ? "publicado" : "rascunho",
    atual: revisao(d, atorId, 1, agora),
    historico: [],
    criadoEm: agora.toISOString(),
    publicadoEm: publicar ? agora.toISOString() : undefined,
  };
  n.materiais.unshift(m);
  auditar(n, atorId, publicar ? "publicou material" : "salvou rascunho", "material", id, agora, m.atual.titulo);
  return { ok: true, banco: n, id };
}

/** Atualiza um rascunho que ainda não foi publicado. */
export function editarRascunho(b: Banco, atorId: string, materialId: string, d: DadosMaterial, publicar: boolean, agora: Date): Resultado {
  const m = b.materiais.find((x) => x.id === materialId);
  const u = ator(b, atorId);
  if (!m || m.status !== "rascunho") return falha("Rascunho não encontrado.");
  if (m.autorId !== u?.id) return falha("Só quem criou edita o rascunho.");
  const erro = conferirMaterial(b, atorId, d, diaDe(agora), publicar);
  if (erro) return falha(erro);
  const n = copia(b);
  const alvo = n.materiais.find((x) => x.id === materialId)!;
  alvo.disciplinaId = d.disciplinaId;
  alvo.turmaIds = [...d.turmaIds];
  alvo.atual = revisao(d, atorId, 1, agora);
  if (publicar) {
    alvo.status = "publicado";
    alvo.publicadoEm = agora.toISOString();
  }
  auditar(n, atorId, publicar ? "publicou material" : "atualizou rascunho", "material", materialId, agora, alvo.atual.titulo);
  return { ok: true, banco: n, id: materialId };
}

/**
 * Correção de material publicado: a nova revisão só substitui a vigente depois de confirmada.
 * Até lá o aluno continua vendo a versão anterior, sem arquivo sobrescrito em silêncio.
 */
export function corrigirMaterial(b: Banco, atorId: string, materialId: string, d: DadosMaterial, nota: string, agora: Date): Resultado {
  const m = b.materiais.find((x) => x.id === materialId);
  const u = ator(b, atorId);
  if (!m || m.status !== "publicado") return falha("Só materiais publicados podem ser corrigidos.");
  if (!podeEditarMaterial(b, u, m, diaDe(agora))) return falha("Você não pode corrigir este material.");
  if (!nota.trim()) return falha("Conte em uma frase o que mudou. O aluno vê essa nota.");
  const erro = conferirMaterial(b, atorId, d, diaDe(agora), true);
  if (erro) return falha(erro);
  const n = copia(b);
  const alvo = n.materiais.find((x) => x.id === materialId)!;
  alvo.historico.unshift(alvo.atual);
  alvo.atual = revisao(d, atorId, alvo.atual.versao + 1, agora, nota.trim());
  alvo.turmaIds = [...d.turmaIds];
  alvo.disciplinaId = d.disciplinaId;
  auditar(n, atorId, "corrigiu material", "material", materialId, agora, `versão ${alvo.atual.versao}`);
  return { ok: true, banco: n, id: materialId };
}

export function retirarMaterial(b: Banco, atorId: string, materialId: string, motivo: string, agora: Date): Resultado {
  const m = b.materiais.find((x) => x.id === materialId);
  const u = ator(b, atorId);
  if (!m) return falha("Material não encontrado.");
  if (!podeRetirarMaterial(b, u, m, diaDe(agora))) return falha("Você não pode retirar este material.");
  if (!motivo.trim()) return falha("Informe o motivo. Ele fica registrado e aparece para o aluno.");
  const n = copia(b);
  const alvo = n.materiais.find((x) => x.id === materialId)!;
  alvo.status = "retirado";
  alvo.retirada = { por: atorId, em: agora.toISOString(), motivo: motivo.trim() };
  auditar(n, atorId, "retirou material", "material", materialId, agora, motivo.trim().slice(0, 120));
  return { ok: true, banco: n };
}

export function excluirRascunho(b: Banco, atorId: string, materialId: string, agora: Date): Resultado {
  const m = b.materiais.find((x) => x.id === materialId);
  if (!m || m.status !== "rascunho" || m.autorId !== atorId) return falha("Rascunho não encontrado.");
  const n = copia(b);
  n.materiais = n.materiais.filter((x) => x.id !== materialId);
  auditar(n, atorId, "descartou rascunho", "material", materialId, agora);
  return { ok: true, banco: n };
}

/* ---------- tarefas ---------- */

export interface DadosTarefa {
  titulo: string;
  instrucoes: string;
  disciplinaId: string;
  turmaIds: string[];
  prazo: string;
  permiteReenvio: boolean;
  tipo?: "redacao";
}

export function criarTarefa(b: Banco, atorId: string, d: DadosTarefa, agora: Date): Resultado {
  if (!temPapel(ator(b, atorId), "professor")) return falha("Só professores criam tarefas.");
  if (!d.titulo.trim()) return falha("Dê um título à tarefa.");
  if (!d.turmaIds.length) return falha("Escolha pelo menos uma turma.");
  if (d.turmaIds.some((t) => !podeEnsinar(b, atorId, t, d.disciplinaId, diaDe(agora)))) {
    return falha("Você só pode passar tarefa nas turmas em que dá essa disciplina.");
  }
  if (!d.prazo || d.prazo <= agora.toISOString()) return falha("O prazo precisa estar no futuro.");
  const n = copia(b);
  const id = novoId("tar");
  n.tarefas.unshift({ id, professorId: atorId, ...d, titulo: d.titulo.trim(), instrucoes: d.instrucoes.trim(), criadaEm: agora.toISOString() });
  auditar(n, atorId, "criou tarefa", "tarefa", id, agora, d.titulo.trim());
  return { ok: true, banco: n, id };
}

/**
 * Entrega do aluno. Só vira "enviada" quando todos os anexos estão prontos e a entrega foi gravada;
 * o comprovante nasce aqui. A mesma `chave` devolve a mesma entrega (reenvio após queda de rede).
 */
export function enviarEntrega(b: Banco, atorId: string, tarefaId: string, anexos: Anexo[], agora: Date, chave: string): Resultado {
  const t = b.tarefas.find((x) => x.id === tarefaId);
  const u = ator(b, atorId);
  if (!t || !u) return falha("Tarefa não encontrada.");
  const repetida = b.entregas.find((e) => e.id === chave);
  if (repetida) return { ok: true, banco: b, id: repetida.id };
  if (!turmasDoAluno(b, atorId, diaDe(agora)).some((x) => t.turmaIds.includes(x))) return falha("Esta tarefa não é da sua turma.");
  if (!anexos.length) return falha("Adicione pelo menos uma foto ou PDF.");
  if (anexos.some((a) => a.estado !== "pronto")) return falha("Espere todas as fotos terminarem de carregar.");
  const anterior = entregaDe(b, tarefaId, atorId);
  if (!podeReenviar(t, anterior, agora)) {
    return falha(anterior?.status === "conferida" ? "O professor já conferiu esta entrega." : "O prazo para trocar a entrega acabou.");
  }
  const n = copia(b);
  n.entregas.push({
    id: chave,
    tarefaId,
    alunoId: atorId,
    anexos,
    protocolo: protocolo("ENT", agora),
    enviadaEm: agora.toISOString(),
    tentativa: (anterior?.tentativa ?? 0) + 1,
    status: "enviada",
  });
  auditar(n, atorId, anterior ? "reenviou tarefa" : "entregou tarefa", "entrega", chave, agora, `${anexos.length} arquivo(s)`);
  return { ok: true, banco: n, id: chave };
}

/** Confere ou devolve. Na redação, conferir exige a nota das cinco competências. */
export function avaliarEntrega(
  b: Banco,
  atorId: string,
  entregaId: string,
  status: "conferida" | "devolvida",
  texto: string,
  agora: Date,
  competencias?: number[],
): Resultado {
  const e = b.entregas.find((x) => x.id === entregaId);
  const t = e && b.tarefas.find((x) => x.id === e.tarefaId);
  if (!e || !t) return falha("Entrega não encontrada.");
  if (t.professorId !== atorId) return falha("Só o professor da tarefa confere as entregas.");
  if (status === "devolvida" && !texto.trim()) return falha("Diga ao aluno o que precisa ser refeito.");
  const redacao = t.tipo === "redacao" && status === "conferida";
  if (redacao) {
    const erro = validarCompetencias(competencias);
    if (erro) return falha(erro);
  }
  const n = copia(b);
  const alvo = n.entregas.find((x) => x.id === entregaId)!;
  alvo.status = status;
  alvo.retorno = { por: atorId, em: agora.toISOString(), texto: texto.trim(), competencias: redacao ? [...competencias!] : undefined };
  auditar(n, atorId, redacao ? "corrigiu redação" : status === "conferida" ? "conferiu entrega" : "devolveu entrega", "entrega", entregaId, agora);
  return { ok: true, banco: n };
}

/* ---------- plantões ---------- */

export function entrarNaFila(
  b: Banco,
  atorId: string,
  plantaoId: string,
  colegas: string[],
  duvida: string,
  agora: Date,
): Resultado {
  const dia = diaDe(agora);
  const p = b.plantoes.find((x) => x.id === plantaoId);
  if (!p) return falha("Plantão não encontrado.");
  if (!temPapel(ator(b, atorId), "aluno")) return falha("Só alunos entram na fila.");
  if (!p.diasSemana.includes(agora.getDay())) return falha("Este plantão não acontece hoje.");
  const grupo = [atorId, ...new Set(colegas.filter((c) => c !== atorId))];
  if (grupo.some((al) => !temPapel(usuario(b, al), "aluno"))) return falha("Só alunos podem entrar no grupo.");
  const ocupado = grupo.find((al) => entradaDoAluno(b, plantaoId, dia, al));
  if (ocupado) return falha(ocupado === atorId ? "Você já está nesta fila." : "Um dos colegas já está nesta fila.");
  const n = copia(b);
  const id = novoId("fila");
  n.fila.push({
    id,
    plantaoId,
    data: dia,
    autorId: atorId,
    alunoIds: grupo,
    duvida: duvida.trim() || undefined,
    entrouEm: agora.toISOString(),
    status: "aguardando",
    atualizadoEm: agora.toISOString(),
  });
  auditar(n, atorId, grupo.length > 1 ? "entrou na fila em grupo" : "entrou na fila", "plantao", plantaoId, agora);
  return { ok: true, banco: n, id };
}

export function sairDaFila(b: Banco, atorId: string, entradaId: string, agora: Date): Resultado {
  const e = b.fila.find((x) => x.id === entradaId);
  if (!e || !e.alunoIds.includes(atorId)) return falha("Entrada não encontrada.");
  if (e.status !== "aguardando" && e.status !== "chamado") return falha("Esta entrada já foi encerrada.");
  const n = copia(b);
  const alvo = n.fila.find((x) => x.id === entradaId)!;
  if (alvo.alunoIds.length > 1 && alvo.autorId !== atorId) {
    // sai só quem pediu; o grupo continua com a mesma posição
    alvo.alunoIds = alvo.alunoIds.filter((x) => x !== atorId);
  } else {
    alvo.status = "saiu";
  }
  alvo.atualizadoEm = agora.toISOString();
  auditar(n, atorId, "saiu da fila", "plantao", e.plantaoId, agora);
  return { ok: true, banco: n };
}

/** Professor chama o próximo. Quem estava em atendimento é marcado como atendido. */
export function chamarProximo(b: Banco, atorId: string, plantaoId: string, agora: Date): Resultado {
  const p = b.plantoes.find((x) => x.id === plantaoId);
  if (!p || p.professorId !== atorId) return falha("Este plantão não é seu.");
  const dia = diaDe(agora);
  const n = copia(b);
  const daFila = n.fila.filter((f) => f.plantaoId === plantaoId && f.data === dia);
  daFila.filter((f) => f.status === "chamado").forEach((f) => {
    f.status = "atendido";
    f.atualizadoEm = agora.toISOString();
  });
  const proximo = daFila.filter((f) => f.status === "aguardando").sort((x, y) => x.entrouEm.localeCompare(y.entrouEm))[0];
  if (proximo) {
    proximo.status = "chamado";
    proximo.atualizadoEm = agora.toISOString();
  }
  auditar(n, atorId, proximo ? "chamou próximo" : "encerrou atendimento", "plantao", plantaoId, agora);
  return { ok: true, banco: n, id: proximo?.id };
}

/* ---------- avisos ---------- */

export interface DadosAviso {
  titulo: string;
  corpo: string;
  categoria: Aviso["categoria"];
  publico: Aviso["publico"];
  paraAlunos: boolean;
  paraResponsaveis: boolean;
  exigeCiencia: boolean;
}

export function publicarAviso(b: Banco, atorId: string, d: DadosAviso, agora: Date): Resultado {
  const u = ator(b, atorId);
  if (!d.titulo.trim()) return falha("Todo aviso precisa de assunto.");
  if (!d.corpo.trim()) return falha("Escreva o texto do aviso.");
  if (!d.paraAlunos && !d.paraResponsaveis) return falha("Escolha quem recebe: alunos, famílias ou os dois.");
  if (d.publico.tipo === "escola") {
    if (!temPapel(u, "coordenacao", "secretaria")) return falha("Avisos para a escola toda saem pela coordenação ou secretaria.");
  } else {
    if (!d.publico.turmaIds.length) return falha("Escolha pelo menos uma turma.");
    const dia = diaDe(agora);
    const podeTodas = temPapel(u, "coordenacao", "secretaria");
    const minhas = b.vinculosProfessor.filter((v) => v.professorId === atorId && v.desde <= dia && (!v.ate || v.ate >= dia)).map((v) => v.turmaId);
    if (!podeTodas && d.publico.turmaIds.some((t) => !minhas.includes(t))) return falha("Você só envia avisos para as suas turmas.");
  }
  const n = copia(b);
  const id = novoId("avi");
  n.avisos.unshift({ id, autorId: atorId, ...d, titulo: d.titulo.trim(), corpo: d.corpo.trim(), publicadoEm: agora.toISOString(), ciencias: [] });
  auditar(n, atorId, "publicou aviso", "aviso", id, agora, d.titulo.trim());
  return { ok: true, banco: n, id };
}

export function darCiencia(b: Banco, atorId: string, avisoId: string, agora: Date): Resultado {
  const a = b.avisos.find((x) => x.id === avisoId);
  if (!a) return falha("Aviso não encontrado.");
  if (a.ciencias.some((c) => c.usuarioId === atorId)) return { ok: true, banco: b };
  const n = copia(b);
  n.avisos.find((x) => x.id === avisoId)!.ciencias.push({ usuarioId: atorId, em: agora.toISOString() });
  auditar(n, atorId, "deu ciência", "aviso", avisoId, agora);
  return { ok: true, banco: n };
}

/* ---------- atendimento ---------- */

export function abrirSolicitacao(
  b: Banco,
  atorId: string,
  d: { alunoId: string; setor: SetorAtendimento; assunto: string; texto: string },
  agora: Date,
): Resultado {
  if (!eResponsavelPor(b, atorId, d.alunoId)) return falha("Você só abre solicitações sobre os alunos vinculados à sua conta.");
  if (!d.assunto.trim()) return falha("Escreva o assunto.");
  if (d.texto.trim().length < 10) return falha("Conte um pouco mais para a escola conseguir responder.");
  const n = copia(b);
  const id = novoId("sol");
  n.solicitacoes.unshift({
    id,
    protocolo: protocolo("ATD", agora),
    autorId: atorId,
    alunoId: d.alunoId,
    setor: d.setor,
    assunto: d.assunto.trim(),
    status: "aberta",
    abertaEm: agora.toISOString(),
    prazoResposta: somarDiasUteis(agora, PRAZO_SETOR[d.setor]).toISOString(),
    mensagens: [{ autorId: atorId, texto: d.texto.trim(), em: agora.toISOString() }],
  });
  auditar(n, atorId, "abriu solicitação", "solicitacao", id, agora, d.setor);
  return { ok: true, banco: n, id };
}

export function responderSolicitacao(b: Banco, atorId: string, id: string, texto: string, encerrar: boolean, agora: Date): Resultado {
  const s = b.solicitacoes.find((x) => x.id === id);
  const u = ator(b, atorId);
  if (!s) return falha("Solicitação não encontrada.");
  const equipe = temPapel(u, "coordenacao", "secretaria");
  const familia = s.autorId === atorId;
  if (!equipe && !familia) return falha("Você não participa desta solicitação.");
  if (s.status === "encerrada") return falha("Esta solicitação já foi encerrada.");
  if (!texto.trim() && !encerrar) return falha("Escreva a mensagem.");
  const n = copia(b);
  const alvo = n.solicitacoes.find((x) => x.id === id)!;
  if (texto.trim()) alvo.mensagens.push({ autorId: atorId, texto: texto.trim(), em: agora.toISOString() });
  if (equipe) {
    alvo.responsavelId ??= atorId;
    alvo.status = encerrar ? "encerrada" : "respondida";
  } else {
    alvo.status = encerrar ? "encerrada" : "aberta";
    if (!encerrar) alvo.prazoResposta = somarDiasUteis(agora, PRAZO_SETOR[alvo.setor]).toISOString();
  }
  auditar(n, atorId, encerrar ? "encerrou solicitação" : "respondeu solicitação", "solicitacao", id, agora);
  return { ok: true, banco: n };
}

/* ---------- gestão ---------- */

export function moverAluno(b: Banco, atorId: string, alunoId: string, turmaId: string | null, agora: Date): Resultado {
  if (!temPapel(ator(b, atorId), "coordenacao", "secretaria")) return falha("Só a coordenação e a secretaria mudam vínculos.");
  const dia = diaDe(agora);
  const ontem = diaDe(new Date(agora.getTime() - 864e5));
  const n = copia(b);
  n.vinculosAluno
    .filter((v) => v.alunoId === alunoId && (!v.ate || v.ate >= dia))
    .forEach((v) => (v.ate = ontem < v.desde ? v.desde : ontem));
  if (turmaId) n.vinculosAluno.push({ alunoId, turmaId, desde: dia });
  auditar(n, atorId, turmaId ? "mudou turma do aluno" : "encerrou vínculo do aluno", "usuario", alunoId, agora, turmaId ?? undefined);
  return { ok: true, banco: n };
}

export function alternarServico(b: Banco, atorId: string, servicoId: string, agora: Date): Resultado {
  if (!temPapel(ator(b, atorId), "coordenacao", "secretaria")) return falha("Sem permissão.");
  const n = copia(b);
  const s = n.servicos.find((x) => x.id === servicoId);
  if (!s) return falha("Serviço não encontrado.");
  s.ativo = !s.ativo;
  auditar(n, atorId, s.ativo ? "ativou serviço" : "desativou serviço", "servico", servicoId, agora, s.nome);
  return { ok: true, banco: n };
}

export function salvarServico(
  b: Banco,
  atorId: string,
  d: { id?: string; nome: string; descricao: string; url: string; publico: Usuario["papeis"] },
  agora: Date,
): Resultado {
  if (!temPapel(ator(b, atorId), "coordenacao", "secretaria")) return falha("Sem permissão.");
  if (!d.nome.trim()) return falha("Dê um nome ao serviço.");
  const v = validarLink(d.url);
  if (!v.ok) return falha(v.erro);
  if (!d.publico.length) return falha("Escolha quem vê o atalho.");
  const n = copia(b);
  const id = d.id ?? novoId("srv");
  const existente = n.servicos.find((x) => x.id === id);
  const dados = { id, nome: d.nome.trim(), descricao: d.descricao.trim(), url: v.url, publico: d.publico, ativo: existente?.ativo ?? true };
  if (existente) Object.assign(existente, dados);
  else n.servicos.push(dados);
  auditar(n, atorId, existente ? "editou serviço" : "cadastrou serviço", "servico", id, agora, dados.nome);
  return { ok: true, banco: n, id };
}

/* ---------- CRM ---------- */

const podeCrm = (u: Usuario | undefined) => temPapel(u, "comercial", "secretaria");

export interface DadosLead {
  familia: string;
  bairro: string;
  origem: OrigemLead;
  contato: { nome: string; relacao: string; telefone: string; email?: string };
  candidatos: { nome: string; anoNascimento?: number; etapa: Etapa; serieInteresse: string; escolaAtual?: string }[];
  valorMensal: number;
  anoLetivo: number;
  nota?: string;
}

export function criarLead(b: Banco, atorId: string, d: DadosLead, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  if (!d.contato.nome.trim()) return falha("Informe o nome de quem entrou em contato.");
  if (d.contato.telefone.replace(/\D/g, "").length < 10) return falha("Informe um telefone com DDD.");
  if (!d.candidatos.length || d.candidatos.some((c) => !c.nome.trim())) return falha("Informe o nome de cada aluno.");
  const n = copia(b);
  const familiaId = novoId("fam");
  // aluno maior de idade que procura o colégio sozinho: o cadastro leva o nome dele
  const nome = d.familia.trim() || (d.contato.relacao === PROPRIO_ALUNO ? d.contato.nome.trim() : `Família ${d.contato.nome.trim().split(" ").slice(-1)[0]}`);
  n.familias.unshift({ id: familiaId, nome, bairro: d.bairro.trim(), origem: d.origem, responsavelId: atorId, etiquetas: [], criadaEm: agora.toISOString() });
  n.contatos.push({ id: novoId("con"), familiaId, ...d.contato, nome: d.contato.nome.trim(), principal: true });
  const candidatos: Candidato[] = d.candidatos.map((c) => ({
    id: novoId("can"),
    familiaId,
    ...c,
    nome: c.nome.trim(),
    serieInteresse: c.serieInteresse.trim() || rotuloEtapa(c.etapa),
  }));
  n.candidatos.push(...candidatos);
  const id = novoId("opo");
  const ordem = Math.min(0, ...n.oportunidades.filter((o) => o.estagio === "novo").map((o) => o.ordem)) - 1;
  n.oportunidades.push({
    id,
    familiaId,
    candidatoIds: candidatos.map((c) => c.id),
    tipo: "captacao",
    estagio: "novo",
    ordem,
    responsavelId: atorId,
    anoLetivo: d.anoLetivo,
    valorMensal: d.valorMensal,
    criadaEm: agora.toISOString(),
    atualizadaEm: agora.toISOString(),
  });
  if (d.nota?.trim()) n.notasCrm.unshift({ id: novoId("nota"), familiaId, oportunidadeId: id, autorId: atorId, texto: d.nota.trim(), em: agora.toISOString() });
  n.tarefasCrm.push({ id: novoId("tcrm"), titulo: `Retornar para ${d.contato.nome.trim().split(" ")[0]}`, prazo: somarDiasUteis(agora, 1).toISOString(), responsavelId: atorId, familiaId, oportunidadeId: id });
  auditar(n, atorId, "cadastrou lead", "oportunidade", id, agora, nome);
  return { ok: true, banco: n, id };
}

/** Relação do contato quando o próprio aluno, maior de idade, cuida da matrícula. */
export const PROPRIO_ALUNO = "Próprio aluno";

export interface PedidoSite {
  quem: "aluno" | "responsavel";
  nome: string;
  telefone: string;
  /** Nome do aluno, quando quem preenche é o responsável. */
  aluno: string;
  /** Id de SERIES. */
  serie: string;
  interesse: "visita" | "prova" | "informacoes";
  escolaAtual: string;
}

/**
 * Canal público: o formulário do site (visita, Prova de Bolsas ou informações) cria o contato no funil, já atribuído a quem cuida do relacionamento
 * e com tarefa de retorno para o dia útil seguinte. Quem preenche pode ser o aluno ou o responsável.
 */
export function pedirPeloSite(b: Banco, d: PedidoSite, agora: Date): Resultado {
  const comercial = b.usuarios.find((u) => u.ativo && u.papeis.includes("comercial") && !u.papeis.includes("coordenacao")) ?? b.usuarios.find((u) => u.ativo && u.papeis.includes("comercial"));
  if (!comercial) return falha("O atendimento pelo site está indisponível. Chame a secretaria no WhatsApp.");
  if (!d.nome.trim()) return falha("Diga seu nome para a secretaria saber com quem falar.");
  const serie = SERIES.find((x) => x.id === d.serie);
  if (!serie) return falha("Escolha a série.");
  if (d.interesse === "prova" && !serie.provaDeBolsas) return falha("A Prova de Bolsas vale para a 1ª, a 2ª e a 3ª série. Para o Extensivo, peça uma visita.");
  const primeiro = d.nome.trim().split(" ")[0];
  const aluno = d.quem === "aluno" ? d.nome : d.aluno.trim() || `Aluno (${primeiro})`;
  const prova = d.interesse === "prova";
  const NOTA = { visita: "Pediu visita pelo formulário do site.", prova: "Pediu inscrição na Prova de Bolsas pelo site.", informacoes: "Pediu informações sobre matrícula pelo site." };
  const r = criarLead(
    b,
    comercial.id,
    {
      familia: "",
      bairro: "",
      origem: "Site",
      contato: { nome: d.nome, relacao: d.quem === "aluno" ? PROPRIO_ALUNO : "Responsável", telefone: d.telefone },
      candidatos: [{ nome: aluno, etapa: serie.etapa, serieInteresse: serie.rotulo, escolaAtual: d.escolaAtual.trim() || undefined }],
      valorMensal: MENSALIDADE_DEMO[serie.etapa],
      anoLetivo: 2027,
      nota: NOTA[d.interesse],
    },
    agora,
  );
  if (r.ok) {
    const ACAO = { visita: "recebeu pedido de visita pelo site", prova: "recebeu inscrição na Prova de Bolsas pelo site", informacoes: "recebeu pedido de informações pelo site" };
    const ETIQUETA = { visita: "Pediu visita", prova: "Prova de Bolsas", informacoes: "Pediu informações" };
    r.banco.auditoria[0] = { ...r.banco.auditoria[0], acao: ACAO[d.interesse] };
    const f = r.banco.familias[0];
    f.etiquetas = [...f.etiquetas, ETIQUETA[d.interesse]];
    const t = r.banco.tarefasCrm.at(-1);
    if (t && prova) t.titulo = `Confirmar com ${primeiro} a data da Prova de Bolsas`;
  }
  return r;
}

export function moverOportunidade(
  b: Banco,
  atorId: string,
  id: string,
  estagio: EstagioFunil,
  agora: Date,
  extra: { motivoPerda?: string; antesDe?: string } = {},
): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  const o = b.oportunidades.find((x) => x.id === id);
  if (!o) return falha("Oportunidade não encontrada.");
  if (estagio === "perdido" && !extra.motivoPerda?.trim()) return falha("Registre o motivo da perda. É o dado que mais ensina sobre o funil.");
  if (estagio === "matriculado" && o.estagio !== "matriculado") return falha("Use “Matricular” para escolher a turma e criar os acessos.");
  if (estagio === "agendado" && !o.visita && !o.prova) return falha("Marque a data da prova ou da visita.");
  if (estagio === "compareceu" && o.prova && o.prova.bolsa === undefined && !o.visita) return falha("Registre o resultado da Prova de Bolsas.");
  const n = copia(b);
  const alvo = n.oportunidades.find((x) => x.id === id)!;
  const de = alvo.estagio;
  const coluna = n.oportunidades.filter((x) => x.estagio === estagio && x.id !== id).sort((x, y) => x.ordem - y.ordem);
  const idx = extra.antesDe ? coluna.findIndex((x) => x.id === extra.antesDe) : -1;
  coluna.splice(idx < 0 ? coluna.length : idx, 0, alvo);
  coluna.forEach((x, i) => (x.ordem = i));
  alvo.estagio = estagio;
  alvo.atualizadaEm = agora.toISOString();
  if (estagio === "perdido") alvo.motivoPerda = extra.motivoPerda!.trim();
  if (de !== estagio) {
    const rot = (e: EstagioFunil) => ESTAGIOS.find((x) => x.id === e)!.rotulo;
    n.notasCrm.unshift({ id: novoId("nota"), familiaId: alvo.familiaId, oportunidadeId: id, autorId: atorId, texto: `Moveu de “${rot(de)}” para “${rot(estagio)}”.${estagio === "perdido" ? ` Motivo: ${alvo.motivoPerda}` : ""}`, em: agora.toISOString() });
    auditar(n, atorId, "moveu oportunidade", "oportunidade", id, agora, `${de} → ${estagio}`);
  }
  return { ok: true, banco: n };
}

export function agendarVisita(b: Banco, atorId: string, id: string, visita: { data: string; hora: string }, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  if (!visita.data || !visita.hora) return falha("Escolha data e horário.");
  if (visita.data < diaDe(agora)) return falha("A data da visita já passou.");
  const o = b.oportunidades.find((x) => x.id === id);
  if (!o) return falha("Oportunidade não encontrada.");
  const n = copia(b);
  const alvo = n.oportunidades.find((x) => x.id === id)!;
  alvo.visita = visita;
  alvo.atualizadaEm = agora.toISOString();
  if (["novo", "em-conversa"].includes(alvo.estagio)) {
    alvo.estagio = "agendado";
    alvo.ordem = -1;
  }
  n.notasCrm.unshift({ id: novoId("nota"), familiaId: alvo.familiaId, oportunidadeId: id, autorId: atorId, texto: `Visita marcada para ${dataCurta(visita.data)}, ${visita.hora}.`, em: agora.toISOString() });
  n.tarefasCrm.push({ id: novoId("tcrm"), titulo: "Confirmar a visita na véspera", prazo: vespera(visita.data, agora), responsavelId: alvo.responsavelId, familiaId: alvo.familiaId, oportunidadeId: id });
  auditar(n, atorId, "agendou visita", "oportunidade", id, agora, visita.data);
  return { ok: true, banco: n };
}

const dataCurta = (dia: string) => dia.split("-").reverse().join("/");
const vespera = (dia: string, agora: Date) => {
  const v = new Date(`${dia}T09:00:00`).getTime() - 864e5;
  return new Date(Math.max(v, agora.getTime())).toISOString();
};

/** Mensalidade cheia dos candidatos da oportunidade, antes da bolsa. */
function mensalidadeCheia(b: Banco, o: Oportunidade) {
  return b.candidatos.filter((c) => o.candidatoIds.includes(c.id)).reduce((s, c) => s + MENSALIDADE_DEMO[c.etapa], 0);
}

/** Inscreve na Prova de Bolsas. Vale para quem vai cursar a 1ª, a 2ª ou a 3ª série. */
export function inscreverNaProva(b: Banco, atorId: string, id: string, prova: { data: string; hora: string }, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  if (!prova.data || !prova.hora) return falha("Escolha a data e o horário da prova.");
  if (prova.data < diaDe(agora)) return falha("A data da prova já passou.");
  const o = b.oportunidades.find((x) => x.id === id);
  if (!o) return falha("Oportunidade não encontrada.");
  if (b.candidatos.some((c) => o.candidatoIds.includes(c.id) && c.etapa !== "medio")) {
    return falha("A Prova de Bolsas vale para a 1ª, a 2ª e a 3ª série. Para o Extensivo, marque uma visita.");
  }
  const n = copia(b);
  const alvo = n.oportunidades.find((x) => x.id === id)!;
  alvo.prova = { data: prova.data, hora: prova.hora };
  alvo.atualizadaEm = agora.toISOString();
  if (["novo", "em-conversa"].includes(alvo.estagio)) {
    alvo.estagio = "agendado";
    alvo.ordem = -1;
  }
  n.notasCrm.unshift({ id: novoId("nota"), familiaId: alvo.familiaId, oportunidadeId: id, autorId: atorId, texto: `Inscrito na Prova de Bolsas de ${dataCurta(prova.data)}, ${prova.hora}.`, em: agora.toISOString() });
  n.tarefasCrm.push({ id: novoId("tcrm"), titulo: "Lembrar da Prova de Bolsas na véspera", prazo: vespera(prova.data, agora), responsavelId: alvo.responsavelId, familiaId: alvo.familiaId, oportunidadeId: id });
  auditar(n, atorId, "inscreveu na Prova de Bolsas", "oportunidade", id, agora, prova.data);
  return { ok: true, banco: n };
}

/** Lança o desconto conquistado na Prova de Bolsas (0 a 100%). A mensalidade estimada passa a contar a bolsa. */
export function registrarBolsa(b: Banco, atorId: string, id: string, bolsa: number, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  const o = b.oportunidades.find((x) => x.id === id);
  if (!o) return falha("Oportunidade não encontrada.");
  if (!o.prova) return falha("Inscreva na Prova de Bolsas antes de lançar o resultado.");
  if (!Number.isInteger(bolsa) || bolsa < 0 || bolsa > 100) return falha("A bolsa é um percentual inteiro de 0 a 100.");
  const n = copia(b);
  const alvo = n.oportunidades.find((x) => x.id === id)!;
  alvo.prova = { ...alvo.prova!, bolsa };
  alvo.valorMensal = comBolsa(mensalidadeCheia(n, alvo), bolsa);
  alvo.atualizadaEm = agora.toISOString();
  if (["novo", "em-conversa", "agendado"].includes(alvo.estagio)) {
    alvo.estagio = "compareceu";
    alvo.ordem = -1;
  }
  n.notasCrm.unshift({ id: novoId("nota"), familiaId: alvo.familiaId, oportunidadeId: id, autorId: atorId, texto: bolsa ? `Resultado da Prova de Bolsas: ${bolsa}% de desconto.` : "Fez a Prova de Bolsas e não conquistou desconto.", em: agora.toISOString() });
  n.tarefasCrm.push({ id: novoId("tcrm"), titulo: bolsa ? `Enviar a proposta com a bolsa de ${bolsa}%` : "Conversar sobre o resultado da prova", prazo: somarDiasUteis(agora, 1).toISOString(), responsavelId: alvo.responsavelId, familiaId: alvo.familiaId, oportunidadeId: id });
  auditar(n, atorId, "lançou resultado da Prova de Bolsas", "oportunidade", id, agora, `${bolsa}%`);
  return { ok: true, banco: n };
}

export function anotarCrm(b: Banco, atorId: string, familiaId: string, texto: string, agora: Date, oportunidadeId?: string): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  if (!texto.trim()) return falha("Escreva a nota.");
  const n = copia(b);
  n.notasCrm.unshift({ id: novoId("nota"), familiaId, oportunidadeId, autorId: atorId, texto: texto.trim(), em: agora.toISOString() });
  return { ok: true, banco: n };
}

export function criarTarefaCrm(b: Banco, atorId: string, d: { titulo: string; prazo: string; familiaId?: string; oportunidadeId?: string; responsavelId?: string }, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  if (!d.titulo.trim()) return falha("Escreva a tarefa.");
  if (!d.prazo) return falha("Escolha o prazo.");
  const n = copia(b);
  const id = novoId("tcrm");
  n.tarefasCrm.push({ id, titulo: d.titulo.trim(), prazo: d.prazo, responsavelId: d.responsavelId ?? atorId, familiaId: d.familiaId, oportunidadeId: d.oportunidadeId });
  auditar(n, atorId, "criou tarefa de captação", "tarefa-crm", id, agora);
  return { ok: true, banco: n, id };
}

export function concluirTarefaCrm(b: Banco, atorId: string, id: string, agora: Date): Resultado {
  if (!podeCrm(ator(b, atorId))) return falha("Sem acesso à captação.");
  const n = copia(b);
  const t = n.tarefasCrm.find((x) => x.id === id);
  if (!t) return falha("Tarefa não encontrada.");
  t.concluidaEm = t.concluidaEm ? undefined : agora.toISOString();
  return { ok: true, banco: n };
}

/**
 * Matrícula: fecha a oportunidade e cria, de uma vez, as contas do aluno e do responsável,
 * os vínculos de turma e de família. É a ponte entre a captação e a escola.
 */
export function matricular(
  b: Banco,
  atorId: string,
  oportunidadeId: string,
  turmas: Record<string, string>,
  agora: Date,
): Resultado {
  const u = ator(b, atorId);
  if (!temPapel(u, "secretaria")) return falha("A matrícula é feita pela secretaria.");
  const o = b.oportunidades.find((x) => x.id === oportunidadeId);
  if (!o) return falha("Oportunidade não encontrada.");
  if (o.estagio === "matriculado") return falha("Esta família já foi matriculada.");
  const candidatos = b.candidatos.filter((c) => o.candidatoIds.includes(c.id));
  if (candidatos.some((c) => !turmas[c.id] || !b.turmas.some((t) => t.id === turmas[c.id]))) return falha("Escolha a turma de cada aluno.");
  const contato = b.contatos.find((c) => c.familiaId === o.familiaId && c.principal);
  if (!contato) return falha("Cadastre o contato principal antes.");
  const proprio = contato.relacao === PROPRIO_ALUNO;
  if (proprio && candidatos.length !== 1) return falha("Quando o próprio aluno é o contato, o cadastro tem um aluno só.");
  const n = copia(b);
  const dia = diaDe(agora);
  const email = (nome: string) =>
    `${nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(" ")
      .filter(Boolean)
      .join(".")}@exemplo.cortex`;
  const t = (c: Candidato) => n.turmas.find((x) => x.id === turmas[c.id])!;

  // aluno maior de idade: uma conta só, que responde por ela mesma
  if (proprio) {
    const c = candidatos[0];
    const alunoId = novoId("usr");
    n.usuarios.push({ id: alunoId, nome: c.nome, papeis: ["aluno", "responsavel"], email: contato.email || email(c.nome), cargo: t(c).nome, ativo: true });
    n.vinculosAluno.push({ alunoId, turmaId: turmas[c.id], desde: dia });
    n.vinculosResponsavel.push({ responsavelId: alunoId, alunoId, parentesco: PROPRIO_ALUNO, ativo: true });
    n.candidatos.find((x) => x.id === c.id)!.alunoId = alunoId;
    fecharMatricula(n, o, atorId, agora, `Matrícula concluída. ${primeiroNomeDe(c.nome)} responde pela própria matrícula e recebeu um acesso só, de aluno e responsável.`);
    auditar(n, atorId, "matriculou aluno", "oportunidade", oportunidadeId, agora, "responde por si");
    return { ok: true, banco: n, id: alunoId };
  }

  const existente = n.usuarios.find((x) => x.email === (contato.email || email(contato.nome)));
  const respId = existente?.id ?? novoId("usr");
  if (existente) {
    if (!existente.papeis.includes("responsavel")) existente.papeis.push("responsavel");
  } else {
    n.usuarios.push({ id: respId, nome: contato.nome, papeis: ["responsavel"], email: contato.email || email(contato.nome), cargo: contato.relacao, ativo: true });
  }
  for (const c of candidatos) {
    const alunoId = novoId("usr");
    n.usuarios.push({ id: alunoId, nome: c.nome, papeis: ["aluno"], email: email(c.nome), cargo: t(c).nome, ativo: true });
    n.vinculosAluno.push({ alunoId, turmaId: turmas[c.id], desde: dia });
    n.vinculosResponsavel.push({ responsavelId: respId, alunoId, parentesco: contato.relacao, ativo: true });
    n.candidatos.find((x) => x.id === c.id)!.alunoId = alunoId;
  }
  fecharMatricula(n, o, atorId, agora, `Matrícula concluída. Acessos criados para ${candidatos.map((c) => primeiroNomeDe(c.nome)).join(" e ")} e para ${primeiroNomeDe(contato.nome)}.`);
  auditar(n, atorId, "matriculou família", "oportunidade", oportunidadeId, agora, `${candidatos.length} aluno(s)`);
  return { ok: true, banco: n, id: respId };
}

const primeiroNomeDe = (nome: string) => nome.trim().split(" ")[0];

function fecharMatricula(n: Banco, o: Oportunidade, atorId: string, agora: Date, texto: string) {
  const alvo = n.oportunidades.find((x) => x.id === o.id)!;
  alvo.estagio = "matriculado";
  alvo.ordem = -1;
  alvo.atualizadaEm = agora.toISOString();
  n.notasCrm.unshift({ id: novoId("nota"), familiaId: o.familiaId, oportunidadeId: o.id, autorId: atorId, texto, em: agora.toISOString() });
}
