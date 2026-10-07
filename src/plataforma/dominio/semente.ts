/*
  Dados fictícios da demonstração. Nenhuma pessoa aqui existe; nomes, notas, redações, simulados e conversas
  são inventados. As datas são relativas ao momento em que a semente é gerada, para que "hoje" sempre tenha
  plantões, tarefas com prazo próximo e avisos recentes.
*/
import { AREAS, MENSALIDADE_DEMO, comBolsa, diaDe, somarDias } from "./regras";
import type { AreaSimulado, Banco, Disciplina, Etapa, Nota, Simulado, Turma, Usuario } from "./tipos";

export const VERSAO_BANCO = 1;

const iso = (d: Date) => d.toISOString();
const em = (base: Date, dias: number, hora = 9, minuto = 0) => {
  const d = somarDias(base, dias);
  d.setHours(hora, minuto, 0, 0);
  return d;
};

/** Pseudoaleatório estável, para que as notas não mudem a cada carga. */
function sorteio(texto: string) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return ((h >>> 0) % 1000) / 1000;
}

const ANO = 2026;
const UNIDADE = "Rua T-53, Setor Bueno";

const turmas: Turma[] = [
  { id: "t-1a", nome: "1ª série A", etapa: "medio", anoLetivo: ANO, unidade: UNIDADE },
  { id: "t-2a", nome: "2ª série A", etapa: "medio", anoLetivo: ANO, unidade: UNIDADE },
  { id: "t-3a", nome: "3ª série A", etapa: "medio", anoLetivo: ANO, unidade: UNIDADE },
  { id: "t-3b", nome: "3ª série B", etapa: "medio", anoLetivo: ANO, unidade: UNIDADE },
  { id: "t-ext", nome: "Extensivo A", etapa: "pre-vestibular", anoLetivo: ANO, unidade: UNIDADE },
];

const disciplinas: Disciplina[] = [
  { id: "d-bio", nome: "Biologia" },
  { id: "d-fis", nome: "Física" },
  { id: "d-geo", nome: "Geografia" },
  { id: "d-his", nome: "História" },
  { id: "d-mat", nome: "Matemática" },
  { id: "d-qui", nome: "Química" },
  { id: "d-red", nome: "Redação" },
];

const pessoa = (id: string, nome: string, papeis: Usuario["papeis"], cargo: string): Usuario => ({
  id,
  nome,
  papeis,
  cargo,
  email: `${id.slice(2)}@exemplo.cortex`,
  ativo: true,
});

/* Personas principais (aparecem no seletor de perfil) */
const personas: Usuario[] = [
  pessoa("u-gustavo", "Gustavo Lemos", ["aluno"], "3ª série A"),
  pessoa("u-isabela", "Isabela Martins", ["aluno"], "1ª série A, bolsista"),
  pessoa("u-larissa", "Larissa Fontes", ["aluno", "responsavel"], "Extensivo A, responde pela própria matrícula"),
  pessoa("u-simone", "Simone Martins", ["responsavel"], "Mãe da Isabela"),
  pessoa("u-otavio", "Otávio Nunes", ["professor", "responsavel"], "Professor de História e pai do Gabriel"),
  pessoa("u-carolina", "Carolina Campos", ["professor"], "Professora de Redação"),
  pessoa("u-renata", "Renata Lima", ["professor"], "Professora de Biologia"),
  pessoa("u-wagner", "Wagner Prado", ["professor"], "Professor de Matemática"),
  pessoa("u-diego", "Diego Costa", ["professor"], "Professor de Física"),
  pessoa("u-adriana", "Adriana Alves", ["coordenacao"], "Coordenação pedagógica"),
  pessoa("u-tatiane", "Tatiane Reis", ["secretaria"], "Secretaria escolar"),
  pessoa("u-mirela", "Mirela Siqueira", ["coordenacao", "comercial"], "Direção"),
  pessoa("u-thiago", "Thiago Teixeira", ["comercial"], "Relacionamento e matrículas"),
];

/*
  Colegas de turma, para dar corpo às listas e aos números da gestão.
  No Extensivo, quem tem `true` é maior de idade e responde pela própria matrícula.
*/
const colegas: Record<string, [string, boolean?][]> = {
  "t-1a": [["Sofia Ribeiro"], ["Davi Mendes"], ["Helena Duarte"], ["Enzo Barbosa"], ["Lara Monteiro"]],
  "t-2a": [["Miguel Cardoso"], ["Valentina Gomes"], ["Heitor Almeida"], ["Ana Clara Souza"], ["Caio Fernandes"]],
  "t-3a": [["João Pedro Silva"], ["Mateus Oliveira"], ["Júlia Rezende"], ["Arthur Pires"]],
  "t-3b": [["Gabriel Nunes"], ["Manuela Prado"], ["Lorenzo Batista"], ["Yasmin Carvalho"]],
  "t-ext": [["Pietro Azevedo", true], ["Rafaela Castro", true], ["Felipe Arruda"], ["Camila Rezende", true], ["Vitor Lima"]],
};

const slug = (nome: string) =>
  nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, "-");

