# StreamRooms

Plataforma privada para você e seus amigos entrarem em salas e compartilharem a tela uns com os outros — sem microfone, sem chat de voz, sem chat de texto. Só compartilhamento de tela, com foco em baixa latência e boa qualidade de imagem.

Inspirada na organização do Discord (servidores, salas, amigos), mas com identidade visual própria (azul + fundo escuro + detalhes em rosa) e escopo bem mais enxuto.

## Como o projeto é organizado

```
SiteTela/
├── server/     # API REST + banco de dados + sinalização WebRTC (Node + TypeScript + Express + Socket.IO)
│   ├── src/
│   │   ├── auth/        # registro, login, JWT, refresh token
│   │   ├── users/       # perfil, busca de usuários
│   │   ├── friends/     # amizades e solicitações
│   │   ├── servers/     # servidores (criar, entrar, editar)
│   │   ├── rooms/       # as 5 salas fixas de cada servidor + conexões diretas entre amigos
│   │   ├── webrtc/      # presença em tempo real + sinalização WebRTC (Socket.IO)
│   │   └── middleware/
│   └── prisma/          # schema do banco (SQLite local, troca fácil para Postgres na VPS)
│
└── client/     # Frontend (React + TypeScript + Vite)
    └── src/
        ├── pages/        # telas: login, cadastro, amigos, servidor, sala
        ├── components/   # peças de UI reutilizáveis
        ├── hooks/        # useSocket, useRoomConnection (toda a lógica de WebRTC)
        ├── context/      # autenticação
        └── api/          # cliente HTTP
```

## Funcionalidades da primeira versão (MVP)

- Conta de usuário (cadastro/login) com sessão via JWT + refresh token
- Perfil: nome de usuário, avatar (URL), bio, status online/offline
- Sistema de amigos: buscar, solicitar, aceitar, recusar, remover
- "Conectar" com um amigo → sala privada de compartilhamento de tela (sem servidor)
- Servidores: criar, entrar por código de convite, editar nome/imagem
- Cada servidor nasce com 5 salas fixas de transmissão
- Dentro da sala: lista de participantes em tempo real, quem está "AO VIVO"
- Compartilhar tela (com áudio opcional da própria tela) via `getDisplayMedia`
- Assistir a uma transmissão: tela cheia, volume, mutar, tamanho, qualidade (auto/720p/1080p/máxima)
- Arquitetura em mesh WebRTC (P2P) — já preparada para múltiplas transmissões simultâneas na mesma sala

## Rodando localmente

Pré-requisitos: Node.js 20+ instalado.

### 1. Backend

```bash
cd server
cp .env.example .env
npm install
npx prisma migrate dev --name init   # só na primeira vez
npm run dev
```

O servidor sobe em `http://localhost:4000`.

### 2. Frontend

Em outro terminal:

```bash
cd client
npm install
npm run dev
```

O frontend sobe em `http://localhost:5173` (o Vite já faz proxy de `/api` e `/socket.io` para o backend).

Abra `http://localhost:5173` em duas janelas/navegadores diferentes (ou modo anônimo) para testar o compartilhamento de tela entre "dois usuários".

## Variáveis de ambiente (`server/.env`)

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão do banco. `file:./dev.db` (SQLite) localmente; troque para uma URL `postgresql://...` na VPS |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Segredos para assinar os tokens. Gere com `openssl rand -hex 32` |
| `JWT_ACCESS_EXPIRES_IN` | Duração do access token (padrão `15m`) |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | Duração do refresh token em dias (padrão `30`) |
| `PORT` | Porta do backend (padrão `4000`) |
| `CLIENT_ORIGIN` | URL do frontend, usada no CORS e nos cookies |
| `NODE_ENV` | `development` ou `production` |
| `STUN_URLS` | Lista de servidores STUN separados por vírgula (padrão: STUN público do Google) |
| `TURN_URL` / `TURN_USERNAME` / `TURN_CREDENTIAL` | Preencha quando tiver seu próprio TURN (coturn) rodando na VPS |

## Hospedagem de teste

Para testar com seus amigos antes de migrar para a VPS, a forma mais simples é rodar o backend em produção servindo também o build do frontend (um único processo):

```bash
cd client && npm run build
cd ../server
npm run build
NODE_ENV=production npm start
```

Isso serve a API, o Socket.IO e os arquivos estáticos do React todos na mesma porta — pode ser publicado em qualquer serviço que rode um processo Node (Render, Railway, Fly.io, etc.). Configure lá as variáveis de ambiente da tabela acima e aponte um domínio com HTTPS.

**Importante sobre WebRTC em produção:** com HTTPS funcionando e o STUN público, a maioria das conexões entre amigos vai funcionar direto (P2P). Para os casos em que a rede de alguém bloqueia P2P (redes corporativas, certas operadoras/CGNAT), você vai precisar de um servidor TURN — é exatamente para isso que o projeto já reserva `TURN_URL`/`TURN_USERNAME`/`TURN_CREDENTIAL`. Rode um [coturn](https://github.com/coturn/coturn) na sua VPS quando migrar e preencha essas variáveis.

## Migrando para a VPS

O projeto já foi estruturado para essa migração ser simples:

1. Troque `DATABASE_URL` para Postgres (o schema do Prisma já é compatível — rode `npx prisma migrate deploy`).
2. Suba um [coturn](https://github.com/coturn/coturn) na VPS e preencha `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL`.
3. Rode `npm run build` no `server` e no `client`, depois `NODE_ENV=production npm start` no `server` (ele serve o frontend junto).
4. Coloque um proxy reverso (nginx/Caddy) na frente com HTTPS.

## O que não foi implementado de propósito

Por pedido explícito do escopo: sem microfone, sem chat de voz, sem chat de texto, sem mensagens diretas. O único áudio é o áudio da tela/aplicativo compartilhado, e é sempre opcional.
