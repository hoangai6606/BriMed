import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { pool, nowIso } from './db'

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')

declare module 'express-serve-static-core' {
  interface Request {
    user?: any
  }
}

export async function createSession(userId: number): Promise<string> {
  const token = crypto.randomBytes(24).toString('hex')
  await pool.query('INSERT INTO sessions (token, user_id, created_at) VALUES ($1, $2, $3)', [token, userId, nowIso()])
  return token
}

export async function attachUser(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : ''
    if (token) {
      const { rows } = await pool.query(
        'SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = $1',
        [token]
      )
      if (rows[0]) {
        req.user = rows[0]
        res.locals.token = token
      }
    }
    next()
  } catch (e) {
    next(e)
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Cần đăng nhập để tiếp tục.' })
  next()
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Cần đăng nhập để tiếp tục.' })
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Tài khoản không có quyền thực hiện thao tác này.' })
    }
    next()
  }
}

export function publicUser(u: any) {
  if (!u) return null
  return {
    id: u.id,
    full_name: u.full_name,
    phone: u.phone,
    cccd: u.cccd,
    role: u.role,
    doctor_specialty: u.doctor_specialty,
    doctor_license: u.doctor_license,
    doctor_online: !!u.doctor_online,
    pharmacy_id: u.pharmacy_id,
  }
}

export function mePayload(user: any) {
  return { user: publicUser(user) }
}

export { nowIso }
