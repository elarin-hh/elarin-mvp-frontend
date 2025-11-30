# Deploy S3 + CloudFront (SPA)

Objetivo: servir o frontend como SPA totalmente estática no S3, distribuída pelo CloudFront, consumindo o backend via `VITE_API_BASE_URL`.

## O que já foi feito
- Migrado para `@sveltejs/adapter-static` com fallback `index.html` (suporte de SPA no S3/CloudFront).
- Desligado SSR e prerender apenas para a shell pública; rotas autenticadas e de auth não são prerenderadas para evitar chamadas ao backend no build.
- Guards de auth movidos para o cliente (sem `+server` e sem `/api/*` locais).
- Logout agora depende apenas do endpoint do backend.
- CSP agora permite o domínio do backend (lido via `VITE_API_BASE_URL`) e Supabase; liberado `style-src 'unsafe-inline'` para estilos inline já existentes.

## Variáveis de ambiente
- `VITE_API_BASE_URL` (obrigatória em produção) — ex.: `https://api.suaempresa.com`.
- `BASE_PATH` (opcional) — use se a app for servida em um subpath do CloudFront (ex.: `/app`).
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (apenas se o frontend consumir Supabase diretamente; caso contrário, deixe vazias).

## Build local
```bash
pnpm install
pnpm build
# saída estática: build/ (usar para upload no S3)
```

## Backend/CORS (crítico)
- Habilitar `Access-Control-Allow-Credentials: true`.
- `Access-Control-Allow-Origin` deve ser o domínio do CloudFront (não usar `*` quando houver credenciais).
- Permitir métodos/headers usados (`GET,POST,PUT,PATCH,DELETE,OPTIONS`, `Content-Type`, `Authorization`, `Cookie`).
- Responder `Set-Cookie` em logout/login/refresh com `SameSite=None; Secure` para funcionar via HTTPS.

## Passo a passo S3
1) Criar bucket S3 público apenas via CloudFront (bloquear acesso público direto; usar OAC).  
2) Upload do conteúdo de `build/`.  
3) Definir documento de índice: `index.html`.  
4) Definir página de erro personalizada: `index.html` (para que rotas do SPA não quebrem).

## Passo a passo CloudFront
1) Origin: bucket S3 com OAC.  
2) Comportamento padrão:
   - Viewer protocol policy: Redirect HTTP to HTTPS.
   - Compress objects: On.
   - Cache policy: respeitar headers do S3; considere Forward Cookies/Headers para `Set-Cookie` não ser cacheado.  
   - CORS: deixar com o backend (ver seção acima).
3) Erros customizados: mapear 403 e 404 para `index.html` (HTTP 200) para suportar SPA.  
4) Headers de segurança (Response headers policy): adicionar `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(self), microphone=()`.  
5) Domínio customizado (opcional): criar certificado ACM (us-east-1) e apontar DNS para a distribuição.

## Operação e PWA
- O plugin PWA gera `service-worker.js` e `workbox-*.js` no build; CloudFront deve servir com `cache-control: no-cache` para SW (ou invalidar após deploy).  
- Sempre invalidar `/*` após publicar nova versão ou use versionamento no caminho do deploy.  
- Para staging, use outro bucket/distribuição e outro `VITE_API_BASE_URL`.

## Roadmap (próximos incrementos)
- Ajustar CORS/backend conforme descrito e validar login/logout no domínio final.
- Reduzir tam. de bundles (warning >500 kB) com code-splitting manual ou lazy loading.
- Limpar warnings restantes (slot depreciado em `src/routes/+layout.svelte`, seletores CSS não usados).
- Opcional: adicionar `BASE_PATH` no pipeline se a distribuição não estiver na raiz do domínio.
