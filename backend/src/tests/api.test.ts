import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from '../server'
import { pool, inicializarDB } from '../database'

// ── Setup / Teardown ──────────────────────────────────────
beforeAll(async () => {
  await inicializarDB()
  // Garante utilizador de teste
  const bcrypt = await import('bcrypt')
  const hash = await bcrypt.hash('Admin@1234', 10)
  await pool.query(`
    INSERT INTO users (username, password_hash, nome, role)
    VALUES ('test_admin', $1, 'Admin Teste', 'admin')
    ON CONFLICT (username) DO UPDATE SET password_hash = $1, ativo = TRUE
  `, [hash])
})

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE username = 'test_admin'")
  await pool.end()
})

// ── Health check ──────────────────────────────────────────
describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
    expect(res.body.db).toBe('ok')
  })
})

// ── Login ─────────────────────────────────────────────────
describe('POST /api/login', () => {
  it('retorna token com credenciais corretas', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'test_admin', password: 'Admin@1234' })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.refreshToken).toBeDefined()
    expect(res.body.role).toBe('admin')
  })

  it('retorna 401 com password errada', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'test_admin', password: 'errada' })
    expect(res.status).toBe(401)
    expect(res.body.erro).toBeDefined()
  })

  it('retorna 401 com utilizador inexistente', async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'nao_existe', password: 'qualquer' })
    expect(res.status).toBe(401)
  })

  it('rejeita campos em falta', async () => {
    const res = await request(app).post('/api/login').send({})
    expect(res.status).toBe(401)
  })
})

// ── Rotas protegidas ──────────────────────────────────────
describe('Rotas autenticadas', () => {
  let token: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'test_admin', password: 'Admin@1234' })
    token = res.body.token
  })

  it('GET /api/me retorna dados do utilizador', async () => {
    const res = await request(app)
      .get('/api/me')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('test_admin')
  })

  it('GET /api/me sem token retorna 401', async () => {
    const res = await request(app).get('/api/me')
    expect(res.status).toBe(401)
  })

  it('GET /api/users requer role admin', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('GET /api/audit requer role admin', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.registos).toBeDefined()
  })
})

// ── Política de password ──────────────────────────────────
describe('Política de password', () => {
  let token: string

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/login')
      .send({ username: 'test_admin', password: 'Admin@1234' })
    token = res.body.token
  })

  it('rejeita password fraca ao criar utilizador', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'u_fraco', password: '1234', nome: 'Fraco', role: 'tecnico' })
    expect(res.status).toBe(400)
    expect(res.body.erro).toMatch(/password/)
  })

  it('rejeita password sem maiúscula', async () => {
    const res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${token}`)
      .send({ username: 'u_fraco2', password: 'sem_maiuscula1!', nome: 'Fraco', role: 'tecnico' })
    expect(res.status).toBe(400)
  })
})
