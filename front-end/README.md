# Front-end - Sistema de Chamados GTF

Aplicacao React + Vite para abertura, acompanhamento e administracao de chamados.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` deve apontar para a API, por exemplo `http://localhost:3333/api`.

## Build para Locaweb

```bash
npm run build
```

Publique o conteudo da pasta `dist`. O arquivo `public/.htaccess` e copiado para o build e mantém as rotas da SPA funcionando em hospedagem Apache.
