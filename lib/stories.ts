export type TropeTag =
  | 'Pengkhianatan'
  | 'Rahasia Keluarga'
  | 'Second Chance'
  | 'Warisan'
  | 'Kebangkitan Diri'
  | 'Romance'
  | 'Pernikahan Kontrak'
  | 'Cinta Lama'

export interface ChoiceOption {
  id: string
  label: string
  hint?: string
}

export interface Chapter {
  number: number
  title: string
  paragraphs: string[]
  choicePrompt?: string
  choices?: ChoiceOption[]
}

export interface JejakItem {
  chapter: number
  decision: string
  consequence: string
}

export interface Story {
  id: string
  title: string
  cover: string
  tagline: string
  synopsis: string
  role: string
  tropes: TropeTag[]
  totalChapters: number
  currentChapter: number
  status: 'BERJALAN' | 'SELESAI' | 'BARU'
  endingName?: string
  jejak: JejakItem[]
}

export const stories: Story[] = [
  {
    id: 'pesan-terakhir',
    title: 'Pesan Terakhir di Ponselnya',
    cover: '/covers/pesan-terakhir.png',
    tagline: 'Satu notifikasi mengubah segalanya.',
    synopsis:
      'Kamu menemukan pesan dari wanita lain di ponsel suamimu—tepat di malam ulang tahun pernikahan kalian. Kamu akan langsung menghadapinya, atau mencari bukti lebih dulu?',
    role: 'Alya, 29 tahun — istri yang selama ini memilih percaya',
    tropes: ['Pengkhianatan', 'Kebangkitan Diri', 'Rahasia Keluarga'],
    totalChapters: 50,
    currentChapter: 12,
    status: 'BERJALAN',
    jejak: [
      {
        chapter: 3,
        decision: 'Pura-pura belum tahu.',
        consequence: 'Raka mulai lengah. Kamu mendapat akses ke laptop kerjanya.',
      },
      {
        chapter: 7,
        decision: 'Simpan bukti itu untuk dirimu sendiri.',
        consequence: 'Ibu mertuamu mulai curiga dengan sikap tenangmu.',
      },
      {
        chapter: 11,
        decision: 'Temui Nadia secara diam-diam.',
        consequence: 'Kamu tahu Nadia juga dibohongi. Sekutu baru, atau jebakan baru?',
      },
    ],
  },
  {
    id: 'warisan-tersembunyi',
    title: 'Warisan yang Tersembunyi',
    cover: '/covers/warisan-yang-tersembunyi.png',
    tagline: 'Surat itu tidak seharusnya sampai padamu.',
    synopsis:
      'Sehari setelah pemakaman ayahmu, sebuah surat bersegel tiba. Isinya: kamu pewaris tunggal—dan seluruh keluargamu sudah tahu sejak lama.',
    role: 'Laras, 27 tahun — anak yang selalu dianggap tidak penting',
    tropes: ['Warisan', 'Rahasia Keluarga', 'Kebangkitan Diri'],
    totalChapters: 50,
    currentChapter: 50,
    status: 'SELESAI',
    endingName: 'Harga Kejujuran',
    jejak: [
      {
        chapter: 9,
        decision: 'Tunjukkan surat itu pada notaris, bukan keluargamu.',
        consequence: 'Kamu selangkah lebih cepat dari om Bram.',
      },
      {
        chapter: 24,
        decision: 'Maafkan ibumu, tapi jangan lupakan.',
        consequence: 'Hubungan kalian pulih perlahan—dengan syarat yang kamu tentukan.',
      },
      {
        chapter: 41,
        decision: 'Katakan yang sebenarnya di rapat keluarga.',
        consequence: 'Semua topeng terbuka. Tidak ada jalan kembali.',
      },
    ],
  },
  {
    id: 'di-balik-kaca',
    title: 'Di Balik Kaca',
    cover: '/covers/di-balik-kaca.png',
    tagline: 'Atasan barumu adalah masa lalumu.',
    synopsis:
      'Hari pertama kerja di kantor impianmu, kamu bertemu direktur baru: laki-laki yang meninggalkanmu lima tahun lalu tanpa penjelasan. Dan sekarang, dia yang memegang kariermu.',
    role: 'Sekar, 26 tahun — profesional muda yang tidak mau jatuh dua kali',
    tropes: ['Cinta Lama', 'Second Chance', 'Romance'],
    totalChapters: 50,
    currentChapter: 1,
    status: 'BARU',
    jejak: [],
  },
  {
    id: 'koper-di-depan-pintu',
    title: 'Koper di Depan Pintu',
    cover: '/covers/koper-di-depan-pintu.png',
    tagline: 'Malam ini kamu harus memilih: pergi, atau bertahan.',
    synopsis:
      'Pernikahan kontrak itu seharusnya berakhir bulan depan. Tapi tadi malam, dia memintamu tinggal—dan pagi ini kamu menemukan alasan sebenarnya di laci mejanya.',
    role: 'Ratri, 30 tahun — istri kontrak yang mulai lupa ini hanya kontrak',
    tropes: ['Pernikahan Kontrak', 'Romance', 'Pengkhianatan'],
    totalChapters: 50,
    currentChapter: 5,
    status: 'BERJALAN',
    jejak: [
      {
        chapter: 4,
        decision: 'Tanyakan langsung soal perpanjangan kontrak.',
        consequence: 'Dia menghindar. Untuk pertama kalinya, kamu melihatnya gugup.',
      },
    ],
  },
]

