import { notFound } from 'next/navigation'
import { getStory, stories } from '@/lib/stories'
import { ReaderView } from '@/components/reader-view'

export function generateStaticParams() {
  return stories.map((s) => ({ id: s.id }))
}

export default async function BacaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const story = getStory(id)
  if (!story) notFound()

  return <ReaderView story={story} />
}
