import { Anchor, AppShell, Button, Group } from '@mantine/core'
import { Link, Route, Routes } from 'react-router'
import BookPage from './pages/BookPage.tsx'
import HomePage from './pages/HomePage.tsx'
import MeetingsPage from './pages/MeetingsPage.tsx'

function App() {
  return (
    <AppShell header={{ height: 60 }}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Anchor component={Link} to="/" fw={700} size="xl" underline="never">
            Calendar
          </Anchor>
          <Group gap="sm">
            <Button component={Link} to="/book">
              Записаться
            </Button>
            <Button component={Link} to="/meetings" variant="default">
              Предстоящие встречи
            </Button>
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/book" element={<BookPage />} />
          <Route path="/meetings" element={<MeetingsPage />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
