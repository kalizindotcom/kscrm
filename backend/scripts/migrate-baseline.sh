#!/bin/bash
# Script para fazer baseline e aplicar migrations em produção

echo "🔄 Fazendo baseline do banco de dados..."

# Marcar todas as migrations existentes como aplicadas (baseline)
npx prisma migrate resolve --applied "20260425_add_multi_tenant_structure"
npx prisma migrate resolve --applied "20250128000000_remove_organizations"

echo "✅ Baseline concluído!"

# Agora aplicar qualquer migration pendente
echo "🔄 Aplicando migrations..."
npx prisma migrate deploy

echo "✅ Migrations aplicadas com sucesso!"
