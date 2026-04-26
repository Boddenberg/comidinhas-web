# Comidinhas Web

Frontend em `React + Vite + TypeScript` para consumir o BFF local do projeto Comidinhas.

## Como rodar

1. Instale as dependencias:

```bash
npm install
```

2. Para teste local, o projeto ja inclui `.env.local` com `VITE_API_BASE_URL=/`.

No ambiente de desenvolvimento, o Vite faz proxy de `/health` e `/api/*` para `http://localhost:8000`, evitando erro de CORS no navegador.

Se quiser trocar a URL depois, copie e edite:

```bash
cp .env.example .env.local
```

3. Suba o frontend:

```bash
npm run dev
```

## Rotas

- `/`
- `/chat`
- `/restaurantes-proximos`

## Estrutura

- `src/app`: shell e roteamento
- `src/features`: modulos por feature
- `src/shared`: client HTTP, config, utilitarios e UI compartilhada
