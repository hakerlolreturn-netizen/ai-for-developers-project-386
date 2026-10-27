import { Badge, Button, Container, Group, List, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

type BackendStatus = 'loading' | 'ok' | 'unavailable'

function HomePage() {
  const [status, setStatus] = useState<BackendStatus>('loading')

  useEffect(() => {
    fetch('/api/health')
      .then((response) => setStatus(response.ok ? 'ok' : 'unavailable'))
      .catch(() => setStatus('unavailable'))
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      <Text mt="md">
        Выберите удобное время для звонка с владельцем календаря. Регистрация не нужна.
      </Text>
      <List type="ordered" mt="md">
        <List.Item>Выберите тип встречи</List.Item>
        <List.Item>Выберите свободный слот</List.Item>
        <List.Item>Оставьте имя и email</List.Item>
      </List>
      <Button component={Link} to="/book" mt="xl">
        Записаться
      </Button>
      <Group mt="xl">
        <Text>Бекенд:</Text>
        <Badge color={status === 'ok' ? 'green' : status === 'loading' ? 'gray' : 'red'}>
          {status}
        </Badge>
      </Group>
    </Container>
  )
}

export default HomePage
