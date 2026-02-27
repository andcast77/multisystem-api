import { prisma } from '../db/index.js'

/** Keys de módulos conocidos (según seed) */
export const MODULE_KEYS = ['workify', 'shopflow', 'techservices'] as const
export type ModuleKeys = (typeof MODULE_KEYS)[number]

/** Shape de módulos habilitados por empresa/miembro */
export type CompanyModulesShape = {
  workify: boolean
  shopflow: boolean
  techservices: boolean
}

const DEFAULT_MODULES: CompanyModulesShape = {
  workify: false,
  shopflow: false,
  techservices: false,
}

/**
 * Obtiene los módulos habilitados para una empresa vía CompanyModule.
 */
export async function getCompanyModules(
  companyId: string
): Promise<CompanyModulesShape> {
  const companyModules = await prisma.companyModule.findMany({
    where: { companyId, enabled: true },
    include: { module: true },
  })

  const result = { ...DEFAULT_MODULES }
  for (const cm of companyModules) {
    const key = cm.module.key as ModuleKeys
    if (MODULE_KEYS.includes(key)) {
      result[key] = true
    }
  }
  return result
}

/**
 * Obtiene los módulos habilitados para un miembro vía CompanyMemberModule.
 * Si no hay CompanyMemberModule para el miembro, usa los de la empresa.
 */
export async function getMemberModules(
  companyMemberId: string,
  companyId: string
): Promise<CompanyModulesShape> {
  const memberModules = await prisma.companyMemberModule.findMany({
    where: { companyMemberId, enabled: true },
    include: { module: true },
  })

  if (memberModules.length === 0) {
    return getCompanyModules(companyId)
  }

  const result = { ...DEFAULT_MODULES }
  for (const mm of memberModules) {
    const key = mm.module.key as ModuleKeys
    if (MODULE_KEYS.includes(key)) {
      result[key] = true
    }
  }
  return result
}

/**
 * Comprueba si una empresa tiene habilitado un módulo por key.
 */
export async function companyHasModule(
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const module = await prisma.module.findUnique({ where: { key: moduleKey } })
  if (!module) return false

  const cm = await prisma.companyModule.findUnique({
    where: { companyId_moduleId: { companyId, moduleId: module.id } },
  })
  return cm?.enabled ?? false
}

/**
 * Comprueba si un miembro tiene habilitado un módulo.
 * Si no tiene CompanyMemberModule para ese módulo, usa el de la empresa.
 */
export async function memberHasModule(
  companyMemberId: string,
  companyId: string,
  moduleKey: string
): Promise<boolean> {
  const module = await prisma.module.findUnique({ where: { key: moduleKey } })
  if (!module) return false

  const cmm = await prisma.companyMemberModule.findUnique({
    where: {
      companyMemberId_moduleId: { companyMemberId, moduleId: module.id },
    },
  })
  if (cmm !== null) return cmm.enabled

  return companyHasModule(companyId, moduleKey)
}
