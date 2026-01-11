import { Router } from 'express'
import { authRouter } from './auth.js'
import { shopflowRouter } from './shopflow.js'
import { workifyRouter } from './workify.js'

export const apiRouter = Router()

// Mount module routers
apiRouter.use('/auth', authRouter)
apiRouter.use('/shopflow', shopflowRouter)
apiRouter.use('/workify', workifyRouter)

// Root API endpoint
apiRouter.get('/', (req, res) => {
  res.json({
    message: 'MultiSystem API',
    version: '1.0.0',
    modules: ['auth', 'shopflow', 'workify']
  })
})
