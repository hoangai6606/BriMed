import app from './app'

// Chạy local: DATABASE_URL="<connection string>" npm run dev
const PORT = Number(process.env.PORT || 4000)
app.listen(PORT, () => {
  console.log(`BriMed API đang chạy tại http://localhost:${PORT}`)
})
