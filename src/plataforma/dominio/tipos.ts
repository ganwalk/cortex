/*
  Modelo da Plataforma Córtex.
  Escola: pessoas, vínculos, materiais, tarefas (com redação corrigida por competência), simulados, plantões,
  avisos, notas e atendimento.
  CRM: famílias, contatos, candidatos, oportunidades, tarefas e notas, no desenho do Relaticle
  (Company → Família, People → Contato, Opportunity → Oportunidade).
  Datas sempre em ISO 8601; dias em AAAA-MM-DD.
*/

export type Papel = "aluno" | "professor" | "responsavel" | "coordenacao" | "secretaria" | "comercial";
export type Portal = "aluno" | "professor" | "pais" | "gestao" | "crm";

/** O Córtex tem Ensino Médio (1ª a 3ª série) e pré-vestibular (Extensivo). */
export type Etapa = "medio" | "pre-vestibular";

export interface Usuario {
  id: string;
  nome: string;
  papeis: Papel[];
  email: string;
  /** Rótulo curto do cargo, mostrado no seletor de perfil. */
  cargo: string;
  ativo: boolean;
}

export interface Turma {
  id: string;
  nome: string;
  etapa: Etapa;
  anoLetivo: number;
  unidade: string;
}

export interface Disciplina {
  id: string;
  nome: string;
}

export interface VinculoAluno {
  alunoId: string;
  turmaId: string;
  desde: string;
  ate?: string;
}

export interface VinculoProfessor {
  professorId: string;
  turmaId: string;
  disciplinaId: string;
  desde: string;
  ate?: string;
}

/**
 * O acesso do responsável vem deste vínculo explícito, nunca do sobrenome.
 * Aluno maior de idade que responde pela própria matrícula tem um vínculo com ele mesmo
 * (parentesco "Próprio aluno") e o papel de responsável: vê avisos das famílias e abre solicitações.
 */
export interface VinculoResponsavel {
  responsavelId: string;
  alunoId: string;
  parentesco: string;
  ativo: boolean;
}

/* ---------- arquivos ---------- */

export type EstadoAnexo = "enviando" | "validando" | "pronto" | "falhou";

export interface Anexo {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  estado: EstadoAnexo;
  /** Motivo legível quando o estado é "falhou". */
  erro?: string;
  /** Chave do arquivo no armazenamento privado. Ausente nos exemplos da semente. */
  chave?: string;
  /** Texto de exemplo para anexos da semente, mostrado no leitor. */
  previa?: string;
}

/* ---------- materiais ---------- */

export type StatusMaterial = "rascunho" | "publicado" | "retirado";

export interface LinkMaterial {
  url: string;
  rotulo: string;
}

export interface RevisaoMaterial {
  versao: number;
  titulo: string;
  contexto: string;
  anexos: Anexo[];
  link?: LinkMaterial;
  autorId: string;
  em: string;
  nota?: string;
}

export interface Material {
  id: string;
  autorId: string;
  disciplinaId: string;
  turmaIds: string[];
  status: StatusMaterial;
  /** Revisão vigente; o rascunho de correção fica em `rascunho` até ser confirmado. */
  atual: RevisaoMaterial;
  rascunho?: RevisaoMaterial;
  historico: RevisaoMaterial[];
  criadoEm: string;
  publicadoEm?: string;
  retirada?: { por: string; em: string; motivo: string };
}

/* ---------- tarefas e entregas ---------- */

export interface Tarefa {
  id: string;
  professorId: string;
  disciplinaId: string;
  turmaIds: string[];
  titulo: string;
  instrucoes: string;
  prazo: string;
  /** Se a entrega pode ser trocada até o prazo. */
  permiteReenvio: boolean;
  /** Redação: o professor corrige pelas cinco competências do Enem, de 0 a 200 cada. */
  tipo?: "redacao";
  criadaEm: string;
}

export type StatusEntrega = "enviada" | "conferida" | "devolvida";

export interface Entrega {
  id: string;
  tarefaId: string;
  alunoId: string;
  anexos: Anexo[];
  /** Comprovante: só existe depois que o servidor persistiu a entrega. */
  protocolo: string;
  enviadaEm: string;
  tentativa: number;
  status: StatusEntrega;
  retorno?: { por: string; em: string; texto: string; competencias?: number[] };
}

/* ---------- simulados ---------- */

export type AreaSimulado = "linguagens" | "humanas" | "natureza" | "matematica";

export interface Simulado {
  id: string;
  nome: string;
  data: string;
  /** Formato da prova que o simulado reproduz. */
  modelo: "Enem" | "UEG";
  turmaIds: string[];
  /** Questões por área. No Enem são 45 em cada uma. */
  questoes: Record<AreaSimulado, number>;
  resultados: { alunoId: string; acertos: Record<AreaSimulado, number>; redacao?: number }[];
  origem: string;
  publicadoEm: string;
}

/* ---------- plantões ---------- */

export interface Plantao {
  id: string;
  professorId: string;
  disciplinaId: string;
  /** 0 = domingo … 6 = sábado. */
  diasSemana: number[];
  inicio: string;
  fim: string;
  local: string;
  series: string;
}

export type StatusFila = "aguardando" | "chamado" | "atendido" | "saiu";

