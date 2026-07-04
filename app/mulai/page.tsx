'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Step = 0 | 1 | 2 | 3 | 4

interface Question {
  key: string
  prompt: string
  helper?: string
  options: string[]
}

const questions: Question[] = [
  {
    key: 'trope',
    prompt: 'Drama seperti apa yang ingin kamu jalani?',
    helper: 'Pilih konflik utama untuk peranmu.',
    options: [
      'Pasangan yang berkhianat',
      'Pernikahan kontrak yang berubah arah',
      'Rahasia keluarga dan warisan',
      'Cinta lama yang kembali',
      'Bangkit setelah dipermalukan',
    ],
  },
  {
    key: 'sikap',
    prompt: 'Bagaimana tokohmu biasanya menghadapi konflik?',
    helper: 'Ini menentukan pilihan yang akan sering muncul.',
    options: [
      'Tenang dan menyusun rencana',
      'Langsung menghadapi, apa pun risikonya',
      'Menyimpan semuanya sampai waktunya tiba',
    ],
  },
  {
    key: 'hubungan',
    prompt: 'Hubungan seperti apa yang ingin kamu bentuk?',
    helper: 'Satu love interest utama akan hadir dalam ceritamu.',
    options: [
      'Cinta yang harus diperjuangkan lagi',
      'Sekutu yang perlahan menjadi lebih',
      'Fokus pada diriku sendiri dulu',
    ],
  },
  {
    key: 'akhir',
    prompt: 'Akhir seperti apa yang paling ingin kamu kejar?',
    helper: 'Cerita tetap bisa berubah karena pilihanmu.',
    options: [
      'Keadilan — semua rahasia terbuka',
      'Kedamaian — melepaskan dan melangkah',
      'Kemenangan — merebut kembali posisiku',
    ],
  },
]

interface Proposal {
  id: string
  title: string
  role: string
  teaser: string
  tags: string[]
}

const proposals: Proposal[] = [
  {
    id: 'p1',
    title: 'Sebelum Semua Terbakar',
    role: 'Alya, 29 — istri yang berhenti diam',
    teaser:
      'Kamu menemukan bukti pengkhianatan tepat sebelum akuisisi perusahaan keluarga. Membukanya sekarang berarti menghancurkan lebih dari satu rumah tangga.',
    tags: ['Pengkhianatan', 'Rahasia Keluarga', 'Kebangkitan Diri'],
  },
  {
    id: 'p2',
    title: 'Dua Nama di Satu Surat',
    role: 'Alya, 29 — pewaris yang tidak pernah diberi tahu',
    teaser:
      'Surat wasiat itu menyebut namamu—dan nama wanita yang selama ini dekat dengan suamimu. Kalian berbagi lebih dari sekadar rahasia.',
    tags: ['Warisan', 'Pengkhianatan', 'Misteri'],
  },
  {
    id: 'p3',
    title: 'Pulang Sebagai Orang Lain',
    role: 'Alya, 29 — kembali setelah tiga tahun menghilang',
    teaser:
      'Semua orang mengira kamu sudah selesai. Kamu kembali dengan bukti, nama baru, dan satu orang dari masa lalu yang tidak seharusnya kamu temui lagi.',
    tags: ['Kebangkitan Diri', 'Cinta Lama', 'Balas Dendam'],
  },
]

