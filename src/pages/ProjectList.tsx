import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../supabase'
import type { Project, Team } from '../types'
import { ConfirmModal, NameModal } from '../components/ui'

export default function ProjectList({ team }: { team: Team }) {
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [modal, setModal] = useState<
    { kind: 'new' } | { kind: 'rename'; p: Project } | { kind: 'delete'; p: Project } | null
  >(null)

  const load = useCallback(async () => {
    setProjects(unwrap(await supabase.from('projects').select('*').eq('team_id', team.id).order('created_at')) as Project[])
  }, [team.id])
  useEffect(() => { load() }, [load])

  if (!projects) return <p className="text-slate-500">載入中…</p>

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">專案列表</h1>
        {projects.length > 0 && <button className="btn-primary" onClick={() => setModal({ kind: 'new' })}>新增專案</button>}
      </div>

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="mb-4 text-slate-500">目前沒有專案</p>
          <button className="btn-primary" onClick={() => setModal({ kind: 'new' })}>新增專案</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <Link to={`/p/${p.id}`} className="block text-lg font-medium text-indigo-700 hover:underline">{p.name}</Link>
              <div className="mt-3 flex gap-3 text-xs">
                <button className="cursor-pointer text-slate-500 hover:text-slate-800" onClick={() => setModal({ kind: 'rename', p })}>改名</button>
                <button className="cursor-pointer text-red-500 hover:text-red-700" onClick={() => setModal({ kind: 'delete', p })}>刪除</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal?.kind === 'new' && (
        <NameModal title="新增專案" submitLabel="創建" onClose={() => setModal(null)}
          onSubmit={async (name) => { unwrap(await supabase.from('projects').insert({ team_id: team.id, name })); await load() }} />
      )}
      {modal?.kind === 'rename' && (
        <NameModal title="專案改名" initial={modal.p.name} submitLabel="儲存" onClose={() => setModal(null)}
          onSubmit={async (name) => { unwrap(await supabase.from('projects').update({ name }).eq('id', modal.p.id)); await load() }} />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal title="刪除專案" onClose={() => setModal(null)}
          message={`確定刪除專案「${modal.p.name}」?其下所有資料夾、測試案例與測試計畫都會一併刪除,無法復原。`}
          onConfirm={async () => { unwrap(await supabase.from('projects').delete().eq('id', modal.p.id)); await load() }} />
      )}
    </div>
  )
}
