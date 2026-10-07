/*
  Conteúdo institucional do site. Fontes: perfil @colegio.cortex no Instagram (bio, destaques e peças do feed,
  coletados em 07/10/2026), linkme.bio/colegio.cortex e a peça da Prova de Bolsas em referencias/.
  O site colegiocortex.com.br estava fora do ar na coleta (erro de certificado). O que falta confirmar com o
  colégio está em "Pendências" no README.
*/
export const SITE_ATUAL = "https://colegiocortex.com.br";

export const WHATSAPP = "5562985586808";
export const WHATSAPP_ROTULO = "(62) 98558-6808";

export const unidade = {
  nome: "Colégio Córtex",
  segmentos: "Ensino Médio e Pré-Vestibular/Enem",
  endereco: "Rua T-53, 929, Qd. 98, Lt. 22/24",
  bairro: "Setor Bueno, Goiânia (GO)",
  cep: "74215-150",
  telefones: ["(62) 3251-3477", "(62) 3251-3116"],
  mapa: "https://www.google.com/maps/search/?api=1&query=Col%C3%A9gio+C%C3%B3rtex+Rua+T-53+929+Setor+Bueno+Goi%C3%A2nia",
};

/** Frase da campanha da Prova de Bolsas, como está na peça. */
export const CAMPANHA = { linha1: "Você já sabe onde quer chegar.", linha2: "Agora escolha onde vai começar." };

/** Dados da Prova de Bolsas que a peça da campanha publica. As datas mudam a cada edição e ficam com a secretaria. */
export const PROVA_DE_BOLSAS = {
  desconto: "até 100%",
  series: "1ª, 2ª e 3ª séries do Ensino Médio",
  inscricao: "grátis",
};

/**
 * As turmas que o site oferece. O id é o mesmo de SERIES na plataforma, para o pedido cair no funil certo.
 * `para` diz quem entra em cada uma; nada de carga horária ou turno até o colégio confirmar.
 */
export const turmas = [
  {
    id: "1a",
    nome: "1ª série",
    etapa: "Ensino Médio",
    para: "Para quem termina o 9º ano em 2026.",
    texto: "O primeiro ano do Ensino Médio. Quem vem de outra escola pode entrar com desconto pela Prova de Bolsas.",
    provaDeBolsas: true,
  },
  {
    id: "2a",
    nome: "2ª série",
    etapa: "Ensino Médio",
    para: "Para quem termina a 1ª série em 2026.",
    texto: "O segundo ano do Ensino Médio. A Prova de Bolsas também vale para quem entra na 2ª série.",
    provaDeBolsas: true,
  },
  {
    id: "3a",
    nome: "3ª série",
    etapa: "Ensino Médio",
    para: "Para quem termina a 2ª série em 2026.",
    texto: "O ano do Enem e dos vestibulares. A Prova de Bolsas também vale para quem entra na 3ª série.",
    provaDeBolsas: true,
  },
  {
    id: "extensivo",
    nome: "Extensivo",
    etapa: "Pré-vestibular",
    para: "Para quem já terminou o Ensino Médio.",
    texto: "Um ano de pré-vestibular para o Enem e os vestibulares. A matrícula pode ser feita pelo próprio aluno maior de idade.",
    provaDeBolsas: false,
  },
] as const;

/** O dia a dia que aparece nas peças e nos destaques do Instagram do colégio. */
export const rotina = [
  {
    id: "simulados",
    nome: "Simulados",
    titulo: "Simulados com resultado por área",
    texto: "O UFG Express é um dos simulados do Córtex. Na plataforma, cada simulado mostra os acertos em Linguagens, Ciências Humanas, Ciências da Natureza e Matemática, e a diferença para o simulado anterior.",
    foto: "/img/simulado",
    alt: "Mão com lápis preenchendo um gabarito de múltipla escolha",
  },
  {
    id: "redacao",
    nome: "Redação",
    titulo: "Redação no modelo do Enem",
    texto: "O aluno fotografa a folha de redação pelo celular e recebe um comprovante. A correção sai pelas cinco competências do Enem, com a nota de cada uma e o comentário do professor.",
    foto: "/img/redacao",
    alt: "Estudante escrevendo à mão numa folha pautada",
  },
  {
    id: "plantao",
    nome: "Plantão",
    titulo: "Plantão de dúvidas com fila pelo celular",
    texto: "O aluno entra na fila do plantão sozinho ou com colegas, escreve a dúvida e acompanha a posição sem ficar parado na porta da sala.",
    foto: "/img/plantao",
    alt: "Três estudantes estudando juntos com um livro aberto",
  },
  {
    id: "cast",
    nome: "Vestibulando Cast",
    titulo: "Vestibulando Cast",
    texto: "O podcast do Córtex sobre vestibular, com episódios no YouTube e no Spotify.",
    foto: "/img/podcast",
    alt: "Jovem gravando um podcast com microfone",
    links: [
      { rotulo: "Ouvir no YouTube", href: "https://www.youtube.com/@Col%C3%A9gioC%C3%B3rtex" },
      { rotulo: "Ouvir no Spotify", href: "https://open.spotify.com/episode/4xYvexrFurzSJDshyl8cTl" },
    ],
  },
  {
    id: "escola",
    nome: "Na escola",
    titulo: "Júri simulado, Jogos Córtex e Festa Junina",
    texto: "O calendário tem júri simulado literário, os Jogos Córtex e a Festa Junina, além das aulas.",
    foto: "/img/turma",
    alt: "Estudantes sorrindo em volta de uma mesa com livros",
  },
] as const;

export const acessos = [{ rotulo: "Plataforma Córtex (protótipo)", href: "/" }];

export const conteudos = [
  { rotulo: "Blog", href: `${SITE_ATUAL}/blog/` },
  { rotulo: "E-books", href: "https://conteudo.colegiocortex.com.br/lp-compilacao-materiais-ricos" },
  { rotulo: "Fale conosco", href: `${SITE_ATUAL}/contato/` },
];

export const redes = [
  { rotulo: "Instagram", href: "https://www.instagram.com/colegio.cortex/" },
  { rotulo: "YouTube", href: "https://www.youtube.com/@Col%C3%A9gioC%C3%B3rtex" },
  { rotulo: "Facebook", href: "https://www.facebook.com/cortex.vestibulares.ensinomedio/" },
];
