import { Router, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'

export const workifyRouter = Router()

// Health check
workifyRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', module: 'workify' })
})

// ========================================
// COMPANIES
// ========================================

workifyRouter.get('/companies', async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        parent: true,
        children: true,
        _count: {
          select: {
            employees: true,
            departments: true,
          },
        },
      },
    })
    res.json(companies)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching companies' })
  }
})

workifyRouter.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        parent: true,
        children: true,
        departments: true,
        employees: true,
      },
    })
    if (!company) {
      return res.status(404).json({ error: 'Company not found' })
    }
    res.json(company)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching company' })
  }
})

workifyRouter.post('/companies', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.create({
      data: req.body,
    })
    res.status(201).json(company)
  } catch (error) {
    res.status(500).json({ error: 'Error creating company' })
  }
})

workifyRouter.put('/companies/:id', async (req: Request, res: Response) => {
  try {
    const company = await prisma.company.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(company)
  } catch (error) {
    res.status(500).json({ error: 'Error updating company' })
  }
})

workifyRouter.delete('/companies/:id', async (req: Request, res: Response) => {
  try {
    await prisma.company.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting company' })
  }
})

// ========================================
// DEPARTMENTS
// ========================================

workifyRouter.get('/departments', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const departments = await prisma.department.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        parent: true,
        children: true,
        company: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })
    res.json(departments)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching departments' })
  }
})

workifyRouter.post('/departments', async (req: Request, res: Response) => {
  try {
    const department = await prisma.department.create({
      data: req.body,
    })
    res.status(201).json(department)
  } catch (error) {
    res.status(500).json({ error: 'Error creating department' })
  }
})

workifyRouter.put('/departments/:id', async (req: Request, res: Response) => {
  try {
    const department = await prisma.department.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(department)
  } catch (error) {
    res.status(500).json({ error: 'Error updating department' })
  }
})

workifyRouter.delete('/departments/:id', async (req: Request, res: Response) => {
  try {
    await prisma.department.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting department' })
  }
})

// ========================================
// POSITIONS
// ========================================

workifyRouter.get('/positions', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const positions = await prisma.position.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        company: true,
        _count: {
          select: {
            employees: true,
          },
        },
      },
    })
    res.json(positions)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching positions' })
  }
})

workifyRouter.post('/positions', async (req: Request, res: Response) => {
  try {
    const position = await prisma.position.create({
      data: req.body,
    })
    res.status(201).json(position)
  } catch (error) {
    res.status(500).json({ error: 'Error creating position' })
  }
})

workifyRouter.put('/positions/:id', async (req: Request, res: Response) => {
  try {
    const position = await prisma.position.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(position)
  } catch (error) {
    res.status(500).json({ error: 'Error updating position' })
  }
})

workifyRouter.delete('/positions/:id', async (req: Request, res: Response) => {
  try {
    await prisma.position.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting position' })
  }
})

// ========================================
// ROLES
// ========================================

workifyRouter.get('/roles', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const roles = await prisma.role.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        parent: true,
        children: true,
        company: true,
      },
    })
    res.json(roles)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching roles' })
  }
})

workifyRouter.post('/roles', async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.create({
      data: req.body,
    })
    res.status(201).json(role)
  } catch (error) {
    res.status(500).json({ error: 'Error creating role' })
  }
})

workifyRouter.put('/roles/:id', async (req: Request, res: Response) => {
  try {
    const role = await prisma.role.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(role)
  } catch (error) {
    res.status(500).json({ error: 'Error updating role' })
  }
})

workifyRouter.delete('/roles/:id', async (req: Request, res: Response) => {
  try {
    await prisma.role.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting role' })
  }
})

// ========================================
// WORK SHIFTS
// ========================================

workifyRouter.get('/work-shifts', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const shifts = await prisma.workShift.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        company: true,
      },
    })
    res.json(shifts)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching work shifts' })
  }
})

workifyRouter.post('/work-shifts', async (req: Request, res: Response) => {
  try {
    const shift = await prisma.workShift.create({
      data: req.body,
    })
    res.status(201).json(shift)
  } catch (error) {
    res.status(500).json({ error: 'Error creating work shift' })
  }
})

workifyRouter.put('/work-shifts/:id', async (req: Request, res: Response) => {
  try {
    const shift = await prisma.workShift.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(shift)
  } catch (error) {
    res.status(500).json({ error: 'Error updating work shift' })
  }
})

workifyRouter.delete('/work-shifts/:id', async (req: Request, res: Response) => {
  try {
    await prisma.workShift.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting work shift' })
  }
})

// ========================================
// EMPLOYEES
// ========================================

