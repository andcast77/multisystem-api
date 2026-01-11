import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { apiRouter } from './routes/index.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Middleware CORS
// Acepta requests del hub (3005) y de los módulos (3003, 3004)
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:3003',  // ShopFlow frontend
  'http://localhost:3004',  // Workify frontend
  'http://localhost:3005'   // Hub frontend
]

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true)
    
    // Verificar si el origin está en la lista permitida
    if (corsOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())

// API Routes
app.use('/api', apiRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'multisystem-api' })
})

app.listen(PORT, () => {
  console.log(`🚀 MultiSystem API running on port ${PORT}`)
})
