# Plataforma Córtex: protótipo de alta fidelidade

Um só endereço (`/plataforma/`), cinco portais: **Aluno**, **Professor**, **Responsável**, **Gestão** e **Captação (CRM)**. Fica no mesmo deploy do site. Quem tem mais de um papel troca de portal pela barra de cima (ou com `Alt+1…5`) sem sair da conta.

Todas as telas funcionam com dados fictícios. As ações (corrigir redação, entregar, entrar na fila, marcar visita, inscrever na Prova de Bolsas, matricular…) passam pelas mesmas regras de permissão que o backend vai usar, então o protótipo serve para teste de uso e também como especificação para a construção.

A base veio da Plataforma Arena. O que mudou para o Córtex está em “O que é do Córtex”, logo abaixo.

## O que é do Córtex

O Córtex, no Setor Bueno, tem Ensino Médio (1ª a 3ª série) e pré-vestibular (Extensivo). A captação chega por visita, pela Prova de Bolsas e por pedidos de informação, e parte dos alunos do Extensivo é maior de idade. A plataforma foi ajustada a isso:

- **Turmas e etapas.** Só Ensino Médio e pré-vestibular, numa unidade (Rua T-53). Sem Infantil nem Fundamental.
- **Visita, Prova de Bolsas ou dúvidas.** O formulário do site tem os três caminhos, com a visita como padrão; cada um cai no funil com a sua etiqueta e tarefa de retorno.
- **Prova de Bolsas no funil.** Quando o caminho é a prova, o CRM marca a data, lança o desconto conquistado (0 a 100%) e recalcula a mensalidade estimada. A prova só vale para a 1ª, a 2ª e a 3ª série, como na peça da campanha; para o Extensivo, o caminho é a visita. Estágios: Novo contato, Em conversa, Visita ou prova marcada, Visitou ou fez a prova, Proposta enviada, Matriculado, Perdido.
- **Quem preenche pode ser o aluno.** O formulário do site e o cadastro do CRM aceitam “Próprio aluno” como contato. Na matrícula, esse aluno ganha uma conta só, com os papéis de aluno e de responsável e um vínculo de responsável com ele mesmo. A regra de acesso é a mesma de qualquer responsável: ele recebe os avisos das famílias e abre solicitações sobre a própria matrícula. O portal se chama **Responsável** e fala com mãe, pai, avó ou o próprio aluno.
- **Redação por competência.** Tarefa de Redação pode ser corrigida pelas cinco competências do Enem (0 a 200 cada, em passos de 40). O aluno vê a nota total, a barra de cada competência e o comentário; o professor não consegue lançar a nota sem as cinco.
- **Simulados por área.** Cada simulado guarda os acertos em Linguagens, Ciências Humanas, Ciências da Natureza e Matemática (45 questões cada, como no Enem) e a nota da redação. O aluno e o responsável veem a evolução de um simulado para o outro; a gestão vê a média de acertos de cada turma, por área. O Extensivo não tem boletim por bimestre e é acompanhado só pelos simulados.
- **Plantão de Redação** entra na escala, ao lado de Biologia, Matemática, Física e História.

## Endereços e o fluxo único

| Endereço | O que é |
|---|---|
| `/` | Página inicial da Plataforma Córtex: o fluxo em sete etapas, o que uma ação muda nas outras telas, os módulos com telas reais e as hipóteses do antes e depois. Cada etapa abre o protótipo já como a pessoa certa (`/plataforma/?como=u-thiago#/crm`). |
| `/site/` | Site de captação do colégio (etapa 1). O formulário “Agende uma visita” (visita, Prova de Bolsas ou dúvidas) chama `pedirPeloSite`, que cria contato, aluno, oportunidade e tarefa de retorno no funil. Depois do envio, um link leva ao contato no CRM. |
| `/plataforma/` | Os cinco portais. |

As imagens de produto da página inicial (`public/plataforma/telas/`) são capturas do próprio protótipo, nos dois temas. Para regenerar depois de mudar as telas, rode `npm run telas` com o servidor ligado.

## Como abrir

```sh
npm run dev      # http://localhost:4321/plataforma/
npm test         # regras e critérios de aceite (vitest)
```

Na entrada, escolha uma pessoa. No menu da pessoa (canto superior direito) dá para:

- **Ver como** outra persona, sem sair;
- **Simular estados**: sem conexão e sessão expirada;
- **Restaurar dados** para a semente original.

