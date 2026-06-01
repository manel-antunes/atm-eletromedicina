import { Pool } from 'pg'
import dotenv from 'dotenv'

dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function inicializarDB(): Promise<void> {
  const client = await pool.connect()
  try {
    // ── Tabelas existentes ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS equipamentos (
        id SERIAL PRIMARY KEY,
        numero_sap VARCHAR(50) UNIQUE NOT NULL,
        descricao TEXT NOT NULL,
        marca VARCHAR(100),
        modelo VARCHAR(100),
        numero_serie VARCHAR(100),
        data_calibracao VARCHAR(50),
        responsavel VARCHAR(100),
        warning VARCHAR(50),
        localizacao VARCHAR(200),
        obs TEXT, obs2 TEXT, obs3 TEXT,
        cc_pasta_2025 VARCHAR(100),
        periodicidade VARCHAR(20) DEFAULT 'Anual',
        criado_em TIMESTAMP DEFAULT NOW(),
        atualizado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS calibracoes (
        id SERIAL PRIMARY KEY,
        equipamento_sap VARCHAR(50) NOT NULL,
        data_calibracao DATE NOT NULL,
        tecnico VARCHAR(100),
        entidade VARCHAR(100),
        observacoes TEXT,
        relatorio VARCHAR(200),
        aprovado_por VARCHAR(100),
        criado_em TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (equipamento_sap) REFERENCES equipamentos(numero_sap)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS documentos (
        id SERIAL PRIMARY KEY,
        equipamento_sap VARCHAR(50),
        nome VARCHAR(200) NOT NULL,
        tipo VARCHAR(50),
        tamanho INT,
        dados TEXT NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS descricoes_equipamentos (
        id SERIAL PRIMARY KEY,
        equipamento_sap VARCHAR(50) UNIQUE NOT NULL,
        descricao_tecnica TEXT,
        gerado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS cedencias (
        id SERIAL PRIMARY KEY,
        equipamento_sap VARCHAR(50) NOT NULL,
        equipamento_nome TEXT,
        destino VARCHAR(200),
        responsavel VARCHAR(100),
        contacto VARCHAR(100),
        data_saida DATE,
        data_retorno_prevista DATE,
        data_retorno_efetiva DATE,
        ativa BOOLEAN DEFAULT TRUE,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (equipamento_sap) REFERENCES equipamentos(numero_sap)
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS historico_emails (
        id SERIAL PRIMARY KEY,
        data VARCHAR(20), hora VARCHAR(20),
        destinatarios TEXT,
        total_alertas INT, vencidas INT, urgentes INT, em_breve INT,
        sucesso BOOLEAN, erro TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS config_email (
        id SERIAL PRIMARY KEY,
        destinatarios TEXT,
        agendamento_ativo BOOLEAN DEFAULT FALSE,
        dia_semana VARCHAR(5) DEFAULT '1',
        hora VARCHAR(10) DEFAULT '08:00',
        incluir_vencidas BOOLEAN DEFAULT TRUE,
        incluir_urgentes BOOLEAN DEFAULT TRUE,
        incluir_em_breve BOOLEAN DEFAULT TRUE
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS preventivas_plano (
        id SERIAL PRIMARY KEY,
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        total INTEGER DEFAULT 0,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    await client.query(`
      CREATE TABLE IF NOT EXISTS preventivas_equipamentos (
        id SERIAL PRIMARY KEY,
        plano_id INTEGER REFERENCES preventivas_plano(id),
        mes INTEGER NOT NULL,
        ano INTEGER NOT NULL,
        cod_ativo TEXT, nome TEXT, marca TEXT, modelo TEXT,
        numero_serie TEXT, cod_localizacao TEXT, localizacao TEXT,
        setor TEXT, area TEXT,
        concluido BOOLEAN DEFAULT FALSE,
        concluido_em TIMESTAMP,
        concluido_por TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    // ── NOVAS TABELAS ─────────────────────────────────────────────────────

    // Utilizadores com bcrypt e roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        nome VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'tecnico',
        ativo BOOLEAN DEFAULT TRUE,
        criado_em TIMESTAMP DEFAULT NOW(),
        ultimo_login TIMESTAMP
      )
    `)

    // Refresh tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT UNIQUE NOT NULL,
        device_info TEXT,
        ip VARCHAR(50),
        expira_em TIMESTAMP NOT NULL,
        criado_em TIMESTAMP DEFAULT NOW(),
        revogado BOOLEAN DEFAULT FALSE
      )
    `)

    // Audit log
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        username VARCHAR(50),
        acao VARCHAR(100) NOT NULL,
        entidade VARCHAR(50),
        entidade_id VARCHAR(50),
        detalhes JSONB,
        ip VARCHAR(50),
        criado_em TIMESTAMP DEFAULT NOW()
      )
    `)

    // Seed: cria utilizadores iniciais se a tabela estiver vazia
    const usersExist = await client.query('SELECT COUNT(*) FROM users')
    if (parseInt(usersExist.rows[0].count) === 0) {
      // bcrypt hash de 'atm2026' e 'hprt2026' — gerados com rounds=10
      // Nota: estes hashes são gerados no arranque se não existirem utilizadores
      console.log('ℹ️  Tabela users vazia — a criar utilizadores iniciais via seed...')
      // O seed real é feito no server.ts após bcrypt estar disponível
    }

    console.log('✅ Base de dados inicializada!')
  } finally {
    client.release()
  }
}