export interface EntradaFila {
  id: string;
  plantaoId: string;
  data: string;
  autorId: string;
  /** Inclui o autor. Grupo de colegas entra junto, numa única posição. */
  alunoIds: string[];
  duvida?: string;
  entrouEm: string;
  status: StatusFila;
  atualizadoEm: string;
}

/* ---------- comunicação ---------- */

export type PublicoAviso = { tipo: "escola" } | { tipo: "turmas"; turmaIds: string[] };

export interface Aviso {
  id: string;
  autorId: string;
  titulo: string;
  corpo: string;
  categoria: "Pedagógico" | "Evento" | "Secretaria" | "Saúde" | "Financeiro";
  publico: PublicoAviso;
  paraAlunos: boolean;
  paraResponsaveis: boolean;
  exigeCiencia: boolean;
  publicadoEm: string;
  ciencias: { usuarioId: string; alunoId?: string; em: string }[];
}

export interface EventoAgenda {
  id: string;
  titulo: string;
  data: string;
  hora?: string;
  local: string;
  descricao: string;
  publico: PublicoAviso;
}

/* ---------- notas ---------- */

export interface Nota {
  alunoId: string;
  disciplinaId: string;
  periodo: string;
  valor: number;
  /** De onde veio o número: o portal mostra a origem e a data, nunca um zero por falha. */
  origem: string;
  atualizadoEm: string;
}

/* ---------- atendimento ---------- */

export type SetorAtendimento = "Secretaria" | "Coordenação" | "Financeiro" | "Professor";
export type StatusSolicitacao = "aberta" | "em-andamento" | "respondida" | "encerrada";

export interface Solicitacao {
  id: string;
  protocolo: string;
  autorId: string;
  alunoId: string;
  setor: SetorAtendimento;
  assunto: string;
  status: StatusSolicitacao;
  abertaEm: string;
  prazoResposta: string;
  responsavelId?: string;
  mensagens: { autorId: string; texto: string; em: string }[];
}

/* ---------- serviços externos ---------- */

export interface ServicoExterno {
  id: string;
  nome: string;
  descricao: string;
  url: string;
  publico: Papel[];
  ativo: boolean;
}

/* ---------- CRM ---------- */

export type EstagioFunil =
  | "novo"
  | "em-conversa"
  | "agendado"
  | "compareceu"
  | "proposta"
  | "matriculado"
  | "perdido";

export type OrigemLead = "Site" | "WhatsApp" | "Instagram" | "Indicação" | "Evento" | "Telefone" | "Rematrícula";

export interface Familia {
  id: string;
  nome: string;
  bairro: string;
  origem: OrigemLead;
  responsavelId: string;
  etiquetas: string[];
  criadaEm: string;
}

export interface Contato {
  id: string;
  familiaId: string;
  nome: string;
  relacao: string;
  telefone: string;
  email?: string;
  principal: boolean;
}

export interface Candidato {
  id: string;
  familiaId: string;
  nome: string;
  /** Pode faltar quando o contato veio pelo site. */
  anoNascimento?: number;
  etapa: Etapa;
  serieInteresse: string;
  escolaAtual?: string;
  /** Preenchido quando o candidato vira aluno. */
  alunoId?: string;
}

export interface Oportunidade {
  id: string;
  familiaId: string;
  candidatoIds: string[];
  tipo: "captacao" | "rematricula";
  estagio: EstagioFunil;
  ordem: number;
  responsavelId: string;
  anoLetivo: number;
  /** Mensalidade estimada, em reais, somando os candidatos, já com a bolsa quando houver. */
  valorMensal: number;
  visita?: { data: string; hora: string };
  /** Inscrição na Prova de Bolsas (1ª a 3ª série) e, depois da prova, o desconto conquistado. */
  prova?: { data: string; hora: string; bolsa?: number };
  motivoPerda?: string;
  criadaEm: string;
  atualizadaEm: string;
}

export interface TarefaCrm {
  id: string;
  titulo: string;
  prazo: string;
  responsavelId: string;
  familiaId?: string;
  oportunidadeId?: string;
  concluidaEm?: string;
}

export interface NotaCrm {
  id: string;
  familiaId: string;
  oportunidadeId?: string;
  autorId: string;
  texto: string;
  em: string;
}

/* ---------- auditoria ---------- */

export interface EventoAuditoria {
  id: string;
  atorId: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  em: string;
  /** Resumo curto. Nunca o conteúdo completo nem credenciais. */
  detalhe?: string;
}

/* ---------- banco ---------- */

export interface Banco {
  versao: number;
  usuarios: Usuario[];
  turmas: Turma[];
  disciplinas: Disciplina[];
  vinculosAluno: VinculoAluno[];
  vinculosProfessor: VinculoProfessor[];
  vinculosResponsavel: VinculoResponsavel[];
  materiais: Material[];
  tarefas: Tarefa[];
  entregas: Entrega[];
  simulados: Simulado[];
  plantoes: Plantao[];
  fila: EntradaFila[];
  avisos: Aviso[];
  agenda: EventoAgenda[];
  notas: Nota[];
  solicitacoes: Solicitacao[];
  servicos: ServicoExterno[];
  familias: Familia[];
  contatos: Contato[];
  candidatos: Candidato[];
  oportunidades: Oportunidade[];
  tarefasCrm: TarefaCrm[];
  notasCrm: NotaCrm[];
  auditoria: EventoAuditoria[];
}
