import express from 'express'
import cors from 'cors'
import { attachUser } from './auth.js'
import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import patientRoutes from './routes/patient.js'
import doctorRoutes from './routes/doctor.js'
import pharmacyRoutes from './routes/pharmacy.js'
import adminRoutes from './routes/admin.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))
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

const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`BriMed API đang chạy tại http://localhost:${PORT}`)
})
