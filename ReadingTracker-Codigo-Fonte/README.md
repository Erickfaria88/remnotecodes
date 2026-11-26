# Reading Tracker

Organize suas leituras, revisões e exercícios dentro do RemNote. Veja onde parou em cada aula, quanto falta para terminar e quais materiais pode estudar no tempo disponível.

Na versão 0.1.19, escolha revisão por bloco, por disciplina ou por aula. Os blocos permitem selecionar matérias e quantidades; ao encerrar, confira o resumo de questões antes de confirmar qualquer registro nos exercícios.

O progresso dos PDFs é informado por você. Você pode manter seus PDFs externos e usar as aulas que já organizou no RemNote.

## Instalar e abrir

Instale a versão aprovada pela [página do Reading Tracker](https://www.remnote.com/plugins/reading-tracker). Depois, abra a busca de comandos do RemNote e procure **Abrir Reading Tracker** para usar a barra lateral ou **Abrir Dashboard de Estudos** para abrir o painel em um documento.

A versão publicada funciona pela hospedagem do RemNote. Para utilizá-la, basta ter o plugin instalado e ativado.

## Comece por uma disciplina

1. Organize a disciplina como um documento-pai e cada aula como um documento-filho direto.
2. Na aba **Disciplinas**, busque o nome da disciplina e selecione-a.
3. Escolha uma aula e preencha **Páginas totais** e **Páginas lidas**. Em um PDF de 40 páginas, se você terminou a página 30, informe 40 e 30.
4. Se desejar, marque as etapas concluídas, atribua de 0 a 5 estrelas à importância para a prova e escolha uma data para retomar.
5. Clique em **Salvar estudo**.

Você pode usar os nomes que preferir para os documentos. O plugin associa os registros ao ID da aula. Uma aula sem cadastro aparece como **Sem cadastro**. Ao cadastrar zero páginas lidas, ela passa a ter progresso de 0%.

## As abas do painel

| Aba | Como usar |
| --- | --- |
| **Retomar** | Consulte sugestões, retomadas de hoje, atrasadas e aulas quase concluídas. Clique no título da aula para preencher o estudo no próprio painel. |
| **Disciplinas** | Cadastre o progresso das aulas e organize as disciplinas em Fase 1, Fase 2 e assim por diante. |
| **Revisões** | Consulte revisões agendadas, abra a aula, conclua ou reagende a revisão. |
| **Exercícios** | Selecione uma aula e registre novos acertos e erros junto com os demais campos do estudo. |
| **Concursos** | Cadastre editais, datas, pesos, mínimos e assuntos; vincule aulas e ative os concursos que deseja preparar juntos. |
| **Ajustes** | Defina o tempo diário, o ritmo de leitura e exporte ou restaure um backup JSON. |

O botão **Abrir aula** leva ao documento no RemNote. Ao abrir uma aula pelo dashboard, o painel é recolhido e mantém um botão para expandir novamente. O resumo disponível da aula mostra páginas, etapas e desempenho em questões.

## Preparação normal e pós-edital · versão 0.1.17

O seletor **Preparação** fica acima das abas de conteúdo. **Normal** preserva a preparação contínua por fases. **Pós-edital** substitui as sugestões de Retomar por um plano dos editais ativos e limita Revisões às aulas vinculadas. Trocar o modo não apaga fases, progresso, exercícios ou histórico. O saldo diário é único: estudar no modo normal também consome o tempo disponível no pós-edital.

1. Em **Concursos**, clique em **Cadastrar edital**, informe nome, banca e data da prova. A prioridade entre concursos vai de 1 a 5.
2. Adicione cada disciplina com número de questões e peso por questão. Informe mínimos percentuais, se existirem. Para mínimos por bloco, cadastre o bloco e associe suas disciplinas. Regras gerais e penalizações ficam registradas para consulta; a pontuação líquida não é calculada a partir dos exercícios acumulados.
3. Adicione os assuntos do conteúdo programático. Informe a incidência do levantamento dos professores e sua fonte, ou deixe em branco quando desconhecida. Assuntos devem representar parcelas distintas do levantamento. Um assunto que abrange várias aulas deve ser cadastrado uma vez com todas elas vinculadas.
4. Use **Buscar aulas** para vincular documentos existentes. Confira o documento-pai nos resultados para evitar homônimos. O vínculo usa o ID da aula. Escolha **Essencial**, **Desejável** ou **Se houver tempo** para ajustar a prioridade.
5. Salve o edital e selecione **Pós-edital**. Em Retomar, confira o saldo, a revisão, as sugestões e os avisos de cadastro. Cadastre o ritmo e as páginas na aula para melhorar as estimativas.

Você pode ter dois ou mais editais ativos. Vincule a mesma aula nos editais que compartilham conteúdo. A cobertura é atualizada em todos eles, mas o plano conta a aula e o tempo uma única vez. **Usar como base para outro edital** copia o cadastro em edição, mantendo os vínculos; ajuste data, pesos e conteúdo e salve para criar o novo concurso. Arquivar ou excluir um edital preserva as aulas e os registros. Provas no dia atual ou no passado saem das sugestões.

O plano protege lacunas de preparação em disciplinas com mínimos e depois combina peso, incidência, proximidade da prova, prioridade do concurso, estrelas, retomada, conclusões rápidas e necessidade de questões por minuto. Questões usam meta de acerto e amostra mínima configuráveis, evitando tratar duas questões certas como domínio. O núcleo de 80% é calculado por disciplina e inclui essenciais e disciplinas com mínimos. Totais inconsistentes e incidência parcial ficam sinalizados. Incidência ausente nunca vira cobertura conhecida.

O orçamento usa o tempo e a reserva de revisão de Ajustes (por padrão 270 min: 90 de revisão e 180 de avanço/questões), descontando as sessões registradas. Cada leitura recebe até 30 min e cada bloco de questões até 20 min, com até 60 min por disciplina no plano. Em **Metas de questões e disponibilidade por data**, cadastre exceções de tempo, incluindo zero para folgas. O dia da prova não entra na projeção.

**Cobertura completa** estima a leitura conhecida e uma rodada inicial de questões. **Cobertura prioritária** considera núcleo, essenciais e mínimos. **Plano possível** simula a distribuição diária entre todos os editais ativos e mostra, na data de cada prova, a leitura projetada e o trabalho conhecido que ficou pendente. A simulação não grava progresso futuro; recalcula com os dados reais. Cenários de esforço por prazo incluem os editais com prova até aquele prazo; a projeção diária considera todos os ativos. Aulas compartilhadas não duplicam esforço. Assuntos sem material ou ritmo ficam como lacunas. O horizonte máximo da projeção é 730 dias.

Cobertura significa avanço de leitura ponderado pelos percentuais cadastrados, não domínio, nota prevista ou chance de aprovação. As etapas exigem todas as aulas do assunto concluídas naquela etapa. As questões acumuladas são compartilhadas, sem separação por banca; não comprovam mínimos eliminatórios. Uma rodada sugerida de 20 min não garante domínio. O algoritmo é uma heurística de prioridade e não garante o ótimo matemático. Revisões usam o agendamento nativo e podem variar de duração.

### Dados e atualização

Os cadastros ficam no armazenamento sincronizado do SDK, separados pelo ID da base, e são incluídos no backup JSON. O formato de dados passa para versão 2; backups da versão 1 são lidos e convertidos em memória. A gravação acontece ao salvar uma alteração. Versões antigas do plugin recusam o formato 2, evitando descartar os novos cadastros: atualize todas as máquinas e o código localhost antes de continuar salvando. A chave de armazenamento é mantida para preservar os dados existentes. Não há alterações automáticas em documentos, tags, hierarquia ou flashcards pelo cadastro de editais.

### Verificar no RemNote

Teste primeiro em uma base de testes: cadastre duas provas futuras e vincule uma mesma aula a ambas. Salve páginas e questões pelo formulário e confirme que as duas coberturas mudam, com uma só atividade no plano. Troque para Normal e confira suas fases. Volte para Pós-edital, registre tempo, teste um dia com disponibilidade zero e confira o saldo e as projeções. Exporte e restaure o JSON na mesma base. A importação assistida de edital, os simulados e a comparação entre concursos não fazem parte desta versão.

## Registre exercícios sem perder o total

Preencha **Novos acertos** e **Novos erros** com as questões que acabou de resolver. O plugin soma esses valores ao total já salvo da aula.

Por exemplo, 4 acertos e 1 erro, seguidos de 10 acertos e nenhum erro, resultam em **15 questões, 14 acertos, 1 erro e 93,33% de acerto**.

O botão **Salvar estudo** salva juntos os campos de leitura, importância, etapas, retomada e os novos exercícios preenchidos. Cada novo salvamento com exercícios soma mais questões. Após salvar, os campos de novos exercícios ficam vazios para o próximo registro.

O indicador de questões fica verde a partir de 80%, amarelo de 60% até menos de 80% e vermelho abaixo de 60%.

## Planeje a próxima sessão

Classifique as disciplinas por fase e as aulas por importância. Em **Ajustes**, informe seu ritmo em páginas por hora. Você pode usar um ritmo global e definir outro para uma disciplina específica.

As sugestões consideram importância, fase e tempo estimado para terminar a leitura. A lista diversifica as disciplinas e permite repetições quando o tempo acumulado da mesma disciplina cabe em 60 minutos.

O tempo diário inicial é **4,5 horas** e pode ser alterado em **Ajustes**. A previsão de conclusão usa as páginas restantes, o ritmo informado e esse tempo diário. Materiais sem cadastro ou sem estimativa suficiente precisam ser preenchidos para uma previsão mais completa.

## Agende uma revisão ou retomada

Para continuar uma leitura depois, escolha a **Data de retomada** ou **Retomar amanhã** e salve o estudo.

Para revisar um trecho, abra **Adicionar estudo à agenda**, informe a data em que estudou, a página inicial, a final e quantos dias deseja esperar. Clique em **Agendar revisão**. A revisão aparecerá na aba **Revisões**. Use intervalo de 1 dia para uma revisão no dia seguinte. O agendamento do plugin é manual e as sessões de flashcards continuam seguindo o agendador do RemNote.

Depois de salvar uma retomada futura, você pode preparar um evento para o Google Calendar ou baixar um lembrete .ics. Confira e salve o evento no calendário escolhido. Alterações posteriores na data precisam ser ajustadas também no calendário.

## Seus registros e o backup

Os dados usam o armazenamento sincronizado do SDK do RemNote, com registros separados pelo ID da base e pelo ID da aula. Para usar em outro dispositivo, entre na mesma conta e base, ative o mesmo plugin e aguarde a sincronização.

Em **Ajustes → Backup JSON**, exporte uma cópia dos registros. Para restaurar, selecione o arquivo e confira a confirmação. A restauração substitui os dados do Reading Tracker daquela base. O arquivo deve pertencer à mesma base.

O cadastro de leitura e exercícios preserva o conteúdo das aulas, flashcards, tags e hierarquia. A criação do documento do dashboard e o envio de tarefas para a Nota de hoje ocorrem pelas ações correspondentes do painel.

## Versão 0.1.5

Esta versão inclui exercícios acumulados por aula, quantitativo de questões, formulário completo acessível por Retomar, atalhos para abrir aulas e dashboard recolhível com resumo do progresso.

Registros de exercícios que versões anteriores sobrescreveram precisam ser corrigidos a partir de uma cópia ou anotação sua.

## Para desenvolver o plugin

Com Node.js 22 ou superior e npm, execute na pasta do projeto

```powershell
npm ci
npm test
npm run build
npm run dev
```

No Windows, use npm.cmd se necessário. O servidor de desenvolvimento usa http://localhost:8080. Configure essa origem na opção **Desenvolver a partir do localhost** do RemNote e recarregue o plugin após as alterações.

Para gerar o ZIP de publicação, use PowerShell 7

```powershell
./scripts/package-remnote.ps1 -RepositoryUrl 'https://github.com/Erickfaria88/remnotecodes'
```

O pacote de publicação mantém o ID reading-tracker e define o repositório público. As atualizações enviadas passam pela aprovação do RemNote.

A API de armazenamento não documenta uma operação atômica de leitura e atualização entre dispositivos. Evite editar a mesma base em vários painéis ao mesmo tempo, pois uma gravação pode sobrescrever outra.
## Versão 0.1.8
O plano diário reserva inicialmente um terço do tempo para revisão e estima 30 segundos por flashcard. Ajuste a reserva e a velocidade em Ajustes → Planejamento das revisões. Retomar e Revisões exibem blocos de até 30 minutos e permitem abrir a prática nativa dos cartões selecionados. Atualize os blocos após estudar. A consulta considera cartões com data até o fim do dia nas aulas cadastradas e seus descendentes hierárquicos. Cartões novos sem data e referências por portais ficam fora dessa estimativa. A duração pode mudar quando cartões reaparecem na prática. A primeira consulta pode levar mais tempo em bases grandes.


## Versão 0.1.9
Clique no indicador de questões ou em Registrar estudo desta aula para abrir o Dashboard de Estudos com a aula selecionada. Crie o dashboard pelo comando correspondente uma vez. O plano de avanço usa automaticamente o tempo diário menos a reserva de revisão. Leitura, retomadas, aulas quase concluídas e exercícios compartilham um só orçamento. Cada aula entra uma vez na seleção. O plano considera fase, estrelas e benefício por minuto, com blocos de até 30 minutos de leitura e 20 minutos de questões. Aulas sem exercícios ou com poucas questões também entram na consulta de atenção. As listas de retomadas e quase concluídas ficam recolhidas para consulta. Os tempos são reservas sugeridas e não descontam automaticamente minutos já estudados; essa função dependerá de um registro de tempo.


## Corrigir exercícios cadastrados
No formulário da aula, clique em Corrigir totais de exercícios. Preencha os totais acumulados corretos de acertos e erros e confira a prévia. Clique em Confirmar correção e salvar estudo. Por exemplo, 43 acertos de 45 questões correspondem a 43 acertos e 2 erros. Zero nos dois campos remove o registro de exercícios. Depois da correção, Novos acertos e Novos erros voltam a somar os próximos lançamentos.


## Versão 0.1.11
O atalho Registrar estudo desta aula registra o widget no documento Dashboard de Estudos antes de abrir a nota. A seleção pendente da aula é consumida após carregar o formulário. O comando Abrir Dashboard de Estudos também refaz o registro ao abrir.


## Cobertura dos assuntos mais cobrados · versão 0.1.12
No formulário de cada aula, informe Incidência deste assunto (%) com o percentual do levantamento dos professores e salve o estudo. O preenchimento sugere estrelas automaticamente; você pode ajustá-las antes de salvar. Se o mesmo assunto abranger várias aulas, use o mesmo Assunto compartilhado e o mesmo percentual em todas elas. O painel da disciplina seleciona assuntos por incidência decrescente até alcançar pelo menos 80%, incluindo o assunto que ultrapassar esse limite. Isso não exige que a seleção represente exatamente 20% das aulas. A cobertura da leitura é ponderada pela incidência; as etapas de um assunto contam quando todas as suas aulas estão concluídas naquela etapa. Cadastros que somam menos de 80% aparecem como parciais; divergências no mesmo assunto e totais acima de 100,5% pedem correção. A pequena tolerância admite arredondamento dos percentuais publicados. Consulte o painel também em Retomar. Ative Focar no núcleo de 80% da incidência cadastrada para filtrar o plano de avanço. Percentuais de disciplinas diferentes são analisados separadamente.


## Registro de tempo · versão 0.1.13
Abra a aula no formulário de estudo e informe a categoria, a data e a duração em hh:mm:ss, por exemplo 00:06:10. O tempo é opcional: deixe vazio para salvar somente progresso ou exercícios. A opção Contabilizar no tempo disponível do dia vem marcada. Revisão desconta da reserva de revisão; teoria, literais, questões e Passo Estratégico descontam do avanço. Se uma categoria ultrapassar a reserva, o excesso também reduz o saldo total. Sessões anteriores ficam no histórico e não descontam de hoje. O saldo diário reinicia por data local. Você pode informar um trecho de páginas e uma observação. Em teoria, literais e Passo Estratégico, a página final pode avançar a leitura acumulada; uma sessão de revisão ou questões mantém o avanço salvo, a menos que você altere Páginas lidas manualmente. Salvar estudo grava tempo, páginas e novos exercícios juntos. Consulte, edite ou remova registros no Histórico de tempo da aula ou em Ajustes. Editar ou remover tempo recalcula o saldo; os totais de exercícios e páginas continuam sendo corrigidos pelo formulário da aula. A duração é registrada manualmente nesta versão. As sessões fazem parte do backup JSON e são separadas por base.


## Seleção e navegação · versão 0.1.15
Em Disciplinas, use Selecionar disciplina ou Trocar disciplina. A janela permite filtrar as disciplinas cadastradas por nome e fase e pesquisa outros documentos no RemNote após duas letras. A organização Disciplinas por fase fica em Ajustes, recolhida em Organizar disciplinas por fase. A fase da disciplina, o resumo de cobertura e a lista completa de progresso ficam recolhidos durante a edição. Ao selecionar uma aula, use os controles Anterior, Próxima ou o seletor de aula junto ao formulário. Salve os dados antes de mudar de aula.


## Prioridades compartilhadas · versão 0.1.16
Em Retomar e Revisões, comece por Prioridades de hoje. Selecione uma ou mais fases ou Todas as fases. A seleção filtra atenção, cobertura, revisões e avanço. O núcleo de 80% é calculado separadamente por disciplina. Leituras curtas selecionadas no plano recebem o destaque Melhor custo-benefício.

Para revisar somente os flashcards de uma tag, abra Filtrar flashcards por tag, use Erro, Foco, 80/20 ou Base Teórica como atalho de busca e selecione a tag correta nos resultados. O filtro usa o ID da tag, sem exigir mudança de nome. A marcação direta é o padrão; marque Incluir tags herdadas dos tópicos-pai quando necessário. Os blocos usam apenas cartões pendentes das aulas selecionadas. O filtro de tag afeta os blocos de flashcards, não os lembretes manuais de revisão. As escolhas são mantidas entre as abas do painel aberto; recarregar ou abrir outro painel reinicia os filtros. O orçamento diário continua único, independentemente das fases selecionadas.


## Prática ampliada · versão 0.1.18
Ao iniciar Revisar bloco, a área de resolução ocupa toda a largura do widget, com margens pequenas, e oculta temporariamente o dashboard. No documento, a altura é ampliada com base na área disponível do monitor, reservando espaço para os controles do aplicativo. Na barra lateral, a prática se adapta à altura disponível do painel. O botão Voltar ao plano fica no topo; ao sair, os blocos são atualizados. Os controles nativos de resolução continuam disponíveis. A ampliação fica limitada ao widget do plugin, sem manipular a janela do RemNote.


## Revisões configuráveis e auditoria de questões · versão 0.1.19

Em Retomar ou Revisões, escolha **Como deseja revisar?**:

- **Revisão por bloco:** selecione as disciplinas em Selecionar disciplinas e editar quantidades. O padrão é 10 flashcards por disciplina. A distribuição alterna disciplinas e aulas; quando o tempo não comporta tudo, reduz a prévia sem favorecer uma única matéria.
- **Revisão por disciplina:** escolha uma disciplina e abra Editar quantidade por aula. Cada aula começa com 10 flashcards; zero exclui a aula.
- **Revisão por aula:** escolha a aula e a quantidade.
- **Automática:** mantém os blocos anteriores por prioridade, normalmente entre 15 e 30 minutos.

Os modos configuráveis montam um bloco com o que você escolheu, limitado ao saldo de revisão e aos cartões pendentes. Os filtros de fase, incidência e tag continuam valendo. As quantidades configuram **flashcards**, não questões únicas: uma questão pode gerar vários cartões. O resumo agrupa os cartões reconhecidos pelo mesmo número TEC. Se houver menos cartões pendentes que a quantidade pedida, o plugin mostra a quantidade real na prévia. As escolhas ficam no painel aberto; ao reabrir, volta ao padrão de 10.

### Resolver e conferir

1. Clique em Revisar bloco. O plugin prepara uma fotografia inicial dos históricos e a associação dos cartões às aulas originais antes de abrir a prática ampliada.
2. Resolva normalmente. **Esqueci = erro. Difícil, Bom ou Fácil = acerto.** Operações de reagendamento ou redefinição não contam como respostas. O plugin não modifica o algoritmo nem envia avaliações extras.
3. Clique em **Encerrar e auditar**. Uma saída nativa da fila também pode abrir o resumo após detectar respostas neste bloco. Se isso não ocorrer, use o botão do plugin.
4. Confira os totais por aula e abra os detalhes das questões. Pode mudar o resultado, corrigir a aula, identificar manualmente uma questão ou excluir um item da gravação.
5. Escolha **Confirmar e registrar selecionados**, ou use o resumo copiável e clique em **Descartar sem registrar** para fazer seus lançamentos manualmente. Nada é somado aos exercícios durante a prática ou apenas ao visualizar o resumo.

O rascunho fica no armazenamento **local**, separado por base, e pode ser recuperado após fechar o painel. Na recuperação, todos os itens exigem conferência manual. O rascunho não sincroniza entre máquinas e não integra o backup JSON principal. Depois de confirmar, o registro mínimo da auditoria é sincronizado, incluído no backup e consultável em **Exercícios → Auditorias confirmadas**. O histórico mostra até 20 blocos na tela; o backup guarda todos os confirmados. Ajustar os totais acumulados pelo formulário de exercícios não reescreve a auditoria original.

### Regras para proteger a estatística

A identificação automática usa links HTTP/HTTPS do domínio tecconcursos.com.br com caminho /questoes/NUMERO, no cartão ou em seus ancestrais até a aula. Não pesquisa o site TEC nem exige credenciais. Links somente em irmãos, rótulos como #2417266 sem URL e ícones de livro não identificam automaticamente uma questão. Nesses casos, confira manualmente e informe tec:NUMERO ou use explicitamente o ID do cartão; este último não agrupa cópias em outros documentos.

A primeira avaliação válida da questão no dia é a referência. Reapresentações após um erro não acrescentam novas questões nem transformam o erro inicial em acerto. Questões TEC já confirmadas naquele dia não são somadas de novo, mesmo em outro bloco. Se o cartão já tinha sido avaliado antes de iniciar o bloco naquele dia, o item exige conferência manual. Lançamentos manuais anteriores não têm identidade de questão; o plugin não consegue descobrir sozinho se eles já representam as mesmas questões. Nesse caso, exclua os itens do resumo ou descarte o bloco para evitar duplicidade.

A captura usa APIs documentadas de eventos, cartões, histórico, ancestrais e URLs do SDK 0.0.46. O evento apenas solicita uma nova leitura; a contagem vem da comparação dos históricos. Ao encerrar, verifica leituras consecutivas, e volta a conferir antes de confirmar. Histórico ausente, mudança detectada ou possível desfazer, respostas conflitantes, identificação ambígua e falha de conferência final não entram automaticamente. Você pode conferir esses itens manualmente ou excluí-los. Cartões sem resposta também ficam fora da seleção automática.

A gravação do resumo ocorre em uma operação, preservando páginas, etapas, tempo, editais e os exercícios anteriores. O ID do bloco e o registro por questão/dia protegem contra duplo clique e retry. O formato de backup passa a **versão 3**: lê formatos 1 e 2, preserva os dados e grava o novo formato ao salvar. Atualize todas as máquinas e o localhost; versões anteriores recusam o formato novo para evitar descartar as auditorias.

### Limites e validação da primeira utilização

Esta é uma **captura assistida com confirmação obrigatória**, não uma medição já certificada no seu RemNote. Eventos da fila são globais e a interface não fornece um identificador de sessão documentado para atribuir cada resposta à fila incorporada. Use uma única fila e uma única máquina por vez para auditar. Há proteção contra duas telas ativas no mesmo cliente; o SDK não fornece aqui uma transação distribuída para gravações simultâneas em máquinas diferentes.

Antes de usar os totais na preparação, valide um bloco pequeno comparando manualmente os itens, especialmente múltipla escolha, cloze, reapresentações e desfazer. O histórico pode não estar disponível ou refletir imediatamente todas as operações; ausência de evidência não é tratada como acerto. Os testes automatizados usam históricos simulados e não substituem a validação da fila nativa. Descartar o resumo não desfaz as avaliações que você já enviou ao algoritmo do RemNote. O tempo de revisão continua sendo registrado manualmente; confirmar questões não desconta tempo automaticamente.

Se a resposta da gravação falhar, o resumo pode ter sido salvo mesmo assim. A interface bloqueia novos lançamentos e o descarte até você usar Verificar se o bloco foi gravado. Se estiver confirmado, mostra o recibo e permite somente fechar a auditoria registrada. Isso evita lançar manualmente um resultado que já entrou nos exercícios. Não repita a inclusão enquanto houver dúvida sobre a confirmação.


## Registrar o tempo ao sair da revisão · versão 0.1.20

Ao encerrar a resolução pelo botão Encerrar e auditar, ou quando a fila emitir o evento nativo de saída, o plugin abre **Registrar revisão do bloco** com o tempo e os resultados. Se a saída nativa não emitir o evento na sua versão do RemNote, use o botão do plugin. A saída apenas solicita o registro: não salva nada automaticamente.

O campo Tempo efetivo vem preenchido com o intervalo sugerido entre a abertura da prática e sua saída, excluindo a preparação inicial e a conferência do resumo. Corrija o valor se houve pausas. Em rascunhos interrompidos sem horário de fim conhecido, informe o tempo manualmente. Escolha a data e confirme as aulas realmente revisadas. A seleção inicial considera cartões com avaliação detectada, inclusive flashcards sem link TEC. Se o histórico não fornecer evidência suficiente, selecione as aulas manualmente.

**Salvar revisão e questões selecionadas** grava, em uma única operação, o tempo e os acertos/erros conferidos. **Salvar somente o tempo** registra a revisão sem somar questões, permitindo lançá-las manualmente depois. **Descartar sem registrar** não grava tempo nem exercícios. Se já registrou o tempo deste bloco por outro caminho, desmarque Registrar tempo para não duplicá-lo. A opção Descontar do tempo disponível para revisão vem marcada.

O tempo total do bloco é dividido entre as aulas selecionadas, por rateio estimado proporcional aos cartões avaliados detectados, preservando o total exato em segundos. Não é uma medição individual de tempo por aula; o histórico permite corrigir os valores. Uma mesma questão pode ser revisitada em outro bloco e consumir tempo real, mesmo que a regra de primeira tentativa diária impeça somar essa questão novamente aos exercícios.

Em **Ajustes → Histórico de tempo**, ou no histórico da aula, os registros mostram aula, disciplina, duração de revisão, cartões avaliados detectados e os acertos/erros somados por aquele bloco. Em **Exercícios → Auditorias confirmadas**, também aparecem as aulas, seus resultados e o tempo atual no histórico. Editar ou remover tempo recalcula o saldo e preserva os exercícios. O lançamento usa a data indicada, sem dividir automaticamente o bloco entre datas caso atravesse meia-noite.

O identificador do bloco protege tempo e questões contra duplo clique e retry. Se uma resposta de gravação ficar incerta, o fluxo de verificação também vale para o tempo. A recuperação de uma revisão já confirmada mostra o recibo e não cria novas sessões. O backup passa ao formato **4**, mantendo leitura dos formatos 1, 2 e 3; atualize todas as máquinas e o localhost para evitar usar versões anteriores que não reconhecem os novos registros.

## Saída simplificada da revisão · versão 0.1.21

Ao sair da prática, a tela principal mostra somente as aulas respondidas e selecionadas, com seus acertos, erros e tempo estimado. Ao final, **Total do bloco** soma os resultados das aulas selecionadas. Salvar revisão e resultados confirma o conjunto em uma etapa; não é necessário abrir cada questão. Desmarcar uma aula a retira tanto do lançamento de tempo quanto do de resultados. Para restaurar a seleção, use Alterar aulas selecionadas.

Respostas sem confirmação, itens excluídos e questões já registradas no dia ficam em **Pendências e itens fora do registro**, fechado por padrão. Detalhes das respostas selecionadas também ficam recolhidos. Esses itens não são adicionados silenciosamente aos totais. Aulas sem avaliação não aparecem inicialmente; sua inclusão manual fica em uma opção recolhida.

Para questões com ícone de livro no início do texto (por exemplo 📖), avaliação de acerto/erro confirmada no histórico e aula de origem confirmada, a ausência de link TEC deixa de exigir auditoria individual. Elas podem ser registradas pelo ID do tópico do cartão, com indicação dessa origem no resumo. Cartões do mesmo tópico usam a primeira resposta válida; cópias em tópicos diferentes sem link TEC não podem ser identificadas como a mesma questão. Flashcards comuns sem identificação, históricos alterados, respostas conflitantes e avaliações incertas continuam fora da seleção automática. Quando existe link TEC, o número permanece a identificação preferida.

Um rascunho já finalizado cujo histórico continua inalterado mantém os resultados confirmados ao ser reaberto. Interrupção sem finalização ou alteração posterior do histórico exige conferência opcional dos itens afetados. O formato de armazenamento permanece 4.

## Saída sempre disponível · versão 0.1.22

O botão **Voltar ao plano** fica sempre visível no topo da prática e do resumo, independentemente de pendências ou validação. Ele volta sem registrar exercícios ou tempo e mantém o rascunho local para recuperar depois. A saída não espera indefinidamente por uma chamada do SDK. Se houver uma gravação já em andamento, confira o rascunho/recibo antes de lançar manualmente os mesmos resultados.

O resumo agora tem rolagem própria e mantém os controles de ação acessíveis. A seleção de respostas usa a mesma regra de validade na prévia e na gravação: itens incertos, com identificações inválidas ou ainda não conferidos ficam na seção recolhida, sem bloquear o salvamento das respostas válidas. Consultas que terminam depois de fechar a tela não devem reabrir nem regravar o rascunho abandonado. O formato dos dados permanece 4.

## Iniciar estudo na aula · versão 0.1.23

Depois de usar **Abrir aula** no Reading Tracker, o documento da aula mostra **Iniciar estudo** junto ao seu progresso. Aulas que já têm páginas, exercícios ou tempo cadastrado também oferecem esse controle. O botão aparece na aula aberta como documento, e não em cada linha de conteúdo.

1. Escolha a atividade (Teoria, Literais, Questões, Revisão ou Passo Estratégico) e clique em **Iniciar estudo**.
2. O cronômetro fica visível na aula. Use **Pausar** e **Retomar**; a pausa não entra na contagem. O dashboard também mostra o cronômetro ativo e permite voltar à aula.
3. Clique em **Concluir e registrar**. O contador para e abre o dashboard com o formulário da aula correta e o tempo preenchido.
4. Confira a duração e a categoria, informe páginas, acertos, erros e etapas e clique em **Salvar estudo**. O tempo e os demais dados são gravados juntos; Revisão desconta da reserva de revisão e as outras categorias descontam do avanço.

Concluir o cronômetro não grava tempo automaticamente. Se a abertura do dashboard falhar, o tempo concluído continua pendente e pode ser reaberto pelo botão Registrar estudo cronometrado. Se sair do formulário sem salvar, o cronômetro concluído permanece para recuperar o registro. Um ID estável evita duplicar o mesmo tempo e exercícios em um retry. Depois de salvar, o cronômetro é limpo; se a limpeza local falhar, aparece como já registrado e não deve ser lançado de novo.

Há um cronômetro em andamento ou pendente por base nesta máquina. Ele usa armazenamento local e permanece ao trocar de documento ou fechar o painel. Enquanto estiver rodando, continua contando pelo relógio, inclusive se fechar o RemNote: pause antes de interromper os estudos. O tempo pode ser ajustado no formulário antes de salvar. Se atravessar meia-noite, a data sugerida é a da conclusão; ajuste se necessário, pois não há rateio automático entre dias. Durações acima de 24 horas precisam ser corrigidas no formulário. Descartar cronômetro remove somente o tempo ainda não registrado, preservando dados salvos.

O cronômetro em andamento não sincroniza entre máquinas e não está no backup JSON; o estudo confirmado usa o armazenamento sincronizado e o histórico normal do plugin. O formato dos dados permanece 4. Não há alterações no conteúdo, nas tags, nos flashcards ou na hierarquia da aula.

## Alternância e controles sem duplicação · versão 0.1.24

A aula mantém uma única barra de progresso, etapas e cronômetro. O painel recolhido mostra apenas o botão Reading Tracker; os controles da aula permanecem acima dele.

A seção Revisar antes de avançar pode ser recolhida pelo título. Essa preferência fica salva nesta máquina e base; recolher não remove a reserva dos blocos sugeridos.

Em Ajustes, o limite diário por disciplina começa em 2 horas. Soma todos os tempos contabilizados no planejamento naquele dia, tanto revisão como avanço. As sugestões de revisão reservam seu tempo antes do plano de avanço. O planejamento normal e pós-edital respeitam esse limite. Quando há outras matérias elegíveis, o avanço evita a última disciplina registrada (ou as disciplinas do último bloco registrado). Pode sobrar tempo quando os filtros, a alternância ou o limite não permitem outras sugestões.

Informe o tempo efetivo para que o limite considere o estudo realizado: páginas ou questões sem duração não permitem calcular esse consumo. Registros fora do planejamento não consomem o limite. É possível registrar o tempo real mesmo que ultrapasse o teto; o teto restringe sugestões, não o histórico.

O backup passa ao formato 5 para guardar o limite por disciplina, com migração automática dos formatos anteriores e padrão de 120 minutos. Atualize as demais instalações antes de compartilhar a mesma base com esta versão.

## Lista de atenção · versão 0.1.25
A lista de aulas que precisam de atenção considera o limite por disciplina configurado em Ajustes, os tempos contabilizados hoje e a revisão sugerida. Disciplinas com menos de um minuto disponível ficam fora da lista do dia, preservando seu histórico e reaparecendo quando houver saldo.


## Plano de hoje · versão 0.1.26

Ao ativar o plugin pela primeira vez no dia, ele solicita ao RemNote uma janela central com o saldo de revisão e avanço, até dois blocos de flashcards e três atividades prioritárias. Leituras que cabem integralmente no bloco aparecem como Concluir a leitura, com páginas restantes. São atividades do mesmo orçamento, respeitando o limite por disciplina e a alternância, sem tempo extra para as conclusões rápidas.

Use Iniciar/Revisar bloco para resolver cartões com o mesmo registro de tempo, acertos e erros já existente; Abrir aula fecha o popup e leva ao documento com os controles normais de estudo. Ver dashboard e Revisões e aulas abrem a nota existente na aba correspondente. É necessário criar essa nota uma vez pelo comando Abrir Dashboard de Estudos.

A janela usa os últimos filtros de fases, Pareto e tag do painel nesta máquina. No pós-edital, usa os concursos ativos e sua disponibilidade. O resumo é uma prévia; o dashboard mantém o plano completo e a configuração dos blocos. As quantidades de revisão começam no padrão de dez flashcards por disciplina.

Agora não e o X fecham sem gravar estudos. Em Ajustes > Plano de hoje, desative a abertura automática ou abra novamente. O comando Abrir Plano de hoje também permite reabrir a qualquer momento. A preferência e o controle de uma abertura por dia são locais, separados por base e máquina; não alteram o formato do backup de estudos. A abertura automática ocorre na ativação do plugin, incluindo instalação/atualização, e não interrompe uma sessão que já estava aberta quando vira o dia. A apresentação e as dimensões finais dependem da janela modal do RemNote; a área interna tem largura responsiva, rolagem e saída visível.

## Cronômetro nos documentos filhos · versão 0.1.27
Ao navegar para um filho ou descendente da aula com cronômetro em andamento, pausado ou concluído pendente, os mesmos controles aparecem abaixo do título. Pausar, retomar e concluir continuam usando o cronômetro original. O registro final pertence à aula original, sem criar registros para os documentos filhos. O botão Ir à aula permite voltar. Não há herança para disciplinas vizinhas ou pelo simples uso de portais. Nenhum formato de dados foi alterado.