export function semente(agora: Date = new Date()): Banco {
  const hoje = diaDe(agora);
  const inicioAno = `${ANO}-02-02`;
  const usuarios: Usuario[] = [...personas];
  const vinculosAluno: Banco["vinculosAluno"] = [
    { alunoId: "u-gustavo", turmaId: "t-3a", desde: inicioAno },
    { alunoId: "u-isabela", turmaId: "t-1a", desde: inicioAno },
    { alunoId: "u-larissa", turmaId: "t-ext", desde: inicioAno },
  ];
  const vinculosResponsavel: Banco["vinculosResponsavel"] = [
    { responsavelId: "u-simone", alunoId: "u-isabela", parentesco: "Mãe", ativo: true },
    { responsavelId: "u-larissa", alunoId: "u-larissa", parentesco: "Próprio aluno", ativo: true },
  ];

  for (const [turmaId, nomes] of Object.entries(colegas)) {
    for (const [nome, proprio] of nomes) {
      const id = nome === "Gabriel Nunes" ? "u-gabriel" : `u-${slug(nome)}`;
      const t = turmas.find((x) => x.id === turmaId)!;
      usuarios.push(pessoa(id, nome, proprio ? ["aluno", "responsavel"] : ["aluno"], t.nome));
      vinculosAluno.push({ alunoId: id, turmaId, desde: inicioAno });
      if (id === "u-gabriel") {
        vinculosResponsavel.push({ responsavelId: "u-otavio", alunoId: id, parentesco: "Pai", ativo: true });
      } else if (proprio) {
        vinculosResponsavel.push({ responsavelId: id, alunoId: id, parentesco: "Próprio aluno", ativo: true });
      } else {
        const sobrenome = nome.split(" ").slice(-1)[0];
        const respId = `u-resp-${slug(nome)}`;
        const mae = sorteio(nome) > 0.5;
        usuarios.push(pessoa(respId, `${mae ? "Patrícia" : "Eduardo"} ${sobrenome}`, ["responsavel"], `Responsável por ${nome.split(" ")[0]}`));
        vinculosResponsavel.push({ responsavelId: respId, alunoId: id, parentesco: mae ? "Mãe" : "Pai", ativo: true });
      }
    }
  }
  usuarios.push(pessoa("u-roberto", "Roberto Lemos", ["responsavel"], "Pai do Gustavo"));
  vinculosResponsavel.push({ responsavelId: "u-roberto", alunoId: "u-gustavo", parentesco: "Pai", ativo: true });

  const aula = (professorId: string, disciplinaId: string, ...turmaIds: string[]) =>
    turmaIds.map((turmaId) => ({ professorId, disciplinaId, turmaId, desde: inicioAno }));
  const todas = turmas.map((t) => t.id);

  const vinculosProfessor: Banco["vinculosProfessor"] = [
    ...aula("u-otavio", "d-his", ...todas),
    ...aula("u-renata", "d-bio", ...todas),
    ...aula("u-wagner", "d-mat", ...todas),
    ...aula("u-carolina", "d-red", ...todas),
    ...aula("u-diego", "d-fis", ...todas),
  ];

  /* ---------- materiais ---------- */
  const pdf = (id: string, nome: string, kb: number, previa: string) => ({
    id,
    nome,
    tipo: "application/pdf",
    tamanho: kb * 1024,
    estado: "pronto" as const,
    previa,
  });

  const materiais: Banco["materiais"] = [
    {
      id: "m-2guerra",
      autorId: "u-otavio",
      disciplinaId: "d-his",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      status: "publicado",
      atual: {
        versao: 2,
        titulo: "Segunda Guerra: mapas e fotografias da aula",
        contexto: "Material da aula sobre o front oriental. Use os mapas para a questão 3 da lista.",
        anexos: [
          pdf("a-2g-1", "segunda-guerra-mapas.pdf", 2380, "Mapa 1: avanço alemão, junho a dezembro de 1941.\nMapa 2: Stalingrado, 1942–1943.\nMapa 3: a contraofensiva soviética até Berlim."),
          pdf("a-2g-2", "fotografias-comentadas.pdf", 4120, "Doze fotografias de arquivo, cada uma com data, local e uma pergunta para discussão."),
        ],
        autorId: "u-otavio",
        em: iso(em(agora, -1, 18, 20)),
        nota: "Troquei o mapa 2, que estava com a legenda trocada.",
      },
      historico: [
        {
          versao: 1,
          titulo: "Segunda Guerra: mapas e fotografias da aula",
          contexto: "Material da aula sobre o front oriental.",
          anexos: [pdf("a-2g-0", "segunda-guerra-mapas.pdf", 2310, "Versão anterior.")],
          autorId: "u-otavio",
          em: iso(em(agora, -2, 11, 5)),
        },
      ],
      criadoEm: iso(em(agora, -2, 11, 0)),
      publicadoEm: iso(em(agora, -2, 11, 5)),
    },
    {
      id: "m-repertorio",
      autorId: "u-carolina",
      disciplinaId: "d-red",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      status: "publicado",
      atual: {
        versao: 1,
        titulo: "Repertório para a redação 7: alimentação e desperdício",
        contexto: "Dados, leis e obras que vocês podem citar na redação desta semana. Leiam antes de escrever.",
        anexos: [pdf("a-rep-1", "repertorio-desperdicio.pdf", 640, "Repertório 1: o direito à alimentação no artigo 6º da Constituição.\nRepertório 2: o filme Ilha das Flores (1989).\nRepertório 3: como montar a proposta de intervenção com agente, ação, meio, finalidade e detalhamento.")],
        autorId: "u-carolina",
        em: iso(em(agora, -1, 15, 0)),
      },
      historico: [],
      criadoEm: iso(em(agora, -1, 14, 40)),
      publicadoEm: iso(em(agora, -1, 15, 0)),
    },
    {
      id: "m-genetica",
      autorId: "u-renata",
      disciplinaId: "d-bio",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      status: "publicado",
      atual: {
        versao: 1,
        titulo: "Lista de genética: 1ª e 2ª leis de Mendel",
        contexto: "Vinte questões de vestibular, com gabarito no fim. Vamos corrigir as dez primeiras no plantão de quarta.",
        anexos: [pdf("a-gen-1", "lista-genetica-mendel.pdf", 860, "Questão 1. Em ervilhas, a cor amarela da semente é dominante sobre a verde…")],
        autorId: "u-renata",
        em: iso(em(agora, -3, 14, 10)),
      },
      historico: [],
      criadoEm: iso(em(agora, -3, 14, 0)),
      publicadoEm: iso(em(agora, -3, 14, 10)),
    },
    {
      id: "m-simulado-video",
      autorId: "u-wagner",
      disciplinaId: "d-mat",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      status: "publicado",
      atual: {
        versao: 1,
        titulo: "Resolução comentada do simulado Enem 3",
        contexto: "Vídeo com as questões de Matemática que mais derrubaram as turmas no último simulado.",
        anexos: [],
        link: { url: "https://www.youtube.com/watch?v=exemplo-cortex", rotulo: "Assistir no YouTube" },
        autorId: "u-wagner",
        em: iso(em(agora, -5, 20, 0)),
      },
      historico: [],
      criadoEm: iso(em(agora, -5, 19, 50)),
      publicadoEm: iso(em(agora, -5, 20, 0)),
    },
    {
      id: "m-cinematica",
      autorId: "u-diego",
      disciplinaId: "d-fis",
      turmaIds: ["t-3b"],
      status: "publicado",
      atual: {
        versao: 1,
        titulo: "Cinemática: resumo para a prova",
        contexto: "Resumo da 3ª série B, com as fórmulas do bimestre.",
        anexos: [pdf("a-cin-1", "cinematica-resumo.pdf", 540, "Movimento uniforme: s = s₀ + v·t …")],
        autorId: "u-diego",
        em: iso(em(agora, -4, 10, 0)),
      },
      historico: [],
      criadoEm: iso(em(agora, -4, 9, 40)),
      publicadoEm: iso(em(agora, -4, 10, 0)),
    },
    {
      id: "m-lista-errada",
      autorId: "u-wagner",
      disciplinaId: "d-mat",
      turmaIds: ["t-3a"],
      status: "retirado",
      atual: {
        versao: 1,
        titulo: "Lista de logaritmos",
        contexto: "Lista para a aula de quinta.",
        anexos: [pdf("a-log-1", "lista-logaritmos.pdf", 310, "")],
        autorId: "u-wagner",
        em: iso(em(agora, -6, 8, 0)),
      },
      historico: [],
      criadoEm: iso(em(agora, -6, 8, 0)),
      publicadoEm: iso(em(agora, -6, 8, 0)),
      retirada: { por: "u-wagner", em: iso(em(agora, -6, 9, 30)), motivo: "Publiquei a lista do ano passado por engano. A certa sai na quinta." },
    },
    {
      id: "m-revolucao",
      autorId: "u-otavio",
      disciplinaId: "d-his",
      turmaIds: ["t-1a"],
      status: "publicado",
      atual: {
        versao: 1,
        titulo: "Revolução Industrial: linha do tempo",
        contexto: "Para a tarefa da página 112. Traga impressa ou no celular.",
        anexos: [pdf("a-rev-1", "linha-do-tempo-revolucao-industrial.pdf", 720, "1712: máquina a vapor de Newcomen…")],
        autorId: "u-otavio",
        em: iso(em(agora, -1, 9, 0)),
      },
      historico: [],
      criadoEm: iso(em(agora, -1, 8, 50)),
      publicadoEm: iso(em(agora, -1, 9, 0)),
    },
    {
      id: "m-rascunho",
      autorId: "u-otavio",
      disciplinaId: "d-his",
      turmaIds: ["t-3a"],
      status: "rascunho",
      atual: {
        versao: 1,
        titulo: "Guerra Fria: roteiro de estudo",
        contexto: "",
        anexos: [],
        autorId: "u-otavio",
        em: iso(em(agora, 0, 7, 40)),
      },
      historico: [],
      criadoEm: iso(em(agora, 0, 7, 40)),
    },
  ];

  /* ---------- tarefas e entregas ---------- */
  const tarefas: Banco["tarefas"] = [
    {
      id: "tar-redacao-7",
      professorId: "u-carolina",
      disciplinaId: "d-red",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      titulo: "Redação 7: o desperdício de alimentos no Brasil",
      instrucoes: "Texto dissertativo-argumentativo no modelo do Enem, até 30 linhas, à mão na folha de redação. Fotografe a folha inteira, com boa luz.",
      prazo: iso(em(agora, 3, 23, 59)),
      permiteReenvio: true,
      tipo: "redacao",
      criadaEm: iso(em(agora, -1, 15, 5)),
    },
    {
      id: "tar-redacao-6",
      professorId: "u-carolina",
      disciplinaId: "d-red",
      turmaIds: ["t-3a", "t-3b", "t-ext"],
      titulo: "Redação 6: a saúde mental dos jovens",
      instrucoes: "Texto dissertativo-argumentativo no modelo do Enem, até 30 linhas.",
      prazo: iso(em(agora, -9, 23, 59)),
      permiteReenvio: false,
      tipo: "redacao",
      criadaEm: iso(em(agora, -16, 15, 0)),
    },
    {
      id: "tar-pag112",
      professorId: "u-otavio",
      disciplinaId: "d-his",
      turmaIds: ["t-1a"],
      titulo: "Exercícios 1 a 3 da página 112",
      instrucoes: "Resolva no caderno ou no livro e envie as fotos da resolução. Pode ser direto do celular.",
      prazo: iso(em(agora, 2, 23, 59)),
      permiteReenvio: true,
      criadaEm: iso(em(agora, -1, 9, 5)),
    },
    {
      id: "tar-funcoes",
      professorId: "u-wagner",
      disciplinaId: "d-mat",
      turmaIds: ["t-1a"],
      titulo: "Funções do 1º grau: questões 5 a 8",
      instrucoes: "Mostre o gráfico de cada função. Foto nítida, sem sombra.",
      prazo: iso(em(agora, -1, 23, 59)),
      permiteReenvio: false,
      criadaEm: iso(em(agora, -6, 10, 0)),
    },
    {
      id: "tar-celula",
      professorId: "u-renata",
      disciplinaId: "d-bio",
      turmaIds: ["t-1a"],
      titulo: "Desenho da célula vegetal com legendas",
      instrucoes: "Desenhe à mão e fotografe. Vale capricho na legenda.",
      prazo: iso(em(agora, -8, 23, 59)),
      permiteReenvio: true,
      criadaEm: iso(em(agora, -14, 10, 0)),
    },
  ];

  const foto = (id: string, nome: string, previa = "Foto da resolução (exemplo).") => ({ id, nome, tipo: "image/jpeg", tamanho: 1_850_000, estado: "pronto" as const, previa });
  const folha = (id: string) => foto(id, "redacao.jpg", "Foto da folha de redação (exemplo).");
  const redacaoCorrigida = (alunoId: string, competencias: number[], texto: string, dias: number) => ({
    id: `ent-${alunoId}-red6`,
    tarefaId: "tar-redacao-6",
    alunoId,
    anexos: [folha(`f-${alunoId}-red6`)],
    protocolo: `ENT-${diaDe(em(agora, -10)).replace(/-/g, "")}-${String(Math.round(sorteio(alunoId) * 1e6)).padStart(6, "0")}`,
    enviadaEm: iso(em(agora, -10, 20, Math.round(sorteio(alunoId) * 50))),
    tentativa: 1,
    status: "conferida" as const,
    retorno: { por: "u-carolina", em: iso(em(agora, dias, 16, 0)), texto, competencias },
  });

  const entregas: Banco["entregas"] = [
    redacaoCorrigida("u-gustavo", [160, 160, 120, 160, 120], "Boa leitura da proposta. Na C3, o segundo argumento repete o primeiro; na C5, falta dizer quem executa a ação.", -6),
    redacaoCorrigida("u-larissa", [200, 160, 160, 160, 160], "Texto bem amarrado. Para chegar a 200 na C2, use um repertório que você ligue de fato ao tema.", -6),
    redacaoCorrigida("u-joao-pedro-silva", [120, 120, 120, 120, 80], "Revise a concordância verbal e detalhe a proposta de intervenção.", -5),
    redacaoCorrigida("u-manuela-prado", [160, 200, 160, 160, 200], "Ótima proposta de intervenção, com os cinco elementos.", -5),
    ...["u-joao-pedro-silva", "u-mateus-oliveira", "u-pietro-azevedo", "u-rafaela-castro"].map((alunoId, i) => ({
      id: `ent-${alunoId}-red7`,
      tarefaId: "tar-redacao-7",
      alunoId,
      anexos: [folha(`f-${alunoId}-red7`)],
      protocolo: `ENT-${diaDe(agora).replace(/-/g, "")}-30${i}551`,
      enviadaEm: iso(em(agora, 0, 7, 5 + i * 11)),
      tentativa: 1,
      status: "enviada" as const,
    })),
    {
      id: "ent-isabela-celula",
      tarefaId: "tar-celula",
      alunoId: "u-isabela",
      anexos: [foto("f-ic-1", "celula-vegetal.jpg")],
      protocolo: `ENT-${diaDe(em(agora, -9)).replace(/-/g, "")}-418273`,
      enviadaEm: iso(em(agora, -9, 21, 14)),
      tentativa: 1,
      status: "conferida",
      retorno: { por: "u-renata", em: iso(em(agora, -7, 13, 0)), texto: "Ótimo desenho. Faltou só o vacúolo na legenda." },
    },
    {
      id: "ent-isabela-funcoes",
      tarefaId: "tar-funcoes",
      alunoId: "u-isabela",
      anexos: [foto("f-if-1", "funcoes-1.jpg"), foto("f-if-2", "funcoes-2.jpg")],
      protocolo: `ENT-${diaDe(em(agora, -2)).replace(/-/g, "")}-552901`,
      enviadaEm: iso(em(agora, -2, 20, 3)),
      tentativa: 1,
      status: "enviada",
    },
    ...["u-sofia-ribeiro", "u-davi-mendes", "u-helena-duarte"].map((alunoId, i) => ({
      id: `ent-${alunoId}-112`,
      tarefaId: "tar-pag112",
      alunoId,
      anexos: [foto(`f-${alunoId}`, "pagina-112.jpg")],
      protocolo: `ENT-${diaDe(agora).replace(/-/g, "")}-10${i}337`,
      enviadaEm: iso(em(agora, 0, 7, 10 + i * 9)),
      tentativa: 1,
      status: "enviada" as const,
    })),
    ...["u-sofia-ribeiro", "u-helena-duarte", "u-enzo-barbosa"].map((alunoId, i) => ({
      id: `ent-${alunoId}-funcoes`,
      tarefaId: "tar-funcoes",
      alunoId,
      anexos: [foto(`f-${alunoId}-f`, "funcoes.jpg")],
      protocolo: `ENT-${diaDe(em(agora, -2)).replace(/-/g, "")}-20${i}114`,
      enviadaEm: iso(em(agora, -2, 19, 10 + i * 7)),
      tentativa: 1,
      status: "enviada" as const,
    })),
  ];

  /* ---------- simulados ---------- */
  const QUESTOES: Record<AreaSimulado, number> = { linguagens: 45, humanas: 45, natureza: 45, matematica: 45 };
  const doVestibular = ["t-3a", "t-3b", "t-ext"];
  const participantes = vinculosAluno.filter((v) => doVestibular.includes(v.turmaId)).map((v) => v.alunoId);
  const simulado = (n: number, dias: number, turmaIds: string[], alunos: string[]): Simulado => ({
    id: `sim-enem-${n}`,
    nome: `Simulado Enem ${n}`,
    data: diaDe(em(agora, dias)),
    modelo: "Enem",
    turmaIds,
    questoes: QUESTOES,
    resultados: alunos.map((alunoId) => {
      // cada aluno tem um nível por área e melhora um pouco a cada simulado
      const acertos = Object.fromEntries(
        AREAS.map((a) => {
          const base = 0.42 + sorteio(`${alunoId}${a.id}`) * 0.4 + n * 0.035;
          const variacao = (sorteio(`${alunoId}${a.id}${n}`) - 0.5) * 0.12;
          return [a.id, Math.max(8, Math.min(44, Math.round((base + variacao) * QUESTOES[a.id])))];
        }),
      ) as Record<AreaSimulado, number>;
      const redacao = Math.min(1000, Math.round((480 + sorteio(`${alunoId}red`) * 360 + n * 30) / 40) * 40);
      return { alunoId, acertos, redacao };
    }),
    origem: "Coordenação pedagógica, correção do simulado",
    publicadoEm: iso(em(agora, dias + 6, 18, 0)),
  });
  const simulados: Simulado[] = [
    simulado(1, -75, doVestibular, participantes),
    simulado(2, -46, doVestibular, participantes),
    simulado(3, -17, doVestibular, participantes),
  ];

  /* ---------- plantões ---------- */
  const plantoes: Banco["plantoes"] = [
    { id: "p-bio", professorId: "u-renata", disciplinaId: "d-bio", diasSemana: [1, 3], inicio: "13:30", fim: "17:00", local: "Sala 6", series: "1ª série ao Extensivo" },
    { id: "p-red", professorId: "u-carolina", disciplinaId: "d-red", diasSemana: [1, 2, 4], inicio: "14:00", fim: "17:00", local: "Sala 2", series: "3ª série e Extensivo" },
    { id: "p-mat", professorId: "u-wagner", disciplinaId: "d-mat", diasSemana: [2, 4, 5], inicio: "14:00", fim: "17:30", local: "Biblioteca, mesa 2", series: "1ª série ao Extensivo" },
    { id: "p-fis", professorId: "u-diego", disciplinaId: "d-fis", diasSemana: [1, 3, 5], inicio: "14:00", fim: "16:30", local: "Sala 8", series: "3ª série e Extensivo" },
    { id: "p-his", professorId: "u-otavio", disciplinaId: "d-his", diasSemana: [3, 5], inicio: "13:30", fim: "15:30", local: "Sala 4", series: "1ª série ao Extensivo" },
  ];
  const fila: Banco["fila"] = [];
  const semana = agora.getDay();
  const filaHoje = (plantaoId: string, entradas: [string[], string | undefined, number][]) =>
    entradas.forEach(([alunoIds, duvida, minutos], i) =>
      fila.push({
        id: `fila-${plantaoId}-${i}`,
        plantaoId,
        data: hoje,
        autorId: alunoIds[0],
        alunoIds,
        duvida,
        entrouEm: iso(new Date(agora.getTime() - minutos * 60_000)),
        status: "aguardando",
        atualizadoEm: iso(new Date(agora.getTime() - minutos * 60_000)),
      }),
    );
  for (const p of plantoes) {
    if (!p.diasSemana.includes(semana)) continue;
    if (p.id === "p-red") {
      filaHoje(p.id, [
        [["u-pietro-azevedo"], "Quero entender por que tirei 80 na competência 5.", 20],
        [["u-joao-pedro-silva", "u-mateus-oliveira"], "Como citar repertório sem decorar data.", 9],
      ]);
    } else if (p.id === "p-bio" || p.id === "p-mat") {
      filaHoje(p.id, [
        [["u-joao-pedro-silva", "u-julia-rezende"], "Questão 7 da lista de genética: não entendi o cruzamento.", 25],
        [["u-manuela-prado"], undefined, 12],
      ]);
    } else {
      filaHoje(p.id, [[["u-lorenzo-batista"], "Revisão para a prova de sexta.", 8]]);
    }
  }

  /* ---------- avisos e agenda ---------- */
  const proximoSabado = ((6 - semana + 7) % 7) || 7;
  const avisos: Banco["avisos"] = [
    {
      id: "avi-simulado",
      autorId: "u-adriana",
      titulo: "Simulado Enem 4 no sábado, das 13h30 às 19h",
      corpo: "Traga caneta preta de tubo transparente, documento com foto e água. Os portões fecham às 13h, como no Enem.",
      categoria: "Pedagógico",
      publico: { tipo: "turmas", turmaIds: doVestibular },
      paraAlunos: true,
      paraResponsaveis: true,
      exigeCiencia: false,
      publicadoEm: iso(em(agora, -1, 10, 0)),
      ciencias: [],
    },
    {
      id: "avi-jogos",
      autorId: "u-adriana",
      titulo: "Autorização: Jogos Córtex na próxima sexta",
      corpo: "A 1ª e a 2ª série passam a tarde na quadra, das 13h30 às 17h. Confirme a ciência até quarta-feira para o aluno participar.",
      categoria: "Evento",
      publico: { tipo: "turmas", turmaIds: ["t-1a", "t-2a"] },
      paraAlunos: false,
      paraResponsaveis: true,
      exigeCiencia: true,
      publicadoEm: iso(em(agora, -2, 17, 0)),
      ciencias: [
        { usuarioId: "u-resp-sofia-ribeiro", em: iso(em(agora, -2, 18, 0)) },
        { usuarioId: "u-resp-heitor-almeida", em: iso(em(agora, -1, 7, 30)) },
      ],
    },
    {
      id: "avi-reuniao",
      autorId: "u-adriana",
      titulo: "Reunião de pais da 1ª série",
      corpo: "Na quinta, às 19h, no auditório. Vamos apresentar o resultado do 3º bimestre e o calendário de provas.",
      categoria: "Pedagógico",
      publico: { tipo: "turmas", turmaIds: ["t-1a"] },
      paraAlunos: false,
      paraResponsaveis: true,
      exigeCiencia: true,
      publicadoEm: iso(em(agora, -3, 12, 0)),
      ciencias: [{ usuarioId: "u-resp-davi-mendes", em: iso(em(agora, -3, 13, 0)) }],
    },
    {
      id: "avi-contrato",
      autorId: "u-tatiane",
      titulo: "Rematrícula 2027: contratos na secretaria",
      corpo: "Quem assina o contrato é o responsável financeiro. Alunos maiores de idade que respondem pela própria matrícula assinam em nome próprio. Atendimento das 8h às 18h.",
      categoria: "Secretaria",
      publico: { tipo: "escola" },
      paraAlunos: false,
      paraResponsaveis: true,
      exigeCiencia: true,
      publicadoEm: iso(em(agora, -4, 9, 0)),
      ciencias: [],
    },
    {
      id: "avi-juri",
      autorId: "u-otavio",
      titulo: "Júri simulado literário: divisão dos grupos",
      corpo: "Os grupos e os livros de cada um estão no mural da sala. O júri é na última semana do mês, no horário da aula.",
      categoria: "Pedagógico",
      publico: { tipo: "turmas", turmaIds: ["t-3a", "t-3b"] },
      paraAlunos: true,
      paraResponsaveis: false,
      exigeCiencia: false,
      publicadoEm: iso(em(agora, -6, 9, 0)),
      ciencias: [],
    },
  ];

  const agenda: Banco["agenda"] = [
    { id: "ev-simulado", titulo: "Simulado Enem 4", data: diaDe(em(agora, proximoSabado)), hora: "13:00", local: "Salas da 3ª série e do Extensivo", descricao: "Simulado no formato do primeiro dia do Enem.", publico: { tipo: "turmas", turmaIds: doVestibular } },
    { id: "ev-reuniao", titulo: "Reunião de pais da 1ª série", data: diaDe(em(agora, 3)), hora: "19:00", local: "Auditório", descricao: "Resultado do 3º bimestre e calendário de provas.", publico: { tipo: "turmas", turmaIds: ["t-1a"] } },
    { id: "ev-jogos", titulo: "Jogos Córtex", data: diaDe(em(agora, 4)), hora: "13:30", local: "Quadra", descricao: "Tarde de jogos da 1ª e da 2ª série.", publico: { tipo: "turmas", turmaIds: ["t-1a", "t-2a"] } },
    { id: "ev-cast", titulo: "Gravação do Vestibulando Cast", data: diaDe(em(agora, 9)), hora: "16:00", local: "Sala 2", descricao: "Episódio sobre a rotina de estudo no Extensivo. Aberto a quem quiser assistir.", publico: { tipo: "escola" } },
  ];

  /* ---------- notas (só o Ensino Médio tem boletim; o Extensivo acompanha pelos simulados) ---------- */
  const notas: Nota[] = [];
  const periodos = ["1º bimestre", "2º bimestre", "3º bimestre"];
  for (const v of vinculosAluno) {
    if (turmas.find((t) => t.id === v.turmaId)?.etapa !== "medio") continue;
    const disciplinasDaTurma = [...new Set(vinculosProfessor.filter((p) => p.turmaId === v.turmaId).map((p) => p.disciplinaId))];
    for (const d of disciplinasDaTurma) {
      for (const periodo of periodos) {
        const base = 5.2 + sorteio(`${v.alunoId}${d}`) * 4.3;
        const valor = Math.min(10, Math.max(2.5, base + (sorteio(`${v.alunoId}${d}${periodo}`) - 0.5) * 2.4));
        notas.push({ alunoId: v.alunoId, disciplinaId: d, periodo, valor: Math.round(valor * 10) / 10, origem: "Secretaria, fechamento do bimestre", atualizadoEm: iso(em(agora, periodo.startsWith("3") ? -12 : -70)) });
      }
    }
  }

  /* ---------- atendimento ---------- */
  const solicitacoes: Banco["solicitacoes"] = [
    {
      id: "sol-bolsa",
      protocolo: `ATD-${diaDe(em(agora, -1)).replace(/-/g, "")}-302114`,
      autorId: "u-simone",
      alunoId: "u-isabela",
      setor: "Financeiro",
      assunto: "Bolsa da Isabela em 2027",
      status: "aberta",
      abertaEm: iso(em(agora, -1, 20, 15)),
      prazoResposta: iso(em(agora, 1, 20, 15)),
      mensagens: [{ autorId: "u-simone", texto: "Boa noite. A Isabela entrou com bolsa pela Prova de Bolsas. Para a 2ª série, ela precisa fazer a prova de novo ou a bolsa continua?", em: iso(em(agora, -1, 20, 15)) }],
    },
    {
      id: "sol-declaracao",
      protocolo: `ATD-${diaDe(em(agora, 0)).replace(/-/g, "")}-118430`,
      autorId: "u-larissa",
      alunoId: "u-larissa",
      setor: "Secretaria",
      assunto: "Declaração de matrícula para o passe estudantil",
      status: "respondida",
      abertaEm: iso(em(agora, -2, 8, 0)),
      prazoResposta: iso(em(agora, -1, 8, 0)),
      responsavelId: "u-tatiane",
      mensagens: [
        { autorId: "u-larissa", texto: "Preciso da declaração de matrícula no Extensivo para renovar o passe estudantil.", em: iso(em(agora, -2, 8, 0)) },
        { autorId: "u-tatiane", texto: "Pronto, Larissa. A declaração está assinada e pode ser retirada na secretaria a partir das 14h.", em: iso(em(agora, -2, 11, 30)) },
      ],
    },
    {
      id: "sol-atrasada",
      protocolo: `ATD-${diaDe(em(agora, -5)).replace(/-/g, "")}-774520`,
      autorId: "u-resp-miguel-cardoso",
      alunoId: "u-miguel-cardoso",
      setor: "Coordenação",
      assunto: "Reforço de Matemática no contraturno",
      status: "aberta",
      abertaEm: iso(em(agora, -5, 11, 0)),
      prazoResposta: iso(em(agora, -3, 11, 0)),
      mensagens: [{ autorId: "u-resp-miguel-cardoso", texto: "O Miguel ficou abaixo da média em Matemática. Ele pode frequentar o plantão da 3ª série ou existe outro horário para a 2ª?", em: iso(em(agora, -5, 11, 0)) }],
    },
  ];

  /* ---------- serviços externos ---------- */
  const servicos: Banco["servicos"] = [
    { id: "srv-livro", nome: "Livro digital", descricao: "Conteúdo do sistema de ensino. Endereço a confirmar com o colégio.", url: "https://colegiocortex.com.br", publico: ["aluno", "professor"], ativo: true },
    { id: "srv-cast", nome: "Vestibulando Cast", descricao: "O podcast do Córtex, no YouTube.", url: "https://www.youtube.com/@Col%C3%A9gioC%C3%B3rtex", publico: ["aluno", "professor", "responsavel"], ativo: true },
    { id: "srv-financeiro", nome: "Financeiro e boletos", descricao: "Mensalidades, boletos e segunda via. Endereço a confirmar com o colégio.", url: "https://colegiocortex.com.br", publico: ["responsavel"], ativo: true },
  ];

  /* ---------- CRM ---------- */
  const familias: Banco["familias"] = [];
  const contatos: Banco["contatos"] = [];
  const candidatos: Banco["candidatos"] = [];
  const oportunidades: Banco["oportunidades"] = [];
  const notasCrm: Banco["notasCrm"] = [];
  const tarefasCrm: Banco["tarefasCrm"] = [];

  type Lead = [
    familia: string,
    bairro: string,
    origem: Banco["familias"][number]["origem"],
    contato: [string, string, string],
    aluno: [string, number, Etapa, string, string?],
    estagio: Banco["oportunidades"][number]["estagio"],
    diasAtras: number,
    responsavelId: string,
    extra?: { nota?: string; tarefa?: [string, number]; perda?: string; visita?: number; prova?: [number, number?]; tipo?: "rematricula"; etiqueta?: string },
  ];
  const PROPRIO = "Próprio aluno";
  const leads: Lead[] = [
    ["Família Carvalho", "Setor Bueno", "Site", ["Renata Carvalho", "Mãe", "62 99811-2040"], ["Pedro Carvalho", 2011, "medio", "1ª série", "Escola municipal"], "novo", 0, "u-thiago", { nota: "Pediu visita pelo formulário do site.", tarefa: ["Retornar para Renata", 0], etiqueta: "Pediu visita" }],
    ["Lucas Queiroz", "Jardim Goiás", "Instagram", ["Lucas Queiroz", PROPRIO, "62 98402-7711"], ["Lucas Queiroz", 2007, "pre-vestibular", "Extensivo"], "novo", 1, "u-thiago", { nota: "Terminou o Ensino Médio em 2026 e quer Medicina. Perguntou o horário do Extensivo.", tarefa: ["Responder no WhatsApp", -1] }],
    ["Família Bastos", "Setor Marista", "Indicação", ["Camila Bastos", "Mãe", "62 99120-4488"], ["Rafael Bastos", 2009, "medio", "3ª série", "Colégio estadual"], "em-conversa", 4, "u-mirela", { nota: "Indicação da família Ribeiro. Quer saber como funcionam os simulados da 3ª série.", tarefa: ["Enviar o calendário de simulados", 1] }],
    ["Família Moura", "Setor Oeste", "WhatsApp", ["Fábio Moura", "Pai", "62 98877-1203"], ["Isadora Moura", 2010, "medio", "2ª série"], "em-conversa", 6, "u-thiago", { nota: "Perguntou se a Prova de Bolsas vale para quem vai entrar na 2ª série. Vale." }],
    ["Família Teles", "Setor Bueno", "Site", ["Aline Teles", "Mãe", "62 99654-3321"], ["Gustavo Teles", 2011, "medio", "1ª série", "Escola estadual"], "agendado", 5, "u-thiago", { prova: [2], etiqueta: "Prova de Bolsas" }],
    ["Clara Arantes", "Alphaville Flamboyant", "Evento", ["Clara Arantes", PROPRIO, "62 98111-0090"], ["Clara Arantes", 2008, "pre-vestibular", "Extensivo"], "agendado", 3, "u-mirela", { visita: 1, nota: "Conheceu o Córtex numa feira de vestibular. Quer assistir a uma aula do Extensivo." }],
    ["Família Duarte Lima", "Jardim América", "Indicação", ["Sílvia Duarte", "Avó", "62 99230-5566"], ["Vicente Lima", 2010, "medio", "2ª série"], "compareceu", 8, "u-thiago", { prova: [-4, 50], nota: "Fez a prova com a avó esperando na recepção. Conquistou 50% de desconto.", tarefa: ["Enviar a proposta com a bolsa de 50%", 0], etiqueta: "Prova de Bolsas" }],
    ["Família Sampaio", "Setor Sul", "Telefone", ["Rodrigo Sampaio", "Pai", "62 98500-1717"], ["Júlia Sampaio", 2011, "medio", "1ª série"], "compareceu", 15, "u-mirela", { visita: -12, tarefa: ["Enviar proposta com valores de 2027", -2] }],
    ["Henrique Valadares", "Setor Bueno", "Site", ["Henrique Valadares", PROPRIO, "62 99900-3412"], ["Henrique Valadares", 2007, "pre-vestibular", "Extensivo"], "proposta", 9, "u-thiago", { nota: "Proposta enviada por e-mail. Comparando com outro cursinho." }],
    ["Família Guimarães", "Nova Suíça", "Indicação", ["Daniela Guimarães", "Mãe", "62 98760-2202"], ["Antônio Guimarães", 2009, "medio", "3ª série"], "proposta", 7, "u-mirela", { prova: [-12, 30], tarefa: ["Confirmar documentos da transferência", 1], etiqueta: "Prova de Bolsas" }],
    ["Família Nogueira", "Setor Marista", "Indicação", ["Fernando Nogueira", "Pai", "62 99712-6060"], ["Luísa Nogueira", 2011, "medio", "1ª série"], "matriculado", 30, "u-thiago", { prova: [-40, 70], etiqueta: "Prova de Bolsas" }],
    ["Família Pacheco", "Setor Oeste", "Instagram", ["Bruna Pacheco", "Mãe", "62 98234-9090"], ["Nina Pacheco", 2010, "medio", "2ª série"], "perdido", 20, "u-thiago", { perda: "Distância de casa: escolheu escola no próprio bairro." }],
    ["Família Rocha", "Jardim Goiás", "Site", ["Hugo Rocha", "Pai", "62 99187-4545"], ["Davi Rocha", 2009, "medio", "3ª série"], "perdido", 25, "u-mirela", { perda: "Valor da mensalidade: ficou acima do planejado mesmo com a bolsa.", prova: [-28, 20] }],
    ["Família Cardoso", "Setor Bueno", "Rematrícula", ["Eduardo Cardoso", "Pai", "62 99300-1188"], ["Miguel Cardoso", 2010, "medio", "3ª série (2027)"], "em-conversa", 2, "u-mirela", { tipo: "rematricula", nota: "Rematrícula para 2027. A família espera a resposta sobre o reforço de Matemática.", tarefa: ["Conversar com a coordenação sobre a solicitação em atraso", 0] }],
  ];

  leads.forEach(([nome, bairro, origem, [cNome, relacao, telefone], [an, ano, etapa, serie, escola], estagio, diasAtras, responsavelId, extra = {}], i) => {
    const familiaId = `fam-${i}`;
    const criada = em(agora, -diasAtras - 3, 10 + (i % 6), 15);
    familias.push({ id: familiaId, nome, bairro, origem, responsavelId, etiquetas: extra.etiqueta ? [extra.etiqueta] : [], criadaEm: iso(criada) });
    contatos.push({ id: `con-${i}`, familiaId, nome: cNome, relacao, telefone, email: `${slug(cNome).replace(/-/g, ".")}@exemplo.com`, principal: true });
    candidatos.push({ id: `can-${i}`, familiaId, nome: an, anoNascimento: ano, etapa, serieInteresse: serie, escolaAtual: escola });
    const opId = `opo-${i}`;
    const bolsa = extra.prova?.[1];
    oportunidades.push({
      id: opId,
      familiaId,
      candidatoIds: [`can-${i}`],
      tipo: extra.tipo ?? "captacao",
      estagio,
      ordem: i,
      responsavelId,
      anoLetivo: 2027,
      valorMensal: comBolsa(MENSALIDADE_DEMO[etapa], bolsa),
      visita: extra.visita !== undefined ? { data: diaDe(em(agora, extra.visita)), hora: "15:00" } : undefined,
      prova: extra.prova ? { data: diaDe(em(agora, extra.prova[0])), hora: "08:00", bolsa } : undefined,
      motivoPerda: extra.perda,
      criadaEm: iso(criada),
      atualizadaEm: iso(em(agora, -diasAtras, 16, 0)),
    });
    notasCrm.push({ id: `nota-${i}-0`, familiaId, oportunidadeId: opId, autorId: responsavelId, texto: `Primeiro contato pelo canal ${origem === "Site" ? "do site" : origem}.`, em: iso(criada) });
    if (extra.nota) notasCrm.unshift({ id: `nota-${i}-1`, familiaId, oportunidadeId: opId, autorId: responsavelId, texto: extra.nota, em: iso(em(agora, -diasAtras, 15, 0)) });
    if (extra.tarefa) tarefasCrm.push({ id: `tcrm-${i}`, titulo: extra.tarefa[0], prazo: iso(em(agora, extra.tarefa[1], 17, 0)), responsavelId, familiaId, oportunidadeId: opId });
  });

  return {
    versao: VERSAO_BANCO,
    usuarios,
    turmas,
    disciplinas,
    vinculosAluno,
    vinculosProfessor,
    vinculosResponsavel,
    materiais,
    tarefas,
    entregas,
    simulados,
    plantoes,
    fila,
    avisos,
    agenda,
    notas,
    solicitacoes,
    servicos,
    familias,
    contatos,
    candidatos,
    oportunidades,
    tarefasCrm,
    notasCrm,
    auditoria: [],
  };
}

/** Personas mostradas no seletor de perfil da demonstração, na ordem de apresentação. */
export const PERSONAS = personas.map((p) => p.id);
