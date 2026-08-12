# Shape — Treino & Dieta

PWA pessoal de treino e dieta. Roda em https://gusta-monteiro.github.io/shape/

## Instalar no iPhone

1. Abra a URL acima no **Safari**.
2. Toque em **Compartilhar** (quadrado com seta) → **Adicionar à Tela de Início**.
3. O ícone "Shape" aparece na tela inicial e abre em tela cheia, funcionando offline.

## Assinar o calendário de treinos

1. No iPhone: **Ajustes → Apps → Calendário → Contas → Adicionar Conta → Outra → Adicionar Assinatura de Calendário**.
2. Cole: `https://gusta-monteiro.github.io/shape/shape.ics`
3. Os treinos (20h), descansos ativos e check-ins de domingo aparecem no Calendário nativo, com alerta 30 min antes.

## Estrutura do plano

- **Treinos:** seg, ter, qua, sex, sáb — sequência A→B→C→D contínua (âncora: 12/08/2026 = C).
- **Descanso ativo:** qui e dom — abdômen + panturrilha (protocolos A/B alternados) + antebraço.
- **Fases:** Cutting Bloco 1 (12/08→11/10) · Diet Break (12/10→18/10) · Cutting Bloco 2 (19/10→13/12) · Estabilização (14/12→).
- **Check-in:** domingo em jejum — peso + fotos frente/lado/costas, registrados no app.

Dados de peso e fotos ficam **somente no aparelho** (localStorage/IndexedDB). Use o botão
Exportar na aba Check-in para fazer backup.

## Manutenção

- Fonte dos dados do plano: `data.js` (dieta e treinos vêm das planilhas cutting/estabilização e do PDF do treinador).
- Alterou o plano ou a âncora ABCD? Atualize `data.js` **e** rode `python tools/gen_ics.py` (a âncora está duplicada lá).
- Novos ícones: `python tools/gen_icons.py`.
- A cada deploy que altere arquivos do app, suba a versão em `sw.js` (`VERSION`) para o cache atualizar.