workifyRouter.get('/employees', async (req: Request, res: Response) => {
  try {
    const { companyId, departmentId, status, search } = req.query
    const where: any = {}
    
    if (companyId) where.companyId = companyId as string
    if (departmentId) where.departmentId = departmentId as string
    if (status) where.status = status
    
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
      ]
    }
    
    const employees = await prisma.employee.findMany({
      where,
      include: {
        company: true,
        department: true,
        position: true,
        user: true,
      },
    })
    res.json(employees)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching employees' })
  }
})

workifyRouter.get('/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: req.params.id },
      include: {
        company: true,
        department: true,
        position: true,
        user: true,
        timeEntries: true,
      },
    })
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' })
    }
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching employee' })
  }
})

workifyRouter.post('/employees', async (req: Request, res: Response) => {
  try {
    const employee = await prisma.employee.create({
      data: req.body,
    })
    res.status(201).json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Error creating employee' })
  }
})

workifyRouter.put('/employees/:id', async (req: Request, res: Response) => {
  try {
    const employee = await prisma.employee.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(employee)
  } catch (error) {
    res.status(500).json({ error: 'Error updating employee' })
  }
})

workifyRouter.delete('/employees/:id', async (req: Request, res: Response) => {
  try {
    await prisma.employee.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting employee' })
  }
})

// ========================================
// TIME ENTRIES
// ========================================

workifyRouter.get('/time-entries', async (req: Request, res: Response) => {
  try {
    const { employeeId, companyId, startDate, endDate } = req.query
    const where: any = {}
    
    if (employeeId) where.employeeId = employeeId as string
    if (companyId) where.companyId = companyId as string
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }
    
    const timeEntries = await prisma.timeEntry.findMany({
      where,
      include: {
        employee: true,
        company: true,
      },
      orderBy: {
        date: 'desc',
      },
    })
    res.json(timeEntries)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching time entries' })
  }
})

workifyRouter.post('/time-entries', async (req: Request, res: Response) => {
  try {
    const timeEntry = await prisma.timeEntry.create({
      data: req.body,
    })
    res.status(201).json(timeEntry)
  } catch (error) {
    res.status(500).json({ error: 'Error creating time entry' })
  }
})

workifyRouter.put('/time-entries/:id', async (req: Request, res: Response) => {
  try {
    const timeEntry = await prisma.timeEntry.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(timeEntry)
  } catch (error) {
    res.status(500).json({ error: 'Error updating time entry' })
  }
})

workifyRouter.delete('/time-entries/:id', async (req: Request, res: Response) => {
  try {
    await prisma.timeEntry.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting time entry' })
  }
})

// ========================================
// HOLIDAYS
// ========================================

workifyRouter.get('/holidays', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const holidays = await prisma.holidays.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        company: true,
      },
    })
    res.json(holidays)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching holidays' })
  }
})

workifyRouter.post('/holidays', async (req: Request, res: Response) => {
  try {
    const holiday = await prisma.holidays.create({
      data: req.body,
    })
    res.status(201).json(holiday)
  } catch (error) {
    res.status(500).json({ error: 'Error creating holiday' })
  }
})

workifyRouter.put('/holidays/:id', async (req: Request, res: Response) => {
  try {
    const holiday = await prisma.holidays.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(holiday)
  } catch (error) {
    res.status(500).json({ error: 'Error updating holiday' })
  }
})

workifyRouter.delete('/holidays/:id', async (req: Request, res: Response) => {
  try {
    await prisma.holidays.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting holiday' })
  }
})

// ========================================
// SCHEDULES
// ========================================

workifyRouter.get('/schedules', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query
    const schedules = await prisma.schedule.findMany({
      where: employeeId ? { employeeId: employeeId as string } : undefined,
      include: {
        employee: true,
        workShift: true,
      },
    })
    res.json(schedules)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching schedules' })
  }
})

workifyRouter.post('/schedules', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.schedule.create({
      data: req.body,
    })
    res.status(201).json(schedule)
  } catch (error) {
    res.status(500).json({ error: 'Error creating schedule' })
  }
})

workifyRouter.put('/schedules/:id', async (req: Request, res: Response) => {
  try {
    const schedule = await prisma.schedule.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(schedule)
  } catch (error) {
    res.status(500).json({ error: 'Error updating schedule' })
  }
})

workifyRouter.delete('/schedules/:id', async (req: Request, res: Response) => {
  try {
    await prisma.schedule.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting schedule' })
  }
})

// ========================================
// SPECIAL DAY ASSIGNMENTS
// ========================================

workifyRouter.get('/special-assignments', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query
    const assignments = await prisma.specialDayAssignment.findMany({
      where: employeeId ? { employeeId: employeeId as string } : undefined,
      include: {
        employee: true,
        workShift: true,
      },
    })
    res.json(assignments)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching special assignments' })
  }
})

