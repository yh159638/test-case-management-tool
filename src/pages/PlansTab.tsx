import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, unwrap } from '../supabase'
import type { Folder, PlanCase, TestCase, TestPlan } from '../types'
import CasePicker from '../components/CasePicker'
import { ErrorText, Field, Modal } from '../components/ui'

function NewPlanModal({ projectId, onCreated, onClose }: {
  projectId: string
  onCreated: () => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [folders, setFolders] = useState<Folder[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    Promise.all([
      supabase.from('folders').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('test_cases').select('*').eq('project_id', projectId).order('created_at'),
    ]).then(([fo, ca]) => { setFolders(unwrap(fo) as Folder[]); setCases(unwrap(ca) as TestCase[]) })
  }, [projectId])

  async function create() {
    if (!name.trim()) return setErr('請輸入計畫名稱')
    setBusy(true)
    try {
      const plan = unwrap(await supabase.from('test_plans').insert({ project_id: projectId, name: name.trim() }).select().single()) as TestPlan
      if (selected.size > 0) {
        unwrap(await supabase.from('plan_cases').insert([...selected].map((case_id) => ({ plan_id: plan.id, case_id }))))
      }
      await onCreated(); onClose()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <Modal title="新增測試計畫" onClose={onClose} wide>
      <ErrorText msg={err} />
      <Field label="計畫名稱"><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label={`選擇要加入的測試案例(已選 ${selected.size})`}>
        <CasePicker folders={folders} cases={cases} selected={selected} onChange={setSelected} />
      </Field>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>取消</button>
        <button className="btn-primary" disabled={busy} onClick={create}>創建</button>
      </div>
    </Modal>
  )
}

export default function PlansTab({ projectId }: { projectId: string }) {
  const [plans, setPlans] = useState<TestPlan[] | null>(null)
  const [pcs, setPcs] = useState<PlanCase[]>([])
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    const list = unwrap(await supabase.from('test_plans').select('*').eq('project_id', projectId).order('created_at')) as TestPlan[]
    setPlans(list)
    if (list.length) {
      setPcs(unwrap(await supabase.from('plan_cases').select('*').in('plan_id', list.map((p) => p.id))) as PlanCase[])
    } else setPcs([])
  }, [projectId])
  useEffect(() => { load() }, [load])

  if (!plans) return <p className="text-slate-500">載入中…</p>

  return (
    <div>
      <div className="mb-4 flex justify-end">
        {plans.length > 0 && <button className="btn-primary" onClick={() => setShowNew(true)}>新增測試計畫</button>}
      </div>
      {plans.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 py-20 text-center">
          <p className="mb-4 text-slate-500">目前沒有測試計畫</p>
          <button className="btn-primary" onClick={() => setShowNew(true)}>新增測試計畫</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {plans.map((p) => {
            const mine = pcs.filter((x) => x.plan_id === p.id)
            const count = (s: string) => mine.filter((x) => x.status === s).length
            return (
              <Link key={p.id} to={`/p/${projectId}/plan/${p.id}`}
                className="block rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-indigo-300">
                <div className="text-lg font-medium text-indigo-700">{p.name}</div>
                <div className="mt-2 text-xs text-slate-500">
                  共 {mine.length} 案例 · 已通過 {count('已通過')} · 待複測 {count('待複測')} · 未測試 {count('未測試')}
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {showNew && <NewPlanModal projectId={projectId} onCreated={load} onClose={() => setShowNew(false)} />}
    </div>
  )
}