export default function MulaiPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null)
  const [preparing, setPreparing] = useState(false)

  const totalQuestionSteps = questions.length
  const isQuestionStep = step < totalQuestionSteps
  const question = isQuestionStep ? questions[step] : null

  function pickAnswer(key: string, value: string) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setTimeout(() => setStep((s) => (s + 1) as Step), 220)
  }

  function confirmStory() {
    setPreparing(true)
    setTimeout(() => router.push('/baca/pesan-terakhir'), 2600)
  }

  if (preparing) {
    return (
      <main className="mx-auto flex min-h-svh w-full max-w-md flex-col items-center justify-center gap-6 bg-background px-8 text-center">
        <span className="lk-pulse-soft font-serif text-3xl text-foreground">lakoku</span>
        <div className="flex flex-col gap-2">
          <h1 className="font-serif text-2xl leading-snug text-foreground text-balance">
            Peranmu sedang disiapkan.
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Dunia ceritamu, tokoh-tokohnya, dan rahasia yang menunggumu sedang disusun. Sebentar
            lagi kamu masuk ke Bab 1.
          </p>
        </div>
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <div className="lk-pulse-soft h-full w-2/3 bg-primary" />
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col bg-background px-5 pb-10 pt-6">
      <header className="flex items-center gap-3">
        {step === 0 ? (
          <Link
            href="/beranda"
            aria-label="Kembali ke Beranda"
            className="flex size-10 items-center justify-center rounded-full bg-card text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setStep((s) => (s - 1) as Step)}
            aria-label="Kembali ke langkah sebelumnya"
            className="flex size-10 items-center justify-center rounded-full bg-card text-foreground"
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </button>
        )}
        <div className="flex flex-1 items-center gap-1.5" aria-hidden="true">
          {Array.from({ length: totalQuestionSteps + 1 }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1 flex-1 rounded-full transition-colors',
                i <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>
      </header>

      {isQuestionStep && question && (
        <section key={question.key} className="lk-fade-up mt-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-lavender">
              PILIH PERANMU — {step + 1} DARI {totalQuestionSteps}
            </span>
            <h1 className="font-serif text-3xl leading-tight text-foreground text-balance">
              {question.prompt}
            </h1>
            {question.helper && (
              <p className="text-sm text-muted-foreground">{question.helper}</p>
            )}
          </div>
          <div className="flex flex-col gap-3" role="group" aria-label={question.prompt}>
            {question.options.map((opt) => {
              const selected = answers[question.key] === opt
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => pickAnswer(question.key, opt)}
                  className={cn(
                    'flex min-h-14 items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-left text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-card text-foreground hover:border-primary/50',
                  )}
                >
                  {opt}
                  {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              )
            })}
          </div>
        </section>
      )}

      {step === totalQuestionSteps && !selectedProposal && (
        <section className="lk-fade-up mt-10 flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold tracking-wide text-lavender">
              BANDINGKAN CERITA
            </span>
            <h1 className="font-serif text-3xl leading-tight text-foreground text-balance">
              Tiga cerita disiapkan untukmu. Pilih satu untuk kamu jalani.
            </h1>
          </div>
          <div className="flex flex-col gap-4">
            {proposals.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProposal(p.id)}
                className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/60"
              >
                <div className="flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-medium text-secondary-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                <h2 className="font-serif text-xl leading-snug text-foreground">{p.title}</h2>
                <p className="text-xs font-medium text-primary">{p.role}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{p.teaser}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {step === totalQuestionSteps && selectedProposal && (
        <section className="lk-fade-up mt-10 flex flex-1 flex-col gap-6">
          {(() => {
            const p = proposals.find((x) => x.id === selectedProposal)!
            return (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-[11px] font-semibold tracking-wide text-lavender">
                    RINGKASAN CERITA
                  </span>
                  <h1 className="font-serif text-3xl leading-tight text-foreground text-balance">
                    {p.title}
                  </h1>
                  <p className="text-sm text-muted-foreground">{p.teaser}</p>
                </div>

                <dl className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1 rounded-2xl bg-card p-4">
                    <dt className="text-[11px] font-semibold tracking-wide text-lavender">
                      PERANMU
                    </dt>
                    <dd className="text-sm text-foreground">{p.role}</dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-2xl bg-card p-4">
                    <dt className="text-[11px] font-semibold tracking-wide text-lavender">
                      PANJANG CERITA
                    </dt>
                    <dd className="text-sm text-foreground">
                      50 bab — dengan beberapa akhir cerita yang berbeda, tergantung pilihanmu.
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1 rounded-2xl bg-card p-4">
                    <dt className="text-[11px] font-semibold tracking-wide text-lavender">
                      JANJI CERITA
                    </dt>
                    <dd className="text-sm leading-relaxed text-foreground">
                      Pilihanmu mengubah kepercayaan, membuka rahasia, dan menentukan akhir yang
                      kamu capai. Tidak ada pilihan yang &ldquo;benar&rdquo;&mdash;hanya akibatnya.
                    </dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-col gap-3 pt-4">
                  <button
                    type="button"
                    onClick={confirmStory}
                    className="flex min-h-13 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Masuk ke Cerita Ini
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProposal(null)}
                    className="flex min-h-13 items-center justify-center rounded-2xl border border-border px-6 text-sm font-semibold text-foreground transition-colors hover:bg-card"
                  >
                    Lihat Cerita Lain
                  </button>
                </div>
              </>
            )
          })()}
        </section>
      )}
    </main>
  )
}
