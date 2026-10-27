import { Button, Container, Grid, List, Paper, Text, Title } from '@mantine/core'
import { Link } from 'react-router'

function HomePage() {
  return (
    <Container size="lg" py="xl">
      <Grid gap="xl">
        <Grid.Col span={{ base: 12, md: 7 }}>
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
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Paper withBorder radius="md" p="lg">
            <Title order={2}>Возможности</Title>
            <List mt="md" spacing="sm" c="dimmed">
              <List.Item>Выбор типа встречи и удобного времени для звонка.</List.Item>
              <List.Item>Запись без регистрации: достаточно имени и email.</List.Item>
              <List.Item>Владелец заводит типы встреч и видит все предстоящие встречи.</List.Item>
            </List>
          </Paper>
        </Grid.Col>
      </Grid>
    </Container>
  )
}

export default HomePage
