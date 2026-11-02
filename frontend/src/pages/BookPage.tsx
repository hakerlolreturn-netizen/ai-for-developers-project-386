import { Anchor, Container, Text, Title } from '@mantine/core'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import type { components } from '../../../api/dist/schema.d.ts'
import { api } from '../api.ts'

type Owner = components['schemas']['Owner']

function BookPage() {
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
      <Anchor component={Link} to="/" mt="md" display="inline-block">
        На главную
      </Anchor>
    </Container>
  )
}

export default BookPage