Os dados ficam no `localStorage` do navegador e são compartilhados entre abas. Com o aluno numa aba e o professor em outra, a fila do plantão e as entregas aparecem nas duas.

### Personas

| Pessoa | Papel | Portais | Bom para mostrar |
|---|---|---|---|
| Gustavo Lemos | Aluno, 3ª série A | Aluno | Redação corrigida por competência, último simulado, plantão |
| Isabela Martins | Aluna, 1ª série A, bolsista | Aluno | Tarefa com foto pelo celular e comprovante, boletim |
| Larissa Fontes | Aluna do Extensivo A, maior de idade | Aluno, Responsável | Uma conta que responde pela própria matrícula; simulados sem boletim |
| Simone Martins | Mãe da Isabela | Responsável | Ciência de avisos, pergunta sobre a bolsa, atendimento com prazo |
| Otávio Nunes | Professor de História **e** pai do Gabriel | Professor, Responsável | Troca de portal; publicar; rascunho |
| Carolina Campos | Professora de Redação | Professor | Correção pelas cinco competências, plantão de redação |
| Renata Lima | Professora de Biologia | Professor | Fila do plantão ao vivo |
| Wagner Prado | Professor de Matemática | Professor | Material retirado, link de vídeo |
| Diego Costa | Professor de Física | Professor | Material de uma turma só |
| Adriana Alves | Coordenação pedagógica | Gestão | Painel com simulados por turma, retirada com justificativa, avisos |
| Tatiane Reis | Secretaria | Gestão, Captação | Atendimento, vínculos e **matrícula** |
| Mirela Siqueira | Direção | Gestão, Captação | Visão geral e funil |
| Thiago Teixeira | Relacionamento e matrículas | Captação | Funil, visitas, Prova de Bolsas e tarefas |

## Interface

- **Cor pontual.** A base é neutra (marinho da marca, cinzas frios, branco). O verde-água aparece só na ação principal de cada tela, nos links, no foco do teclado, no marcador da seção ativa e nas barras de nota. Verde, âmbar e vermelho só indicam estado: um ponto no selo ou um número que exige atenção, sempre com texto ao lado. Nada depende só de cor; cada barra de competência ou de área tem o número ao lado.
- **Claro e escuro.** Tokens semânticos em `plataforma.css` (`--fundo`, `--sup`, `--texto`, `--linha`, `--acao`…), com uma paleta escura própria, puxada para o marinho. Segue o sistema por padrão; o botão de sol/lua na barra e o menu da pessoa (“Aparência”) fixam claro, escuro ou automático. A escolha é aplicada antes da primeira pintura, sem piscar.
- **Pessoas com rosto.** Retratos de exemplo do Pexels (licença livre), guardados em `public/plataforma/pessoas/` com a lista de origem em `CREDITOS.md`. Sem foto, o avatar mostra as iniciais. Em produção, a foto vem do cadastro do colégio, com a autorização devida; os retratos de exemplo não devem ir para o ar.
- **Acessibilidade.** Alvos de toque de 44 px, foco visível, rótulos em todos os campos, estados anunciados (`aria-live`, inclusive a soma da nota da redação enquanto o professor escolhe as competências), navegação por teclado e `prefers-reduced-motion`. O contraste foi escolhido para AA nos dois temas, ainda sem medição com ferramenta.

## Dores: hipóteses a validar

O Arena teve um dossiê com entrevistas da equipe. O Córtex ainda não. As dores abaixo vêm do Arena e da rotina típica de quem faz Enem e vestibular; ficam como hipóteses até conversar com alunos, professores e secretaria do Córtex.

| Hipótese | Na plataforma |
|---|---|
| Redação fotografada, passada para o computador e enviada por outro canal | Foto direto do celular, com comprovante e protocolo; nota por competência com comentário |
| Resultado do simulado sem a comparação com o anterior | Acertos por área e a diferença para o simulado anterior; média da turma para a coordenação |
| Pedido de visita e inscrição na Prova de Bolsas soltos no WhatsApp, sem dono nem prazo | Formulário do site que cai no funil com tarefa de retorno; data da prova e resultado da bolsa no CRM |
| Aluno maior de idade cadastrado como filho de alguém | Uma conta só, de aluno e responsável |
| Plantão sem saber a posição na fila | Fila no mesmo app, individual ou em grupo, posição ao vivo |
| Avisos sem confirmação de leitura | Aviso por turma ou escola, com ciência opcional e adesão medida |
| Pedido à escola pelo WhatsApp pessoal do professor | “Fale com a escola”: protocolo, setor, prazo de resposta e histórico |

