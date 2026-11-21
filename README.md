# Reading Tracker

Organize suas leituras, revisões e exercícios dentro do RemNote. Veja onde parou em cada aula, quanto falta para terminar e quais materiais pode estudar no tempo disponível.

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

