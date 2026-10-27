export const PRIORITIES = ['高', '中', '低'] as const
export const CASE_TYPES = ['功能測試', '整合測試', '壓力測試', '其他'] as const
export const STATUSES = ['未測試', '已通過', '待複測'] as const

export type Priority = (typeof PRIORITIES)[number]
export type CaseType = (typeof CASE_TYPES)[number]
export type Status = (typeof STATUSES)[number]

export interface Team { id: string; name: string; invite_code: string }
export interface Project { id: string; team_id: string; name: string }
export interface Folder { id: string; project_id: string; parent_id: string | null; name: string }
export interface TestCase {
  id: string
  project_id: string
  folder_id: string | null
  title: string
  preconditions: string
  steps: string
  expected_result: string
  priority: Priority
  type: CaseType
}
export interface TestPlan { id: string; project_id: string; name: string }
export interface PlanCase { plan_id: string; case_id: string; status: Status; note: string }