## Mapa de telas

**Aluno** (celular primeiro): Início (para fazer, materiais novos, plantões de hoje, último simulado, avisos) · Materiais (lista, filtro, busca, detalhe, leitor) · Tarefas (lista, entrega com foto, comprovante, nota da redação por competência, reenvio) · Plantões (fila individual/grupo, posição, próximos dias) · Notas e simulados (boletim no Médio, simulados por área) · Avisos e agenda.

**Professor**: Hoje · Materiais (publicados/rascunhos/retirados; publicar com revisão dos destinatários; corrigir com nova versão; retirar com motivo; histórico) · Tarefas (nova tarefa, com a opção de correção por competência em Redação; entregas por aluno; lançar nota ou devolver) · Plantão (fila ao vivo, chamar próximo, escala) · Avisos (para as próprias turmas, com ciência) · Turmas (situação das tarefas por aluno).

**Responsável**: Resumo por aluno (tarefas, disciplinas abaixo da média, último simulado) · Avisos (com ciência) · Notas e simulados · Tarefas (acompanhamento) · Agenda · Fale com a escola (nova solicitação, conversa, prazos por setor). Seletor de aluno quando há mais de um. Para o aluno que responde por si, os textos falam com ele.

**Gestão**: Painel (materiais na semana, entrega no prazo, plantão, atendimento vencido, ciência dos avisos, acertos por área no último simulado, alunos para acompanhar) · Turmas e pessoas (busca, vínculos, mudar turma, saída) · Atendimento (fila por prazo) · Avisos (escola ou turmas) · Materiais (retirar com justificativa) · Plantões (escala e movimento) · Serviços externos (catálogo de atalhos) · Auditoria.

**Captação (CRM)**: Funil kanban (arrastar ou “Mover para”, filtros por etapa e responsável, selos de prova, visita e bolsa, alertas de tarefa vencida e de oportunidade parada) · Novo contato (família ou próprio aluno; série de 1ª a Extensivo) · Contato (linha do tempo, WhatsApp, aluno, oportunidade, inscrever na Prova de Bolsas, lançar resultado, marcar visita, perdido com motivo, matricular) · Tarefas (atrasadas, hoje, próximas) · Relatórios (Prova de Bolsas, por estágio, origem, motivo de perda, etapa).

### Estados cobertos

Lista vazia · filtro sem resultado · envio em andamento · arquivo recusado (formato, tamanho, extensão falsa) · falha de rede no envio com “tentar de novo” · sem conexão (nada é salvo) · sessão expirada · material retirado (com motivo) · material de outra turma · material inexistente · arquivo indisponível · link externo · prazo vencido · reenvio bloqueado · redação sem as cinco notas · aluno sem simulado corrigido · plantão encerrado · sem plantão hoje · responsável sem aluno vinculado · Prova de Bolsas pedida para o Extensivo · resultado da prova antes da inscrição · ação sem permissão (ex.: relacionamento tentando matricular).

## Como o código está organizado

```
src/plataforma/
  dominio/            ← vira o backend
    tipos.ts          entidades (tabelas)
    regras.ts         leitura e permissão (policies), competências, simulados, séries
    acoes.ts          mudanças, com validação e auditoria (rotas/serviços)
    semente.ts        dados fictícios (seed)
    regras.test.ts    critérios de aceite
  estado/
    loja.ts           banco local + rotas por hash  ← trocar por chamadas à API
    arquivos.ts       IndexedDB                      ← trocar por bucket privado com URL temporária
  ui/                 componentes (botão, estado vazio, janela, envio de arquivos, leitor, nota da redação, tabela de simulados…)
  portais/            Aluno, Professor, Pais (Responsável), Gestao, Crm
  App.tsx             casca: barra, troca de portal e de pessoa
  plataforma.css      tema (tokens do site)
src/pages/plataforma/index.astro
```

`dominio/` não depende de navegador nem de Preact. A troca para produção é:

