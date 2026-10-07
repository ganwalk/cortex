/*
  O fluxo único da Plataforma Córtex, na ordem em que um aluno chega ao colégio e vive o ano.
  Cada etapa aponta para a tela real do protótipo, já aberta como a pessoa certa.
*/
export interface Etapa {
  id: string;
  numero: number;
  titulo: string;
  quem: string;
  acontece: string;
  resolve: string;
  itens: string[];
  pessoa?: { id: string; nome: string; papel: string };
  href: string;
  acao: string;
  tela: string;
  celular?: string;
}

const como = (id: string, rota: string) => `/plataforma/?como=${id}#${rota}`;

export const fluxo: Etapa[] = [
  {
    id: "site",
    numero: 1,
    titulo: "Site",
    quem: "Aluno ou família interessada",
    acontece: "Conhece as turmas e pede uma visita, se inscreve na Prova de Bolsas ou tira dúvidas.",
    resolve: "O pedido entra no funil da captação com responsável e prazo de retorno, preenchido pelo aluno ou pelo responsável.",
    itens: ["Turmas da 1ª série ao Extensivo", "Visita, Prova de Bolsas ou dúvidas no mesmo formulário", "Contato cai direto na captação"],
    href: "/site/#visita",
    acao: "Abrir o site",
    tela: "site",
  },
  {
    id: "captacao",
    numero: 2,
    titulo: "Captação",
    quem: "Relacionamento e direção",
    acontece: "Retorna, marca a visita ou a prova, lança a bolsa quando houver e acompanha cada contato até a decisão.",
    resolve: "Cada contato tem tarefa com prazo, a bolsa entra no valor da proposta e toda perda fica registrada com o motivo.",
    itens: ["Funil com visita e Prova de Bolsas", "Resultado da prova e bolsa por aluno", "Tarefas com prazo e relatórios"],
    pessoa: { id: "u-thiago", nome: "Thiago Teixeira", papel: "Relacionamento" },
    href: como("u-thiago", "/crm"),
    acao: "Entrar como Thiago",
    tela: "crm",
  },
  {
    id: "matricula",
    numero: 3,
    titulo: "Matrícula",
    quem: "Secretaria",
    acontece: "Escolhe a turma e matricula. Os acessos nascem aqui; o aluno maior de idade ganha uma conta só.",
    resolve: "Os vínculos de turma e de responsável criados na matrícula definem o que cada pessoa vê a partir dali.",
    itens: ["Matrícula a partir da oportunidade", "Contas e vínculos criados juntos", "Aluno que responde por si"],
    pessoa: { id: "u-tatiane", nome: "Tatiane Reis", papel: "Secretaria" },
    href: como("u-tatiane", "/crm"),
    acao: "Entrar como Tatiane",
    tela: "crm",
  },
  {
    id: "familia",
    numero: 4,
    titulo: "Responsável",
    quem: "Mães, pais e alunos maiores de idade",
    acontece: "Confirma avisos, acompanha notas e simulados e fala com o colégio com protocolo.",
    resolve: "Cada pedido tem setor, prazo de resposta e histórico. O aluno maior de idade usa o mesmo portal para a própria matrícula.",
    itens: ["Resumo por aluno", "Avisos com ciência", "Boletim e simulados", "Fale com a escola, com prazo"],
    pessoa: { id: "u-simone", nome: "Simone Martins", papel: "Mãe da Isabela" },
    href: como("u-simone", "/pais"),
    acao: "Entrar como Simone",
    tela: "familia",
    celular: "familia-celular",
  },
  {
    id: "aluno",
    numero: 5,
    titulo: "Aluno",
    quem: "Da 1ª série ao Extensivo",
    acontece: "Envia a redação pela câmera, vê a nota por competência, acompanha os simulados e entra na fila do plantão.",
    resolve: "A redação vai por foto com comprovante, a nota sai competência por competência e o simulado mostra a evolução área por área.",
    itens: ["Redação com nota por competência", "Simulados por área do Enem", "Fila do plantão, sozinho ou em grupo", "Materiais por disciplina"],
    pessoa: { id: "u-gustavo", nome: "Gustavo Lemos", papel: "3ª série A" },
    href: como("u-gustavo", "/aluno/tarefas/tar-redacao-6"),
    acao: "Entrar como Gustavo",
    tela: "aluno",
    celular: "aluno-celular",
  },
  {
    id: "professor",
    numero: 6,
    titulo: "Professor",
    quem: "Corpo docente",
    acontece: "Corrige a redação pelas cinco competências, publica material e chama a fila do plantão.",
    resolve: "A nota de cada competência chega ao aluno com o comentário, e o professor publica uma vez para todas as turmas.",
    itens: ["Correção pelas competências do Enem", "Publicar com revisão de destinatários", "Conferir ou devolver entregas", "Fila ao vivo"],
    pessoa: { id: "u-carolina", nome: "Carolina Campos", papel: "Redação" },
    href: como("u-carolina", "/professor/tarefas/tar-redacao-7"),
    acao: "Entrar como Carolina",
    tela: "professor",
  },
  {
    id: "gestao",
    numero: 7,
    titulo: "Gestão",
    quem: "Coordenação e direção",
    acontece: "Vê o colégio inteiro: simulados por turma, entregas, atendimento atrasado e quem precisa de atenção.",
    resolve: "Os números do painel vêm do uso da plataforma. Na rematrícula, o contato volta para o funil da captação.",
    itens: ["Simulados por turma e área", "Atendimento por prazo", "Moderação e auditoria", "Serviços externos"],
    pessoa: { id: "u-adriana", nome: "Adriana Alves", papel: "Coordenação" },
    href: como("u-adriana", "/gestao"),
    acao: "Entrar como Adriana",
    tela: "gestao",
  },
];

/** O que uma ação provoca no resto do colégio: o que torna o fluxo único. */
export const reflexos = [
  { quando: "Alguém pede visita pelo site", entao: "o contato aparece no funil do relacionamento, com tarefa de retorno para o dia útil seguinte." },
  { quando: "O relacionamento lança a bolsa", entao: "a mensalidade estimada já conta o desconto e nasce a tarefa de enviar a proposta." },
  { quando: "A secretaria matricula", entao: "nascem as contas e os vínculos; quando o aluno é maior de idade e responde por si, nasce uma conta só." },
  { quando: "O professor corrige a redação", entao: "o aluno vê a nota de cada competência com o comentário, e o responsável acompanha a entrega." },
  { quando: "O responsável abre um pedido", entao: "entra na fila da gestão com prazo; se vencer, aparece no painel." },
  { quando: "Chega a rematrícula", entao: "a conversa volta para a captação, com o histórico junto." },
];

/** Hipóteses a validar com o Córtex. Vêm da entrevista feita no Colégio Arena e ainda não foram conferidas aqui. */
export const mudancas = [
  { antes: "Redação fotografada, passada para o computador e enviada", depois: "Foto direto do celular, com comprovante e nota por competência" },
  { antes: "Resultado do simulado sem a comparação com o anterior", depois: "Acertos por área e a diferença para o simulado anterior" },
  { antes: "Pedido de visita e inscrição na Prova de Bolsas soltos no WhatsApp", depois: "Formulário do site que cai no funil com dono e prazo" },
  { antes: "Aluno maior de idade cadastrado como filho de alguém", depois: "Uma conta só, de aluno e responsável" },
];
