import express from 'express'
import cors from 'cors'
import { ensureDb } from './db'
import { attachUser } from './auth'
import authRoutes from './routes/auth'
import catalogRoutes from './routes/catalog'
import adminRoutes from './routes/admin'
import patientRoutes from './routes/patient'
import doctorRoutes from './routes/doctor'
import pharmacyRoutes from './routes/pharmacy'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

// Khởi tạo lược đồ + dữ liệu nền một lần cho mỗi tiến trình
app.use(async (_req, _res, next) => {
  try {
    await ensureDb()
  } catch (e) {
    return next(e)
  }
  next()
})

app.use(attachUser)

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'BriMed API', time: new Date().toISOString() }))
app.use('/api/auth', authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/patient', patientRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/pharmacy', pharmacyRoutes)
app.use('/api/admin', adminRoutes)

app.use((_req, res) => res.status(404).json({ error: 'Không tìm thấy API.' }))
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err)
  res.status(500).json({ error: 'Lỗi máy chủ, vui lòng thử lại.' })
})

export default app
