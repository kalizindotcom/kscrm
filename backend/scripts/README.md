# Scripts de Administração

Este diretório contém scripts utilitários para gerenciamento do sistema.

## Scripts Disponíveis

### reset-admin-password.ts
Reseta a senha do usuário admin para a senha padrão.

**Uso:**
```bash
npm run reset-admin-password
```

**Credenciais após reset:**
- Email: `admin@kscsm.com`
- Senha: `admin123`

⚠️ **IMPORTANTE:** Altere a senha imediatamente após fazer login!

### update-admin-role.ts
Atualiza a role de um usuário para super_admin.

**Uso:**
```bash
npm run update-admin
```

## Seed

Para criar o usuário admin inicial, use:
```bash
npm run seed
```

Isso criará o usuário com as credenciais definidas no arquivo `.env`:
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `SEED_ADMIN_NAME`
