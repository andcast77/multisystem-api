import Link from 'next/link'
import { ReactNode } from 'react'

interface ModuleCardProps {
  title: string
  description: string
  features: string[]
  href: string
  color: string
  icon: ReactNode
}

export default function ModuleCard({
  title,
  description,
  features,
  href,
  color,
  icon,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      className="group block h-full"
    >
      <div className="h-full p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 transform hover:-translate-y-1"
        style={{ borderLeftColor: color }}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="text-4xl mb-4">{icon}</div>
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center`}
            style={{ backgroundColor: `${color}15` }}
          >
            <svg
              className="w-6 h-6 transition-transform group-hover:translate-x-1"
              style={{ color }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </div>
        </div>
        
        <h3 className={`text-2xl font-bold mb-3`} style={{ color }}>
          {title}
        </h3>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {description}
        </p>
        
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Características principales:
          </p>
          <ul className="space-y-2">
            {features.map((feature, index) => (
              <li key={index} className="flex items-center text-gray-700">
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0"
                  style={{ color }}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="mt-6 pt-6 border-t border-gray-100">
          <span className={`text-sm font-semibold inline-flex items-center`} style={{ color }}>
            Acceder al módulo
            <svg
              className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  )
}
