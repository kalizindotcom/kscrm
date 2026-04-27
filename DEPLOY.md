# Docker Deploy - KS CSM

Este projeto agora usa Docker para deploy completo (backend + frontend + banco de dados).

## Estrutura

- `backend/Dockerfile` - Container do backend Node.js
- `Dockerfile` - Container do frontend (Nginx)
- `docker-compose.yml` - Orquestração de todos os serviços
- `deploy.sh` - Script de deploy automático

## Deploy no Ploi

### Configuração Inicial

1. No painel do Ploi, vá em **Site → Deploy Script**
2. Cole este script:

```bash
cd /caminho/do/seu/projeto
bash deploy.sh
```

3. Salve e ative o **Auto Deploy** no GitHub

### O que acontece no deploy

1. Ploi detecta push no GitHub
2. Executa `deploy.sh` automaticamente
3. O script:
   - Puxa código novo
   - Para containers antigos
   - Rebuilda imagens com código novo
   - Sobe containers atualizados
   - **Tudo reinicia automaticamente!**

### Portas

- Frontend: `80` (Nginx)
- Backend: `3333` (Node.js)
- Postgres: `5432`
- Redis: `6379`

### Variáveis de Ambiente

Certifique-se que o arquivo `backend/.env` existe na VPS com as variáveis corretas.

## Comandos Úteis

```bash
# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Reiniciar serviço específico
docker-compose restart backend
docker-compose restart frontend

# Ver status
docker-compose ps

# Parar tudo
docker-compose down

# Subir tudo
docker-compose up -d
```

## Primeira vez na VPS

```bash
# Instalar Docker (se não tiver)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose (se não tiver)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Primeira subida
docker-compose up -d --build
```
