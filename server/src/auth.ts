import crypto from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import { db, nowIso, publicUser } from './db.js'

export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex')
export const newToken = () => crypto.randomBytes(24).toString('hex')

declare module 'express-serve-static-core' {
  interface Request {
    user?: any
  }
}

export function createSession(userId: number): string {
  const token = newToken()
  db.prepare('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)').run(token, userId, nowIso())
  return token
}

export function attachUser(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token) {
    const row = db
      .prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ?')
      .get(token)
    if (row) {
      req.user = row
      res.locals.token = token
    }
  }
  next()
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

export function mePayload(user: any) {
  let extra: any = {}
  if (user.role === 'pharmacy' && user.pharmacy_id) {
    extra.pharmacy = db.prepare('SELECT * FROM pharmacies WHERE id = ?').get(user.pharmacy_id)
  }
  return { user: publicUser(user), ...extra }
}
