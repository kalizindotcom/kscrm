# Fix: Erro 413 (Payload Too Large) no Upload de Imagens

## 🐛 Problema

Ao fazer upload de imagens nas campanhas, o sistema retorna erro **HTTP 413 (Payload Too Large)**.

## 🔍 Causa

O **Traefik** (proxy reverso do Dokploy) tem um limite padrão de **1MB** para o tamanho do body das requisições. Imagens maiores que isso são bloqueadas antes de chegar ao backend.

## ✅ Solução

### Opção 1: Configurar via Labels do Docker no Dokploy

1. Acesse o **Dokploy Dashboard**
2. Vá em **Applications** → Selecione seu app **backend**
3. Clique em **Settings** → **Advanced**
4. Adicione as seguintes **Docker Labels**:

```yaml
traefik.http.middlewares.upload-limit.buffering.maxRequestBodyBytes=52428800
traefik.http.routers.YOUR-APP-NAME.middlewares=upload-limit
```

**Nota:** Substitua `YOUR-APP-NAME` pelo nome real da sua aplicação no Dokploy.

O valor `52428800` = **50MB** (50 * 1024 * 1024 bytes)

### Opção 2: Configurar via Variável de Ambiente no Dokploy

1. Acesse o **Dokploy Dashboard**
2. Vá em **Applications** → Selecione seu app **backend**
3. Clique em **Environment Variables**
4. Adicione:

```bash
UPLOAD_MAX_MB=50
```

5. **Redeploy** a aplicação

### Opção 3: Configurar Traefik Globalmente (Recomendado para produção)

Se você tem acesso SSH à VPS:

1. Conecte via SSH:
```bash
ssh user@your-vps-ip
```

2. Edite a configuração do Traefik:
```bash
cd /etc/dokploy/traefik
nano traefik.yml
```

3. Adicione na seção `http`:
```yaml
http:
  middlewares:
    upload-limit:
      buffering:
        maxRequestBodyBytes: 52428800  # 50MB
```

4. Reinicie o Traefik:
```bash
docker restart traefik
```

## 🎯 Valores Recomendados

| Tipo de Arquivo | Tamanho Recomendado |
|-----------------|---------------------|
| Imagens (PNG, JPG) | 10-20 MB |
| Vídeos curtos | 50-100 MB |
| Documentos (PDF) | 10-30 MB |

**Configuração atual do backend:** 100MB (definido em `env.ts`)

## 🧪 Testar a Correção

Após aplicar a configuração:

1. Faça **redeploy** da aplicação no Dokploy
2. Aguarde 1-2 minutos para o Traefik recarregar
3. Tente fazer upload de uma imagem novamente
4. O upload deve funcionar sem erro 413

## 📝 Notas Importantes

- O limite do **backend** (100MB) já está configurado corretamente
- O problema está **apenas no Traefik/Dokploy**
- Após a correção, você poderá fazer upload de arquivos até **50MB**
- Se precisar de arquivos maiores, aumente o valor em ambos os lugares

## 🔗 Referências

- [Traefik Buffering Middleware](https://doc.traefik.io/traefik/middlewares/http/buffering/)
- [Dokploy Documentation](https://docs.dokploy.com/)
