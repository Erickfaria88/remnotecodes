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
| **Ajustes** | Defina o tempo diário, o ritmo de leitura e exporte ou restaure um backup JSON. |

O botão **Abrir aula** leva ao documento no RemNote. Ao abrir uma aula pelo dashboard, o painel é recolhido e mantém um botão para expandir novamente. O resumo disponível da aula mostra páginas, etapas e desempenho em questões.

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

