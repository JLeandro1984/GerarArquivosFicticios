# Gerador de Arquivos Fictícios (HTML/CSS/JS)

Projeto web para gerar arquivos fictícios no mesmo padrão do script `.bat`, com opção de salvar diretamente em uma pasta escolhida pelo usuário.

## Como usar

1. Rode em servidor local (PWA não funciona em `file://`). Exemplo:
   - `python -m http.server 5500`
   - depois abra `http://localhost:5500`
2. Ajuste:
   - total de arquivos (ex.: 120)
   - prefixo (ex.: DummyFile)
   - selecione as extensões desejadas
   - adicione/remova extensões quando necessário
3. Clique em **Selecionar pasta** (opcional).
4. Deixe marcado **Somente gravação direta na pasta selecionada (sem compactar ZIP)** para evitar ZIP.
5. (Opcional) Marque **Limpar pasta de destino antes de gerar** para remover arquivos antigos da pasta `ArquivosDiarios`.
6. (Opcional) Marque **Abrir pasta após gerar** para abrir o seletor no destino após a geração direta.
7. Clique em **Gerar arquivos**.
8. Se disponível, clique em **Instalar app** para instalar como PWA.

## Saída

- Modo 1: grava diretamente na pasta selecionada, dentro de `ArquivosDiarios`.
- Modo 2 (fallback): baixa um ZIP com pasta `ArquivosDiarios`.
- Arquivos no formato `DummyFile_<contador>_<yyyy-MM-dd_HH-mm>.<ext>`.
- Conteúdo interno no formato `Teste arquivo fictício <guid> - <ddMMyyyyHHmmss>`.

## Cache e permissões

- O app salva em cache as configurações do formulário.
- O catálogo de extensões (marcadas e personalizadas) também é salvo em cache.
- O modo **sem ZIP** também é salvo em cache.
- A opção de limpeza da pasta de destino também é salva em cache.
- A opção de abrir pasta após geração também é salva em cache.
- A última pasta escolhida é mantida em cache quando o navegador suportar a API de acesso ao sistema de arquivos.
- Se a permissão da pasta não estiver disponível, o app usa ZIP automaticamente.
- O botão **Limpar cache** remove preferências e referência da pasta salva.

Quando o modo **sem ZIP** estiver ativo, o sistema exige pasta selecionada com permissão de escrita e não gera arquivo compactado.

## Compatibilidade

- Para gravação direta em pasta, use navegador com suporte à File System Access API (ex.: versões recentes de Chromium/Edge).
- Quando não houver suporte, o fluxo de ZIP continua funcionando normalmente.

## PWA

- O projeto inclui `manifest.webmanifest` e `sw.js`.
- O botão **Instalar app** aparece quando o navegador permite `beforeinstallprompt`.
- Para instalação, use contexto seguro (`https` ou `localhost`).
