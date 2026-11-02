import {
  Alert,
  Anchor,
  Badge,
  Container,
  Group,
  Paper,
  Stack,
  Stepper,
  Text,
  Title,
} from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'

type Owner = components['schemas']['Owner']
type MeetingType = components['schemas']['MeetingType']

function MeetingTypeList() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>()

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types').then(({ data }) => {
      if (active) setMeetingTypes(data)
    })
    return () => {
      active = false
    }
  }, [])

  if (!meetingTypes) return null
  if (meetingTypes.length === 0) return <Text mt="md">Владелец ещё не добавил типы встреч</Text>
  return (
    <Stack mt="md">
      {meetingTypes.map(({ id, name, description, durationMinutes }) => (
        <Paper key={id} component={Link} to={`/book/${id}`} withBorder p="md" td="none" c="inherit">
          <Group justify="space-between">
            <Text fw={600}>{name}</Text>
            <Badge variant="light">{durationMinutes} мин</Badge>
          </Group>
          {description && (
            <Text size="sm" c="dimmed" mt={4}>
              {description}
            </Text>
          )}
        </Paper>
      ))}
    </Stack>
  )
}

function SelectedMeetingType({ id }: { id: string }) {
  const [meetingType, setMeetingType] = useState<MeetingType | null>()

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types/{id}', { params: { path: { id } } }).then(({ data }) => {
      if (active) setMeetingType(data ?? null)
    })
    return () => {
      active = false
    }
  }, [id])

  if (meetingType === undefined) return null
  if (meetingType === null) {
    return (
      <Alert mt="md" color="red" title="Такого типа встречи нет">
        <Anchor component={Link} to="/book">
          К списку типов встреч
        </Anchor>
      </Alert>
    )
  }
  return (
    <Text mt="md">
      {meetingType.name}, {meetingType.durationMinutes} мин
    </Text>
  )
}

function BookPage() {
  const { id } = useParams()
  const [owner, setOwner] = useState<Owner>()

  useEffect(() => {
    let active = true
    api.GET('/api/owner').then(({ data }) => {
      if (active) setOwner(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Запись на звонок</Title>
      {owner && (
        <>
          <Text mt="md">{owner.name}</Text>
          <Text c="dimmed">время по Москве</Text>
        </>
      )}
      <Stepper active={id ? 1 : 0} mt="lg">
        <Stepper.Step label="Тип встречи">
          <MeetingTypeList />
        </Stepper.Step>
        <Stepper.Step label="Время">{id && <SelectedMeetingType key={id} id={id} />}</Stepper.Step>
        <Stepper.Step label="Данные" />
      </Stepper>
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default BookPage
