import { Anchor, Container, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

function MeetingsPage() {
  return (
    <Container size="sm" py="xl">
      <Title order={1}>Предстоящие встречи</Title>
      <Text mt="md">Скоро здесь появится список предстоящих встреч</Text>
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default MeetingsPage
