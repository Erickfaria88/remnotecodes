# Reading Tracker

Plugin React/TypeScript para registrar manualmente o progresso de PDFs externos por aula no RemNote Desktop. O manifesto usa o modo sandbox e o escopo `All / Read`. O plugin consulta os documentos e grava somente no armazenamento sincronizado do SDK.

## Desenvolvimento local

Na pasta do projeto, com Node.js 22 ou superior e npm:

```powershell
npm ci
npm test
npm run build
npm run dev
```

Se o PowerShell bloquear o script npm.ps1, use npm.cmd. O servidor usa a porta 8080 e deve permanecer aberto durante o teste. Pare-o com Ctrl+C. Após alterar o manifesto, reinicie o servidor e recarregue o plugin. A compilação gera o manifesto, o HTML e os bundles em dist/.

No RemNote Desktop, com uma base de teste ativa, abra **Settings → Plugins / Plugins and Themes → Build → Develop from localhost**. Informe `http://localhost:8080`. Abra **Reading Tracker** na barra lateral direita. Confira o escopo de leitura solicitado. Esse fluxo é para desenvolvimento local. [Guia rápido oficial](https://plugins.remnote.com/getting-started/quick_start_guide)

## Roteiro de teste no RemNote

1. Em uma disciplina de teste, use três documentos-filhos diretos. Cadastre 10/10 e 0/90 páginas em duas aulas e deixe a terceira sem cadastro.
2. Confirme a distinção entre 0% e Sem cadastro. Com ritmo global 30, confira 10%, 90 páginas restantes e 3 h. Com ritmo da disciplina 45, confira 2 h. Apague o ritmo da disciplina e salve para voltar ao global.
3. Exporte o JSON, altere um registro, importe o arquivo e confirme a restauração. Verifique os valores e ritmos restaurados.
4. Feche e reabra o Desktop. Verifique a persistência. Em outra base de teste, confirme que os dados da primeira não aparecem e que o backup da primeira é rejeitado.
5. Compare conteúdo, flashcards, tags e estrutura da base de teste antes e depois de salvar. Para verificar sincronização real, abra a mesma base e o mesmo plugin em um segundo dispositivo com a mesma conta e confira os dados após sincronizar.
6. Renomeie ou mova uma aula preservando o ID. Atualize a lista da disciplina para conferir a associação.

## Dados e limites

O armazenamento do SDK é sincronizado por usuário. A chave inclui o ID da base e contém um mapa de registros por ID de aula, um ritmo global da base e um mapa de ritmos por ID de disciplina. Uma importação validada e confirmada substitui esse conjunto inteiro em uma gravação. O JSON contém esses IDs e dados de leitura, sem os PDFs e sem os textos das notas.

O painel lista somente documentos-filhos diretos da disciplina selecionada. Atualize a lista após mudanças na hierarquia. Aulas sem cadastro não entram nos totais. Backups só podem ser restaurados na base com o ID de origem. A API não documenta uma operação atômica de leitura e atualização entre dispositivos. Alterações simultâneas em instâncias diferentes podem sobrescrever dados da mesma base.

Os testes automatizados usam um substituto serializável para o armazenamento sincronizado. A persistência real, a sincronização entre dispositivos e o seletor de arquivos e download do sandbox dependem da verificação no Desktop. O manifesto é destinado a localhost e o campo repoUrl precisa ser preenchido para publicação.


## Retomadas e lembrete externo

Na aula, informe o progresso, escolha **Retomar amanhã** ou preencha a data e clique em **Salvar progresso**. O painel **Retomar estudos** reúne as datas de hoje e atrasadas, as próximas retomadas e as aulas iniciadas com até 10 páginas ou 20 minutos restantes. Clique em uma aula da lista para carregar a disciplina e editar o progresso. Salvar a leitura como concluída remove a data de retomada. As datas fazem parte do backup JSON.

Para receber um aviso fora do RemNote, depois de salvar a data abra **Notificação pelo calendário**, escolha o horário local e baixe o arquivo .ics. Importe-o no calendário em que recebe notificações e confirme o alerta no horário do evento. Se o sandbox bloquear o download, copie o conteúdo exibido para um arquivo .ics em UTF-8. O arquivo importado é uma cópia. Reagendar ou concluir no plugin exige atualizar ou excluir o evento no calendário. O RemNote e o servidor local podem estar fechados na hora do aviso.

No Google Calendar, escolha **Preparar evento no Google Calendar** e abra o link gerado. Confira a agenda e o alerta antes de salvar. O link cria um formulário preenchido. Reagende eventos existentes no próprio Google Calendar para evitar duplicatas.

## Publicação não listada

Com o código em um repositório público do GitHub, gere o pacote usando PowerShell 7:

```powershell
./scripts/package-remnote.ps1 -RepositoryUrl 'https://github.com/CONTA/REPOSITORIO'
```

O script gera ReadingTracker-RemNote.zip com o manifesto de publicação, preservando o ID reading-tracker. O manifesto em public continua configurado para desenvolvimento local. Em Plugins e temas → Build → Upload plugin, envie o ZIP para a revisão do RemNote. Depois da aprovação, instale pelo link direto do plugin. Exporte o backup JSON na versão local antes de trocar para a versão publicada e confira os registros usando a mesma conta e base.