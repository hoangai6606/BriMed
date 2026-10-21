import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import PackagePage from './pages/PackagePage'
import Partner from './pages/Partner'
import Auth from './pages/Auth'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/nha-thuoc-doi-tac" element={<Partner />} />
      <Route path="/goi-1-thang-brimed-nha-thuoc" element={<PackagePage pkg="1" />} />
      <Route path="/goi-3-thang-brimed-nha-thuoc" element={<PackagePage pkg="3" />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
