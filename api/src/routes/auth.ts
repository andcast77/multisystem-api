import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../lib/prisma.js'

export const authRouter = Router()

// Health check
authRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'auth' })
})

// ========================================
// LOGIN
// ========================================

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        roleAssignments: {
          include: {
            role: true,
            company: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
        userPreferences: true,
      },
    })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Retornar información según el módulo que la solicite
    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      roles: user.roleAssignments.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        companyId: ur.companyId,
        company: ur.company,
      })),
      permissions: user.permissions.map(up => ({
        id: up.permission.id,
        name: up.permission.name,
        resource: up.permission.resource,
        action: up.permission.action,
      })),
      preferences: user.userPreferences,
    }

    res.json({
      user: userResponse,
      token: 'mock-jwt-token', // TODO: Implementar JWT real
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Error during login' })
  }
})

// ========================================
// REGISTER
// ========================================

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        phone,
        role: role || 'USER',
        isActive: true,
      },
    })

    // Crear preferencias por defecto
    await prisma.userPreferences.create({
      data: {
        userId: user.id,
        language: 'es',
      },
    })

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    }

    res.status(201).json({
      user: userResponse,
      token: 'mock-jwt-token', // TODO: Implementar JWT real
    })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Error during registration' })
  }
})

// ========================================
// GET CURRENT USER
// ========================================

authRouter.get('/me', async (req: Request, res: Response) => {
  try {
    // TODO: Extraer userId del token JWT
    const userId = req.headers['x-user-id'] as string

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        roleAssignments: {
          include: {
            role: true,
            company: true,
          },
        },
        permissions: {
          include: {
            permission: true,
          },
        },
        userPreferences: true,
      },
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const userResponse = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      twoFactorEnabled: user.twoFactorEnabled,
      roles: user.roleAssignments.map(ur => ({
        id: ur.role.id,
        name: ur.role.name,
        companyId: ur.companyId,
        company: ur.company,
      })),
      permissions: user.permissions.map(up => ({
        id: up.permission.id,
        name: up.permission.name,
        resource: up.permission.resource,
        action: up.permission.action,
      })),
      preferences: user.userPreferences,
    }

    res.json(userResponse)
  } catch (error) {
    console.error('Get me error:', error)
    res.status(500).json({ error: 'Error fetching user' })
  }
})

// ========================================
// LOGOUT
// ========================================

authRouter.post('/logout', async (req: Request, res: Response) => {
  try {
    // TODO: Invalidar token JWT si se usa blacklist
    res.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({ error: 'Error during logout' })
  }
})
