import { Badge, Container, Group, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'

type BackendStatus = 'loading' | 'ok' | 'unavailable'

function App() {
  const [status, setStatus] = useState<BackendStatus>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setStatus(response.ok ? 'ok' : 'unavailable'))
      .catch(() => setStatus('unavailable'))
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Календарь звонков</Title>
      <Group mt="md">
        <Text>Бекенд:</Text>
        <Badge color={status === 'ok' ? 'green' : status === 'loading' ? 'gray' : 'red'}>
          {status}
        </Badge>
      </Group>
    </Container>
  )
}

export default App
