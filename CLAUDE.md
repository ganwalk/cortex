# Regras do repositório

Valem para qualquer pessoa ou agente que escreva aqui. O projeto está descrito em `README.md` e `docs/plataforma.md`.

## Língua e contexto

- Português do Brasil em tudo: interface, dados, comentários, commits e documentação.
- Quem lê: alunos, famílias, professores e a equipe do Colégio Córtex, no Setor Bueno, em Goiânia. O Córtex tem Ensino Médio e pré-vestibular; parte dos alunos do pré-vestibular é maior de idade e cuida da própria matrícula. Escreva para essa pessoa, com o vocabulário da escola: turma, série, Extensivo, simulado, redação, plantão, Prova de Bolsas, coordenação, secretaria.
- Frases das campanhas do colégio (como “Você já sabe onde quer chegar.”) ficam como estão nas peças. As peças de referência estão em `referencias/`.
- Pessoas e dados da demonstração são fictícios. Não use nomes de alunos ou funcionários reais nem invente números do colégio.

## Regras de texto

Adaptadas de [no-ai-slop](https://github.com/petergyang/no-ai-slop) (Peter Yang, licença MIT). Toda página, rótulo, mensagem de erro, dado de exemplo, comentário e documento passa por elas.

### Princípios

1. **Diga o fato.** Nomes, números, datas, prazos e o mecanismo valem mais que adjetivos. “Reduz o retrabalho” vira “a foto vai direto do celular, sem passar pelo computador”.
2. **Teste da portabilidade.** Se a frase serve igual para outra escola ou outro produto, ela é enchimento. Corte ou troque por algo que só vale aqui.
3. **Não invente.** Nada de prazo, estatística, depoimento ou promessa que o colégio não deu. Se falta a fonte, pergunte ou deixe marcado como pendência.
4. **Mostre, não comente.** Corte frases que dizem ao leitor que algo é importante, surpreendente ou óbvio. Os fatos fazem esse trabalho.
5. **Voz ativa, com gente fazendo a ação.** “A secretaria matricula”, não “a matrícula é realizada”. Coisas não decidem nem entregam nada.
6. **Verbo direto.** “Decidir”, não “tomar uma decisão”; “pode”, não “tem a capacidade de”; “usar”, não “utilizar”.
7. **Repita a palavra certa.** Se é “turma”, continue chamando de turma. Não alterne sinônimos por estilo.
8. **Mexa o mínimo.** Ao revisar, corrija o que quebra a regra e deixe as frases boas como estão.

### Palavras que não entram

alavancar, potencializar, empoderar, mergulhar em, robusto, de ponta, divisor de águas, mudança de paradigma, revolucionar, transformador, jornada (como metáfora), sinergia, multifacetado, meticuloso, intrincado, primordial, em constante evolução, turbinar, elevar o nível, embarcar em, farol, tapeçaria, fomentar, utilizar.

Advérbios que quase sempre sobram: simplesmente, literalmente, realmente, verdadeiramente, fundamentalmente, essencialmente, basicamente, honestamente. Fique com eles só quando mudam o sentido.

Frases vazias: vale ressaltar, é importante notar, no fim das contas, quando se trata de, em sua essência, nos dias de hoje, a verdade é que, no que diz respeito a, a fim de, daqui para frente, neste artigo.

### Padrões que não entram

- **Contraste binário.** “Não é X, é Y”, “não só X, mas Y”, “sai X, entra Y”. Diga Y.
- **Lista negativa.** “Não é um app. Não é um site. É uma plataforma.” Diga o que é.
- **Dois-pontos de revelação.** “O segredo: um cadastro só.” Escreva a frase inteira. Dois-pontos servem para rótulos, listas e citações.
- **Abertura de rodeio e falsa revelação.** “O fato é que”, “o que ninguém te conta”, “a parte que todo mundo esquece”.
- **Pergunta retórica.** “Mudou de turma? Ajuste aqui.” vira “Quando o aluno muda de turma, ajuste aqui.”
- **Gerúndio que finge explicar.** “…, reforçando o compromisso com a qualidade.” Diga a consequência concreta.
- **Importância inflada e atribuição vaga.** “Marca um momento histórico”, “desempenha um papel fundamental”, “especialistas afirmam”. Diga o fato ou cite a fonte.
- **Slogan em fragmento e fecho de efeito.** “Menos caminhos, mais escola.” Títulos dizem o que a seção mostra; o texto termina no último fato ou na próxima ação.
- **Resumo no fim.** “Em resumo”, “em conclusão”. O leitor acabou de ler.
- **Forma enfeitada.** Emoji, negrito no meio da frase para dar ênfase, tópicos onde duas frases bastam, título sobre seção de duas linhas.
- **Travessão (—).** Não use. Vírgula, ponto, parênteses ou dois-pontos resolvem.

### Interface

- Botões dizem a ação: “Enviar entrega”, “Entrar na fila”, “Matricular”.
- Mensagens de erro dizem o que aconteceu e o que fazer em seguida. Nunca “erro desconhecido”.
- Estados vazios dizem quando algo vai aparecer ali.
- Cor nunca carrega sozinha uma informação; sempre há texto ao lado.

## Verificação

- `npm run textos` lista erros e avisos de texto. Os erros também quebram o `npm test`.
- Uma ocorrência legítima (código, citação) leva `textos-ok` num comentário na mesma linha.
- O verificador pega palavras e fórmulas; o resto (fato inventado, frase que serve para qualquer escola) depende de leitura. Antes de publicar texto novo, releia com a lista acima.

## Outras regras

- `npm test`, `npm run check` e `npm run build` passam antes de cada commit.
- Commits vão direto na `main`, com mensagem em português que diga o que mudou.
- Visual: siga “Direção de design” no README e “Interface” em `docs/plataforma.md` (cor pontual, tema claro e escuro, alvos de 44 px).
