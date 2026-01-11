export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">MultiSystem Hub</h3>
            <p className="text-sm">
              Plataforma unificada para gestión empresarial. 
              Todos tus módulos en un solo lugar.
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Módulos</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="/shopflow" className="hover:text-white transition-colors">
                  ShopFlow
                </a>
              </li>
              <li>
                <a href="/workify" className="hover:text-white transition-colors">
                  Workify
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">Información</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Documentación
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Soporte
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} MultiSystem Hub. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