1. Cada função de `acoes.ts` vira uma rota (`POST /api/entregas`, `POST /api/captacao/prova`…). O servidor carrega o estado necessário do banco, chama a mesma função e grava o resultado numa transação. A assinatura `(banco, atorId, dados, agora) → Resultado` já isola quem age e o relógio.
2. As consultas de `regras.ts` viram as rotas de leitura e as políticas de acesso. `acessoMaterial` é revalidada a cada abertura de arquivo antes de emitir a URL temporária.
3. `loja.executar` passa a fazer `fetch`; a interface não muda.
4. `tipos.ts` vira o esquema. Ex.: `Entrega.retorno.competencias` → colunas `c1`…`c5` em `correcoes_redacao`; `Simulado.resultados` → `resultados_simulado` com uma linha por aluno e área.

### Ações (futuros endpoints)

| Área | Ações |
|---|---|
| Materiais | `criarMaterial` (com chave idempotente), `editarRascunho`, `corrigirMaterial` (nova versão, nota obrigatória), `retirarMaterial` (motivo obrigatório), `excluirRascunho` |
| Tarefas | `criarTarefa` (Redação pode exigir competências), `enviarEntrega` (chave idempotente, só com anexos prontos, protocolo), `avaliarEntrega` (conferir, devolver ou lançar as cinco competências) |
| Plantão | `entrarNaFila` (grupo numa posição), `sairDaFila` (sai só quem pediu), `chamarProximo` |
| Comunicação | `publicarAviso` (escola só pela coordenação/secretaria), `darCiencia` |
| Atendimento | `abrirSolicitacao` (só sobre aluno vinculado, inclusive o próprio; prazo por setor em dias úteis), `responderSolicitacao` |
| Gestão | `moverAluno` (encerra vínculo e abre outro), `alternarServico`, `salvarServico` |
| CRM | `pedirPeloSite` (aluno ou responsável; visita, prova ou informações; prova só de 1ª a 3ª série), `criarLead`, `moverOportunidade` (perda exige motivo), `agendarVisita`, `inscreverNaProva`, `registrarBolsa` (0 a 100%, recalcula a mensalidade), `anotarCrm`, `criarTarefaCrm`, `concluirTarefaCrm`, `matricular` (cria aluno, responsável e vínculos; uma conta só quando o aluno responde por si) |

### Matriz de acesso implementada

| Papel | Pode | Não pode |
|---|---|---|
| Aluno | Ver materiais, tarefas, simulados e avisos das turmas com vínculo vigente; entregar; entrar na fila | Abrir material de outra turma, mesmo pelo endereço; ver entregas ou simulados de colegas |
| Professor | Publicar, passar tarefa e avisar só nas turmas/disciplinas em que ensina; corrigir e retirar o que é seu; conferir e corrigir entregas das suas tarefas; chamar a própria fila | Publicar em outra turma ou disciplina; editar material de colega |
| Responsável | Ver avisos, notas, simulados, tarefas e agenda dos alunos com vínculo ativo; abrir solicitações sobre eles | Ver qualquer aluno sem vínculo explícito |
| Aluno que responde por si | Tudo do aluno e do responsável, sobre a própria matrícula | Ver outros alunos |
| Coordenação | Tudo da gestão; retirar qualquer material com justificativa; avisos para a escola | Matricular (secretaria) |
| Secretaria | Gestão, CRM e matrícula | Publicar materiais e tarefas (é do professor) |
| Relacionamento | CRM, inscrição e resultado da Prova de Bolsas | Matricular; gestão escolar |

## O que falta para produção

- **Validação com o colégio**: as hipóteses de dor, os nomes das turmas, a escala de plantão e o formato dos simulados (ver “Pendências” no README).
- **Backend**: Postgres + armazenamento privado de arquivos; autenticação (com MFA para quem administra); as ações acima como rotas transacionais.
- **Cadastro real**: importação de turmas, alunos, professores e responsáveis (CSV no piloto), com rotina de atualização e saída. Alunos maiores de idade entram com o vínculo de responsável com eles mesmos.
- **Simulados**: importar o resultado do sistema de correção que o colégio usa (planilha ou integração), por aluno e área.
- **Notificações**: push/e-mail para aviso novo, tarefa, nota de redação, resultado de simulado, chamada no plantão e resposta de atendimento.
- **Site → CRM em produção**: no protótipo, o formulário do site grava no banco local; em produção, chama a mesma ação por uma rota pública com proteção contra spam.
- **LGPD e ECA Digital**: registro de finalidades, retenção e responsáveis antes de usar dados reais. Alunos menores de idade continuam sob o vínculo do responsável legal.
- **Valores de exemplo**: mensalidades usadas nas estimativas do CRM, endereços dos serviços externos e prazos de resposta por setor são fictícios, a confirmar com o colégio.