workifyRouter.post('/special-assignments', async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.specialDayAssignment.create({
      data: req.body,
    })
    res.status(201).json(assignment)
  } catch (error) {
    res.status(500).json({ error: 'Error creating special assignment' })
  }
})

workifyRouter.put('/special-assignments/:id', async (req: Request, res: Response) => {
  try {
    const assignment = await prisma.specialDayAssignment.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(assignment)
  } catch (error) {
    res.status(500).json({ error: 'Error updating special assignment' })
  }
})

workifyRouter.delete('/special-assignments/:id', async (req: Request, res: Response) => {
  try {
    await prisma.specialDayAssignment.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting special assignment' })
  }
})

// ========================================
// PAYROLLS
// ========================================

workifyRouter.get('/payrolls', async (req: Request, res: Response) => {
  try {
    const { employeeId, companyId } = req.query
    const where: any = {}
    
    if (employeeId) where.employeeId = employeeId as string
    if (companyId) where.companyId = companyId as string
    
    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true,
        company: true,
      },
      orderBy: {
        periodStart: 'desc',
      },
    })
    res.json(payrolls)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching payrolls' })
  }
})

workifyRouter.post('/payrolls', async (req: Request, res: Response) => {
  try {
    const payroll = await prisma.payroll.create({
      data: req.body,
    })
    res.status(201).json(payroll)
  } catch (error) {
    res.status(500).json({ error: 'Error creating payroll' })
  }
})

workifyRouter.put('/payrolls/:id', async (req: Request, res: Response) => {
  try {
    const payroll = await prisma.payroll.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(payroll)
  } catch (error) {
    res.status(500).json({ error: 'Error updating payroll' })
  }
})

// ========================================
// LICENSES
// ========================================

workifyRouter.get('/licenses', async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query
    const licenses = await prisma.license.findMany({
      where: employeeId ? { employeeId: employeeId as string } : undefined,
      include: {
        employee: true,
      },
    })
    res.json(licenses)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching licenses' })
  }
})

workifyRouter.post('/licenses', async (req: Request, res: Response) => {
  try {
    const license = await prisma.license.create({
      data: req.body,
    })
    res.status(201).json(license)
  } catch (error) {
    res.status(500).json({ error: 'Error creating license' })
  }
})

workifyRouter.put('/licenses/:id', async (req: Request, res: Response) => {
  try {
    const license = await prisma.license.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(license)
  } catch (error) {
    res.status(500).json({ error: 'Error updating license' })
  }
})

// ========================================
// DOCUMENTS
// ========================================

workifyRouter.get('/documents', async (req: Request, res: Response) => {
  try {
    const { companyId, employeeId } = req.query
    const where: any = {}
    
    if (companyId) where.companyId = companyId as string
    if (employeeId) where.employeeId = employeeId as string
    
    const documents = await prisma.document.findMany({
      where,
      include: {
        company: true,
        employee: true,
      },
    })
    res.json(documents)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching documents' })
  }
})

workifyRouter.post('/documents', async (req: Request, res: Response) => {
  try {
    const document = await prisma.document.create({
      data: req.body,
    })
    res.status(201).json(document)
  } catch (error) {
    res.status(500).json({ error: 'Error creating document' })
  }
})

workifyRouter.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    await prisma.document.delete({
      where: { id: req.params.id },
    })
    res.status(204).send()
  } catch (error) {
    res.status(500).json({ error: 'Error deleting document' })
  }
})

// ========================================
// NOTIFICATIONS
// ========================================

workifyRouter.get('/notifications', async (req: Request, res: Response) => {
  try {
    const { userId, companyId, status } = req.query
    const where: any = {}
    
    if (userId) where.userId = userId as string
    if (companyId) where.companyId = companyId as string
    if (status) where.status = status
    
    const notifications = await prisma.notification.findMany({
      where,
      include: {
        user: true,
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    res.json(notifications)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching notifications' })
  }
})

workifyRouter.put('/notifications/:id/read', async (req: Request, res: Response) => {
  try {
    const notification = await prisma.notification.update({
      where: { id: req.params.id },
      data: {
        status: 'READ',
        readAt: new Date(),
      },
    })
    res.json(notification)
  } catch (error) {
    res.status(500).json({ error: 'Error updating notification' })
  }
})

// ========================================
// REPORTS
// ========================================

workifyRouter.get('/reports', async (req: Request, res: Response) => {
  try {
    const { companyId } = req.query
    const reports = await prisma.report.findMany({
      where: companyId ? { companyId: companyId as string } : undefined,
      include: {
        company: true,
      },
    })
    res.json(reports)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching reports' })
  }
})

workifyRouter.post('/reports', async (req: Request, res: Response) => {
  try {
    const report = await prisma.report.create({
      data: req.body,
    })
    res.status(201).json(report)
  } catch (error) {
    res.status(500).json({ error: 'Error creating report' })
  }
})
