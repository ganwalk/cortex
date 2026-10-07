# Colégio Córtex: site e Plataforma Córtex

Site de captação e protótipo da plataforma do Colégio Córtex (Ensino Médio e Pré-Vestibular/Enem, Rua T-53, Setor Bueno, Goiânia), com a linguagem visual da marca. Astro (páginas estáticas) e Preact só nas telas da plataforma. A base veio da Plataforma Arena; o que mudou para o Córtex está em [`docs/plataforma.md`](docs/plataforma.md), seção “O que é do Córtex”.

O deploy tem três endereços que formam um fluxo só:

- `/`: página inicial da **Plataforma Córtex**, que explica o caminho completo (site → captação → matrícula → responsável → aluno → professor → gestão) e abre cada etapa já como a pessoa certa.
- `/site/`: o site de captação do colégio (etapa 1). O formulário “Agende uma visita” tem três caminhos (visita, Prova de Bolsas ou dúvidas sobre a matrícula), pode ser preenchido pelo aluno ou pelo responsável e cria o contato no funil do CRM.
- `/plataforma/`: o protótipo de alta fidelidade da **Plataforma Córtex**: portais do aluno, do professor, do responsável, da gestão e da captação (CRM), alternáveis na mesma conta, com dados fictícios. Detalhes, personas, mapa de telas e o caminho para produção em [`docs/plataforma.md`](docs/plataforma.md).

## Rodar

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # gera dist/
npm run check    # tipos e diagnósticos do Astro
npm test         # regras da plataforma e verificação de texto (vitest)
npm run textos   # só a verificação de texto, com avisos
npm run telas    # recaptura as telas da página inicial (com o servidor ligado)
```

Regras de texto e de contribuição: [`CLAUDE.md`](CLAUDE.md).

## Publicar na Vercel

1. Na Vercel, **Add New → Project** e importe o repositório `ganwalk/cortex`.
2. A Vercel detecta o Astro pelo `vercel.json`. Não é preciso configurar variáveis de ambiente.
3. Cada push gera uma URL de preview; o branch de produção é o padrão do repositório.

## Direção de design

- **Cor:** marinho da marca (`#0A1D3B`) como base escura; verde-água (`#00959A`, e `#007479` para texto e botões, por contraste) como única cor de ação; amarelo (`#FBD953`) só como destaque pontual, no sublinhado, como nas peças da campanha. Neutros frios puxados para o marinho. As cores foram tiradas do logotipo e da peça da Prova de Bolsas.
- **Tipo:** Montserrat, geométrica e pesada como os títulos das campanhas. Títulos em peso 800. A fonte oficial da marca não foi confirmada.
- **Estrutura:** a folha do gabarito do símbolo (girada 49°, com o quadrado verde-água atrás, a moldura em U e o X) e as ondas da camiseta do colégio. Grid de 12 colunas e filetes finos.

### Hero

O site abre com a hero dentro de uma moldura branca arredondada, e o menu é a faixa de cima dessa moldura. Ao rolar, a moldura se fecha e o menu vira uma barra flutuante. O título é a frase da campanha (“Você já sabe onde quer chegar. Agora escolha onde vai começar.”). Uma aluna da foto da campanha entra no lugar da folha marinho do símbolo; o X fica no canto, sobre o verde-água. A foto original é pequena (o recorte tem 510 px de largura); com a foto em alta resolução, a hero fica mais nítida. O quadrado e o X entram por último, como quem marca a resposta; `prefers-reduced-motion` desliga a animação.

### Seções

- **Turmas:** a escolha da série imita uma linha de gabarito (bolhas que recebem o X) e acende o cartão da turma: 1ª, 2ª e 3ª série e Extensivo.
- **Agende uma visita:** formulário com visita (padrão), Prova de Bolsas ou dúvidas. A Prova de Bolsas aparece num bloco próprio, com os dados da peça da campanha. Quando a série é o Extensivo, a opção da prova fica desligada, com o motivo escrito.
- **Simulado, redação e plantão:** abas com o que aparece nas peças do colégio (UFG Express, redação, plantão, Vestibulando Cast, eventos) e como cada coisa funciona na plataforma.
- **Onde fica:** endereço, telefones, WhatsApp e redes.

## Marca

- `public/brand/simbolo.svg` e `simbolo-branco.svg`: vetor **provisório**, redesenhado em formas geométricas a partir dos PNGs de `referencias/`. Fiel nas proporções, mas não é o arquivo oficial.
- O nome “Colégio Córtex” é texto em Montserrat (`src/components/Logo.astro`), não um desenho do logotipo. Trocar pelo vetor oficial assim que existir.
- `referencias/`: as peças usadas como fonte (logotipos, Prova de Bolsas, Vestibular UEG, Dia do Amigo, avatar e um print do feed do Instagram).

## Fotos

`public/img/CREDITOS.md` lista a origem de cada foto. A da hero é um recorte da campanha da Prova de Bolsas do colégio. As outras são do Pexels e mostram pessoas que não são do Córtex: servem para a demonstração e devem ser trocadas por fotos do colégio.

## Dados

| Arquivo | Origem |
|---|---|
| `src/data/site.ts` | Instagram @colegio.cortex (bio, destaques e feed), linkme.bio/colegio.cortex e a peça da Prova de Bolsas, coletados em 07/10/2026. O site colegiocortex.com.br estava fora do ar (erro de certificado). |
| `src/plataforma/dominio/semente.ts` | Pessoas, notas, redações, simulados e contatos fictícios. |

## Pendências para validar com o colégio

- **Logotipo e fonte oficiais.** O símbolo foi redesenhado a partir de PNGs pequenos e a fonte é uma escolha próxima.
- **Turmas e turnos.** Os nomes (1ª série A, Extensivo A), turnos e horários da demonstração são fictícios. Existe Semiextensivo ou turma de Medicina?
- **Prova de Bolsas.** Datas da próxima edição, local da prova e como sai o resultado. O site não cita datas.
- **Frase da hero.** “Você já sabe onde quer chegar. Agora escolha onde vai começar.” vem da peça da Prova de Bolsas. Confirmar se pode abrir o site.
- **Simulados.** O UFG Express aparece no feed; confirmar o que é, para quais turmas e qual sistema corrige os simulados hoje.
- **Plantão e redação.** A escala de plantão e o plantão de Redação são suposições a partir do feed (“Seu bloqueio na redação tem solução”).
- **Sistemas atuais.** Livro digital, financeiro e simulados: os atalhos em “Serviços externos” apontam para o site do colégio até haver os endereços certos.
- **Sistema de ensino.** Uma peça do feed mostra a marca Bernoulli ao lado da do Córtex. O site não menciona; confirmar antes de citar.
- **Mensalidades.** Os valores usados nas estimativas do CRM são fictícios.
- **Dores.** As do antes e depois e de `docs/plataforma.md` são hipóteses vindas do Arena; falta conversar com alunos, professores e secretaria do Córtex.

## Texto

Todo texto segue as regras de [`CLAUDE.md`](CLAUDE.md), adaptadas do [no-ai-slop](https://github.com/petergyang/no-ai-slop), e passa por `npm run textos`. Frases das campanhas do colégio ficam como estão nas peças.
