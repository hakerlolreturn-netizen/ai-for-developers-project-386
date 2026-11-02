import { Anchor, Badge, Container, Group, List, Stack, Text, Title } from '@mantine/core'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'
import { inZone } from '../time.ts'

type Meeting = components['schemas']['Meeting']
type Owner = components['schemas']['Owner']

const meetingDay = (meeting: Meeting, timeZone: string) =>
  inZone(meeting.start, timeZone).format('YYYY-MM-DD')
const timeRange = (meeting: Meeting, timeZone: string) =>
  `${inZone(meeting.start, timeZone).format('HH:mm')}–${inZone(meeting.end, timeZone).format('HH:mm')}`

function groupByDay(meetings: Meeting[], timeZone: string) {
  const days = new Map<string, Meeting[]>()
  for (const meeting of meetings) {
    const day = meetingDay(meeting, timeZone)
    days.set(day, [...(days.get(day) ?? []), meeting])
  }
  return [...days]
}

function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>()
  const [owner, setOwner] = useState<Owner>()
  const [now] = useState(() => Date.now())
  const timeZone = owner?.timeZone ?? 'UTC'

  useEffect(() => {
    let active = true
    api.GET('/api/meetings').then(({ data }) => {
      if (active) setMeetings(data)
    })
    api.GET('/api/owner').then(({ data }) => {
      if (active) setOwner(data)
    })
    return () => {
      active = false
    }
  }, [])

  return (
    <Container size="sm" py="xl">
      <Title order={1}>Предстоящие встречи · время по Москве</Title>
      {owner && meetings?.length === 0 && <Text mt="md">Предстоящих встреч нет</Text>}
      <Stack mt="md" gap="lg">
        {groupByDay(owner ? (meetings ?? []) : [], timeZone).map(([day, dayMeetings]) => (
          <div key={day}>
            <Title order={2} size="h4">
              {dayjs(day).locale('ru').format('dddd, D MMMM')}
            </Title>
            <List listStyleType="none" mt="xs" spacing="xs">
              {dayMeetings.map((meeting) => (
                <List.Item key={meeting.id}>
                  <Group gap="xs">
                    <Text>
                      {`${timeRange(meeting, timeZone)} · ${meeting.meetingType.name} · ${meeting.guestName} · ${meeting.guestEmail}`}
                    </Text>
                    {new Date(meeting.start).getTime() <= now && (
                      <Badge color="green">идёт сейчас</Badge>
                    )}
                  </Group>
                </List.Item>
              ))}
            </List>
          </div>
        ))}
      </Stack>
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default MeetingsPage
