import { Anchor, Container, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

function BookPage() {
  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      <Text mt="md">Скоро здесь можно будет выбрать тип встречи и слот</Text>
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default BookPage
