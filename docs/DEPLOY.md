# Deploy Automático - GitHub Pages

Este projeto está configurado para fazer deploy automático no GitHub Pages sempre que você fizer push para a branch `main`.

## Configuração Inicial (Fazer apenas uma vez)

### 1. Instalar dependências
```bash
pnpm install
```

### 2. Ativar GitHub Pages no Repositório

1. Vá para o seu repositório no GitHub
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em **Source** (Origem), selecione:
   - **Source**: GitHub Actions
5. Salve as configurações

### 3. Fazer o primeiro deploy

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

## Como Funciona

1. **Push automático**: Toda vez que você fizer `git push` para a branch `main`, o GitHub Actions irá:
   - Instalar as dependências com pnpm
   - Fazer build da aplicação
   - Fazer deploy automático no GitHub Pages

2. **URL da aplicação**: Após o primeiro deploy, sua aplicação estará disponível em:
   ```
   https://[seu-usuario].github.io/[nome-do-repositorio]
   ```

3. **Acompanhar o deploy**:
   - Vá em **Actions** no seu repositório
   - Veja o progresso do workflow "Deploy to GitHub Pages"
   - Aguarde o ✅ verde confirmando que o deploy foi bem-sucedido

## Comandos Úteis

```bash
# Desenvolvimento local
pnpm dev

# Build local (testar antes do deploy)
cd apps/web && pnpm build

# Visualizar build local
cd apps/web && pnpm preview
```

## Troubleshooting

### Erro 404 após deploy
- Verifique se o GitHub Pages está ativado corretamente
- Certifique-se que a branch é `main` (não `master`)

### Build falha no GitHub Actions
- Verifique os logs em **Actions**
- Teste o build localmente: `cd apps/web && pnpm build`

### Página não atualiza
- Limpe o cache do navegador (Ctrl + F5)
- Aguarde alguns minutos (pode levar até 10 minutos)

