import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { supabase, unwrap } from '../supabase'
import type { Project } from '../types'
import CasesTab from './CasesTab'
import PlansTab from './PlansTab'

export default function ProjectPage() {
  const { projectId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'plans' ? 'plans' : 'cases'
  const [project, setProject] = useState<Project | null>(null)

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', projectId).single().then((r) => setProject(unwrap(r) as Project))
  }, [projectId])

  if (!project) return <p className="text-slate-500">載入中…</p>

  const tabCls = (active: boolean) =>
    `cursor-pointer border-b-2 px-4 py-2 text-sm font-medium ${active ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500 hover:text-slate-800'}`

  return (
    <div>
      <div className="mb-1 text-sm text-slate-500"><Link to="/" className="hover:underline">專案列表</Link> / {project.name}</div>
      <h1 className="mb-4 text-xl font-semibold">{project.name}</h1>
      <div className="mb-5 flex border-b border-slate-200">
        <button className={tabCls(tab === 'cases')} onClick={() => setParams({ tab: 'cases' })}>測試案例</button>
        <button className={tabCls(tab === 'plans')} onClick={() => setParams({ tab: 'plans' })}>測試計畫</button>
      </div>
      {tab === 'cases' ? <CasesTab projectId={projectId} /> : <PlansTab projectId={projectId} />}
    </div>
  )
}
