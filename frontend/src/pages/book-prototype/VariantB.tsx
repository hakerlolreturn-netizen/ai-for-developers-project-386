// PROTOTYPE: вариант B — таблица типов, затем три панели (тип / календарь / слоты), форма в модальном окне.
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Container,
  Grid,
  Modal,
  ScrollArea,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { useMemo, useState } from 'react'
import { StateDump } from '../../components/PrototypeSwitcher.tsx'
import {
  type ApiError,
  type Meeting,
  type Slot,
  createMeeting,
  formatDay,
  getSlots,
  groupByDay,
  meetingTypes,
  owner,
  timeLabel,
  windowBounds,
} from './stub.ts'

export const name = 'Три панели и модальная форма'

export function VariantB() {
  const [typeId, setTypeId] = useState<string | null>(null)
  const [day, setDay] = useState<string | null>(null)
  const [slot, setSlot] = useState<Slot | null>(null)
  const [guestName, setGuestName] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [meeting, setMeeting] = useState<Meeting | null>(null)
  const [version, setVersion] = useState(0)

  const type = meetingTypes.find((t) => t.id === typeId)
  const byDay = useMemo(() => groupByDay(typeId ? getSlots(typeId) : []), [typeId, version])
  const daySlots = day ? (byDay.get(day) ?? []) : []
  const { min, max } = windowBounds()

  const submit = async () => {
    if (!typeId || !slot) return
    const res = await createMeeting(typeId, slot.start, guestName, guestEmail)
    if (res.ok) {
      setMeeting(res.meeting)
      setSlot(null)
      setError(null)
    } else {
      setError(res.error)
      if (res.error.code !== 'validation_error') {
        setSlot(null)
        setVersion((v) => v + 1)
      }
    }
  }

  const state = {
    typeId,
    day,
    slot,
    guestName,
    guestEmail,
    error,
    meeting,
    slotsOnDay: daySlots.length,
  }

  if (meeting) {
    return (
      <Container size="sm" py="xl">
        <Title order={2}>Встреча назначена</Title>
        <Table mt="md">
          <Table.Tbody>
            <Table.Tr>
              <Table.Th>Тип встречи</Table.Th>
              <Table.Td>{meeting.meetingType.name}</Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Когда</Table.Th>
              <Table.Td>
                {formatDay(meeting.start.slice(0, 10))}, {timeLabel(meeting.start)}–
                {timeLabel(meeting.end)} (Москва)
              </Table.Td>
            </Table.Tr>
            <Table.Tr>
              <Table.Th>Гость</Table.Th>
              <Table.Td>
                {meeting.guestName}, {meeting.guestEmail}
              </Table.Td>
            </Table.Tr>
          </Table.Tbody>
        </Table>
        <StateDump state={state} />
      </Container>
    )
  }

  if (!type) {
    return (
      <Container size="md" py="xl">
        <Title order={1}>Запись на звонок: {owner.name}</Title>
        <Table mt="lg" highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Тип встречи</Table.Th>
              <Table.Th>Описание</Table.Th>
              <Table.Th>Длительность</Table.Th>
              <Table.Th />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {meetingTypes.map((t) => (
              <Table.Tr key={t.id}>
                <Table.Td fw={600}>{t.name}</Table.Td>
                <Table.Td c="dimmed">{t.description || '—'}</Table.Td>
                <Table.Td>{t.durationMinutes} мин</Table.Td>
                <Table.Td>
                  <Button size="xs" onClick={() => setTypeId(t.id)}>
                    Выбрать время
                  </Button>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
        <StateDump state={state} />
      </Container>
    )
  }

  return (
    <Container size="lg" py="xl">
      <Grid gap="xl">
        <Grid.Col span={3}>
          <Stack gap="xs">
            <Text c="dimmed">{owner.name}</Text>
            <Title order={3}>{type.name}</Title>
            <Badge variant="light">{type.durationMinutes} мин</Badge>
            <Text size="sm">{type.description}</Text>
            <Text size="sm" c="dimmed">
              Время по Москве
            </Text>
            <Anchor size="sm" onClick={() => setTypeId(null)}>
              Другой тип встречи
            </Anchor>
          </Stack>
        </Grid.Col>
        <Grid.Col span={5}>
          <DatePicker
            size="md"
            value={day}
            onChange={setDay}
            minDate={min}
            maxDate={max}
            excludeDate={(d) => !byDay.has(d)}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          {day ? (
            <>
              <Text fw={600} mb="sm">
                {formatDay(day)}
              </Text>
              <ScrollArea h={360}>
                <Stack gap="xs">
                  {daySlots.map((s) => (
                    <Button key={s.start} variant="outline" fullWidth onClick={() => setSlot(s)}>
                      {timeLabel(s.start)}
                    </Button>
                  ))}
                </Stack>
              </ScrollArea>
            </>
          ) : (
            <Text c="dimmed">Выберите день в календаре</Text>
          )}
        </Grid.Col>
      </Grid>
      {error && error.code !== 'validation_error' && !slot && (
        <Alert
          color="red"
          mt="md"
          title={error.message}
          withCloseButton
          onClose={() => setError(null)}
        >
          Слоты дня обновлены, занятое время убрано
        </Alert>
      )}
      <Modal opened={!!slot} onClose={() => setSlot(null)} title="Ваши данные">
        {slot && day && (
          <Stack>
            <Text>
              {type.name}: {formatDay(day)}, {timeLabel(slot.start)}–{timeLabel(slot.end)}
            </Text>
            <TextInput
              label="Имя"
              value={guestName}
              onChange={(e) => setGuestName(e.currentTarget.value)}
              error={error?.fields?.guestName}
            />
            <TextInput
              label="Email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.currentTarget.value)}
              error={error?.fields?.guestEmail}
            />
            <Button onClick={submit}>Записаться</Button>
          </Stack>
        )}
      </Modal>
      <StateDump state={state} />
    </Container>
  )
}
