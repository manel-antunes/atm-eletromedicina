import { config } from 'dotenv'

// Carrega variáveis de ambiente de teste — usa DB de teste se disponível
config({ path: '.env.test', override: false })
config({ path: '.env', override: false })

process.env.NODE_ENV = 'test'
// JWT secrets para testes
process.env.JWT_SECRET ??= 'test-secret-jwt'
process.env.JWT_REFRESH_SECRET ??= 'test-secret-refresh'
