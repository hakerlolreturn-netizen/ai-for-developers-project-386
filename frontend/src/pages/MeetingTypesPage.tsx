import {
  Anchor,
  Button,
  Container,
  SegmentedControl,
  Stack,
  Table,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useEffect, useState, type SubmitEvent } from 'react'
import { Link } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'

type MeetingType = components['schemas']['MeetingType']
type Fields = Record<string, string>

const DURATIONS = ['15', '30', '45', '60']

function MeetingTypesPage() {
  const [meetingTypes, setMeetingTypes] = useState<MeetingType[]>()
  const [id, setId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('30')
  const [errors, setErrors] = useState<Fields>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    api.GET('/api/meeting-types').then(({ data }) => {
      if (active) setMeetingTypes(data)
    })
    return () => {
      active = false
    }
  }, [])

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    const { data, error } = await api.POST('/api/meeting-types', {
      body: {
        id,
        name,
        description,
        durationMinutes: Number(duration) as MeetingType['durationMinutes'],
      },
    })
    setSubmitting(false)
    if (data) {
      setErrors({})
      setId('')
      setName('')
      setDescription('')
      setDuration('30')
      setMeetingTypes((current) => [...(current ?? []), data])
      notifications.show({ message: 'Тип встречи создан', color: 'green' })
    } else if (error && 'fields' in error) {
      setErrors(error.fields)
    } else if (error?.code === 'meeting_type_id_taken') {
      setErrors({ id: error.message })
    }
  }

  return (
    <Container size="md" py="xl">
      <Title order={1}>Типы встреч</Title>
      <form onSubmit={submit} noValidate>
        <Stack mt="md" maw={480}>
          <TextInput
            label="Идентификатор"
            description="Строчная латиница, цифры и одиночные дефисы, до 50 символов"
            value={id}
            onChange={(event) => setId(event.currentTarget.value)}
            error={errors.id}
          />
          <Text size="sm" c="dimmed">{`/book/${id || '<id>'}`}</Text>
          <TextInput
            label="Название"
            value={name}
            onChange={(event) => setName(event.currentTarget.value)}
            error={errors.name}
          />
          <Textarea
            label="Описание"
            minRows={3}
            value={description}
            onChange={(event) => setDescription(event.currentTarget.value)}
            error={errors.description}
          />
          <div>
            <Text size="sm" fw={500} mb={4}>
              Длительность, мин
            </Text>
            <SegmentedControl data={DURATIONS} value={duration} onChange={setDuration} />
            {errors.durationMinutes && (
              <Text size="xs" c="red" mt={4}>
                {errors.durationMinutes}
              </Text>
            )}
          </div>
          <Button type="submit" loading={submitting}>
            Создать
          </Button>
        </Stack>
      </form>

      {meetingTypes?.length === 0 && <Text mt="xl">Типов встреч пока нет</Text>}
      {meetingTypes && meetingTypes.length > 0 && (
        <Table mt="xl">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Id</Table.Th>
              <Table.Th>Название</Table.Th>
              <Table.Th>Длительность</Table.Th>
              <Table.Th>Описание</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {meetingTypes.map((meetingType) => (
              <Table.Tr key={meetingType.id}>
                <Table.Td>{meetingType.id}</Table.Td>
                <Table.Td>{meetingType.name}</Table.Td>
                <Table.Td>{`${meetingType.durationMinutes} мин`}</Table.Td>
                <Table.Td>{meetingType.description}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default MeetingTypesPage
