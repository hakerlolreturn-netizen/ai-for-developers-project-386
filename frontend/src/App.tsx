import { Route, Routes } from 'react-router'
import BookPage from './pages/BookPage.tsx'
import HomePage from './pages/HomePage.tsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/book" element={<BookPage />} />
    </Routes>
  )
}

export default App
