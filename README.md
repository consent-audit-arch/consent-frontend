# Consent Lifecycle & Audit Console

Console web para explorar o ciclo de consentimento: conceder, acessar dados, revogar e investigar as decisões registradas no histórico.

Interface do **Consent & Audit Architecture**, projeto pessoal de Renan Rohers iniciado no TCC.

[Visão geral e execução local](https://github.com/consent-audit-arch/infra#readme) · [Arquitetura](https://github.com/consent-audit-arch/infra/blob/main/docs/architecture.md)

## O que dá para explorar

- Gestão de consentimentos por titular, categoria e finalidade.
- Cobranças e promoções com chamadas a serviços protegidos.
- Linha do tempo com decisões permitidas e negadas, histórico e JSON dos registros.
- Auditoria por trace, indicadores e alternância entre perfis de demonstração.
- Geração de massa de dados pelo navegador.

Na linha do tempo, o destaque “Neste acesso” indica o último evento de concessão ou revogação encontrado até o instante da decisão para aquela categoria e finalidade. As frações de segundo são preservadas na comparação. Esse destaque contextualiza os registros; não certifica a conclusão da operação de negócio.

## Stack

React 19 · TypeScript · Vite 6 · Tailwind CSS 4 · TanStack Query · Axios · Nginx.

## Desenvolvimento

Pré-requisito: Node.js 20.19+ com npm e backend configurado pelo [guia central](https://github.com/consent-audit-arch/infra#executar-localmente).

```bash
npm ci
npm run dev
```

Abra `http://localhost:5173`. O Vite encaminha as APIs para as portas locais 8080–8086 e os tokens para o Keycloak em 8180. Os proxies estão em `vite.config.ts`; o equivalente Docker está em `nginx.conf`.

```bash
npm run build
```

O build executa a checagem TypeScript e gera `dist/`. A imagem Docker compila a aplicação e serve os arquivos pelo Nginx; no Compose, o console fica em `http://localhost:8087`.

## Autenticação de demonstração

O fluxo ativo do console usa password grant do client público `consent-console`, com sessão no armazenamento local e entrada automática como `testuser`. Os usuários `testuser`, `auditor1` e `operador1` são criados por `infra/setup-keycloak.sh`, com senha de demonstração `testpass` por padrão. O seletor usa essa senha fixa; se ela for alterada no setup, use o formulário de login.

Essa configuração facilita a exploração local. A migração do fluxo ativo para Authorization Code + PKCE é uma evolução prevista antes de uso fora do ambiente de demonstração.

## Estrutura

```text
src/api/          Clientes das APIs e propagação de correlação
src/auth/         Sessão e autenticação
src/components/   Componentes compartilhados
src/pages/        Consentimentos, cenários de negócio, auditoria e timeline
src/utils/        Consulta do histórico no instante da decisão
src/types/        Contratos TypeScript
```
