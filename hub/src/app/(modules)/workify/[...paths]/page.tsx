interface Props {
  params: {
    paths: string[]
  }
}

export default function WorkifyPage({ params }: Props) {
  // Placeholder page for Workify module routing
  // In production, this would proxy or redirect to the actual Workify frontend
  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">
          👥 Workify
        </h1>
        <p className="text-gray-600 mb-4">
          Módulo de Recursos Humanos
        </p>
        <p className="text-sm text-gray-500">
          Ruta: /{params.paths.join('/')}
        </p>
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
          <p className="text-gray-700">
            Frontend ejecutándose en: <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3004</code>
          </p>
        </div>
      </div>
    </div>
  )
}