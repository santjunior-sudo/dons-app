# DONS — O Corpo em Ação

Experiência interativa multiplayer (professor no telão + alunos no celular) sobre dons
espirituais, amor e edificação em **1 Coríntios 12–14**. 12 desafios em 4 atos, ~8–10 minutos.

> Os perfis finais refletem apenas o desempenho na dinâmica. O app **não** é um teste para
> identificar dons espirituais, e as perguntas descrevem o que Paulo afirma no texto em vez de
> arbitrar controvérsias denominacionais.

## Como rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Para produção: `npm run build && npm start`.

**Na aula (celulares na mesma rede):** abra o host pelo IP da máquina — por exemplo
`http://192.168.0.10:3000/host` (o Next imprime o endereço de rede ao iniciar). O QR Code é
gerado a partir da URL em que o host está aberto, então os alunos entram direto.

## Rotas

| Rota | O quê |
| --- | --- |
| `/` | Home: criar desafio ou entrar em uma sala |
| `/host` | Cria uma sala e redireciona para o telão |
| `/host/[code]` | Telão do professor (lobby, perguntas, revelação, ranking, análise final) |
| `/host/demo` | Sala de demonstração já com 12 bots |
| `/join` | Entrar digitando o código |
| `/join/[code]` | Entrar direto pelo QR Code |
| `/play/[code]` | Tela do aluno (mobile-first) |
| `/admin` | Editor simples de perguntas (salva como quiz `custom`) |

Atalhos no telão: **espaço**, **→** ou **enter** avançam a dinâmica.

## Teste rápido com bots

1. Abra `/host/demo` (cria a sala com 12 bots).
2. Opcional: `+ 10 bots` / `+ 25 bots` no rodapé.
3. Entre também pelo celular (ou outra aba) escaneando o QR / digitando o código.
4. `INICIAR` → responda → `ENCERRAR VOTAÇÃO` → `REVELAR` → `PRÓXIMA`.
5. Ligue **Auto avançar** para o jogo caminhar sozinho.

## Arquitetura

- **Next.js 16 (App Router) + TypeScript + Tailwind v4.**
- **Estado da partida em memória no servidor** (`src/lib/gameStore.ts`), autoridade única sobre a
  máquina de estados: `LOBBY → COUNTDOWN → TRANSITION → QUESTION_ACTIVE → QUESTION_LOCKED →
  REVEAL → LEADERBOARD → … → FINAL → RESULTS`.
- **Realtime por SSE** (`/api/sessions/[code]/stream`), com polling de resgate a cada 3 s se o
  stream cair. Sem banco e sem dependência externa — um processo serve tudo.
- **Perguntas separadas da UI** em `src/data/donsQuiz.ts`; o editor `/admin` grava outro quiz na
  memória do servidor via `POST /api/quizzes`.
- Identificação do aluno em `localStorage` (`dons:player:<CODE>`): recarregar a página ou perder
  a conexão devolve o jogador à mesma partida com a mesma pontuação.

### Pontuação

Acerto: `1000` + até `300` de bônus por velocidade. Boss (desafio 8): `1500` + até `400`.
Final (desafio 12): `2000` + até `500`. Erro: `0` (nunca negativo). Cada pergunta alimenta as
dimensões **Conhecimento**, **Corpo** e **Edificação**.

Enquanto a votação está aberta, a pontuação e a posição do aluno ficam congeladas — ninguém
descobre se acertou antes de o telão revelar.

### Corpo em Construção

Indicador coletivo que avança com o progresso da turma (visão → audição → mãos → pés → coração).
Ele **sempre** chega a 100% no encerramento; a precisão da turma define apenas a intensidade da
celebração final.

## Deploy (Railway)

O app é **um processo único** com o estado da partida na memória. Isso exige:
`numReplicas: 1`, **sem** autoscaling, e um plano que **não hiberna**.

1. No Railway: **New Project → Deploy from GitHub repo** → `santjunior-sudo/dons-app`.
   O `railway.json` já define Dockerfile, 1 réplica e health check em `/api/health`.
2. **Variables** → adicione:
   - `NEXT_PUBLIC_CHURCH_NAME` = `Igreja Adventista do Brooklin`
   - `DONS_STATE_PATH` = `/data/dons-state.json`
3. **Volume** → monte em `/data` (1 GB basta). É o que faz a partida sobreviver a um
   restart do container no meio da aula.
4. **Settings → Networking → Generate Domain** (ou aponte seu domínio).
5. Confirme: `curl https://SEU-DOMINIO/api/health` deve responder `{"ok":true,...}`.

> Vercel e Netlify **não servem** para este app: são serverless, cada requisição pode cair
> num processo diferente e o estado da sala se perde.

## Antes da aula (checklist de 5 minutos)

1. `curl https://SEU-DOMINIO/api/health` → `ok: true`.
2. Abra `/host` no notebook e projete. Anote/imprima o QR do lobby.
3. Entre com **seu próprio celular** pelo QR, no 4G, e confirme que aparece no telão.
4. `+ 10 bots` → `INICIAR` → responda uma pergunta → `Reiniciar`. Isso valida o loop inteiro.
5. Deixe o notebook na tomada e desative a suspensão automática.
6. Não faça deploy no dia. Um push para a `main` reinicia o container.

Se a internet do local cair: rode `npm run dev` no notebook e peça para os celulares
entrarem pelo Wi-Fi local (`http://SEU-IP:3000/host`). O jogo funciona igual.

## Limites conhecidos

- O estado vive na memória e é espelhado em `DONS_STATE_PATH` a cada segundo. Um restart
  retoma a partida de onde parou (testado matando o processo no meio de uma pergunta), mas o
  app assume **uma única instância** — nunca ligue autoscaling.
- Sem autenticação: quem abrir `/host/[code]` controla a sala. Não divulgue essa URL.
- O realtime usa SSE com polling de 1,5 s como rede de segurança, porque alguns proxies
  (túneis, Wi-Fi corporativo) seguram o stream sem derrubar a conexão.
