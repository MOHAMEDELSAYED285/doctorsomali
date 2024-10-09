import Image from 'next/image'
import ClientWrapper from './ClientWrapper'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-white flex flex-col items-center justify-center py-8 px-4">
      <header className="text-center mb-8">
        <div className="inline-block bg-white p-4 rounded-full shadow-md mb-4">
          <Image
            src="/images/Flag-Somalia.png"
            alt="Somali Flag"
            width={80}
            height={80}
            className="rounded-full"
          />
        </div>
        <h1 className="text-4xl font-bold text-blue-600 mb-2">DOC AI</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Fadlan sharax calaamadahaaga oo ka jawaab dhowr su&apos;aalood oo dheeraad ah.
          <br />
          (Please describe your symptoms and answer a few follow-up questions.)
        </p>
      </header>

      <main className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
        <ClientWrapper />
      </main>

      <footer className="mt-12 text-center text-sm text-gray-500">
      </footer>
    </div>
  )
}