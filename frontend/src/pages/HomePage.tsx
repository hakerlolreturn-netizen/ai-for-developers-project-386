import { Button, Container, List, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

function HomePage() {
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
    </Container>
  )
}

export default HomePage