export function getStory(id: string): Story | undefined {
  return stories.find((s) => s.id === id)
}

export const sampleChapter: Chapter = {
  number: 12,
  title: 'Malam Tanpa Jawaban',
  paragraphs: [
    'Hujan turun sejak sore, dan kamu masih duduk di ruang tamu dengan ponsel Raka di genggamanmu.',
    'Layarnya sudah mati. Tapi kalimat itu masih menyala di kepalamu.',
    '“Aku kangen. Kapan kamu bilang ke dia?”',
    'Pintu depan terbuka. Langkah Raka terdengar berat—dia selalu begitu kalau pulang larut.',
    '“Kamu belum tidur?” suaranya hati-hati, seperti sedang mengukur jarak.',
    'Kamu meletakkan ponselnya di meja. Pelan. Tanpa suara.',
    'Mata Raka mengikuti gerakan tanganmu, lalu berhenti di layar yang gelap itu.',
    'Untuk beberapa detik, tidak ada yang bicara. Hanya hujan.',
    '“Alya…” dia mulai.',
    '“Duduk,” katamu. Suaramu lebih tenang dari yang kamu duga.',
    'Dia duduk. Di ujung sofa. Jauh.',
    'Kamu menatapnya, dan untuk pertama kalinya dalam enam tahun, kamu tidak tahu siapa laki-laki di depanmu ini.',
    '“Siapa Nadia?”',
    'Rahangnya mengeras. “Dari mana kamu—”',
    '“Jawab dulu pertanyaanku.”',
    'Di luar, hujan makin deras. Di dalam, ada sesuatu yang sedang runtuh perlahan.',
    'Raka menunduk. Kedua tangannya saling menggenggam, seperti orang yang sedang berdoa—atau menyerah.',
    '“Dia… bukan siapa-siapa yang perlu kamu khawatirkan.”',
    'Justru kalimat itu yang membuat dadamu sesak. Bukan siapa-siapa tidak mengirim pesan jam dua pagi.',
    'Kamu berdiri. Kunci mobil ada di meja. Kamar tamu ada di lantai atas. Dan kebenaran—entah ada di mana.',
  ],
  choicePrompt: 'Dia menunggu reaksimu. Satu keputusan malam ini bisa mengubah semuanya.',
  choices: [
    {
      id: 'hadapi',
      label: 'Hadapi dia sekarang. Minta dia buka semua pesannya.',
      hint: 'Keputusan ini bisa mengubah hubungan kalian.',
    },
    {
      id: 'pergi',
      label: 'Ambil kunci mobil dan pergi malam ini juga.',
      hint: 'Keputusan ini bisa mengubah hubungan kalian.',
    },
    {
      id: 'simpan',
      label: 'Naik ke kamar tamu. Simpan pertanyaanmu untuk besok.',
    },
  ],
}

export const consequenceByChoice: Record<string, string[]> = {
  hadapi: [
    'Raka tidak langsung menjawab.',
    'Tapi ketika dia akhirnya menyerahkan ponselnya, tangannya gemetar—dan kamu tahu, apa pun yang akan kamu baca, malam ini kalian tidak akan tidur.',
  ],
  pergi: [
    'Suara pintu yang kamu tutup terdengar lebih keras dari hujan.',
    'Di kaca spion, kamu melihat lampu ruang tamu masih menyala. Dia tidak mengejar. Dan entah kenapa, itu yang paling menyakitkan.',
  ],
  simpan: [
    'Kamu menaiki tangga tanpa menoleh.',
    'Di bawah, Raka tidak bergerak dari sofa. Namun untuk pertama kalinya, ia berhenti memanggilmu dengan nama lengkapmu.',
  ],
}
