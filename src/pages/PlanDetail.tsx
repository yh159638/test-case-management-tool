import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase, unwrap } from '../supabase'
import { STATUSES, type Folder, type PlanCase, type Status, type TestCase, type TestPlan } from '../types'
import CasePicker from '../components/CasePicker'
import { ConfirmModal, ErrorText, Field, Modal, NameModal, StatusBadge } from '../components/ui'

function StatusModal({ plan, tc, pc, onSaved, onClose }: {
  plan: TestPlan
  tc: TestCase
  pc: PlanCase
  onSaved: () => Promise<void>
  onClose: () => void
}) {
  // 未測試是預設值,不算「已選擇」,所以進來時需要使用者主動選
  const [status, setStatus] = useState<Status | ''>(pc.status === '未測試' && !pc.note ? '' : pc.status)
  const [note, setNote] = useState(pc.note)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!status) return setErr('請選擇測試狀態')
    setBusy(true)
    try {
      unwrap(await supabase.from('plan_cases').update({ status, note, updated_at: new Date().toISOString() })
        .eq('plan_id', plan.id).eq('case_id', tc.id))
      await onSaved(); onClose()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <Modal title={tc.title} onClose={onClose} wide>
      <ErrorText msg={err} />
      <div className="mb-4 space-y-2 rounded bg-slate-50 p-3 text-sm">
        <div><span className="font-medium">前置條件:</span><span className="whitespace-pre-wrap">{tc.preconditions || '—'}</span></div>
        <div><span className="font-medium">測試步驟:</span><span className="whitespace-pre-wrap">{tc.steps || '—'}</span></div>
        <div><span className="font-medium">預期結果:</span><span className="whitespace-pre-wrap">{tc.expected_result || '—'}</span></div>
      </div>
      <Field label="測試狀態(必填)">
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
          <option value="" disabled>請選擇…</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="備註(選填)">
        <textarea className="input" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>取消</button>
        <button className="btn-primary" disabled={busy} onClick={save}>儲存</button>
      </div>
    </Modal>
  )
}

function EditCasesModal({ plan, folders, cases, current, onSaved, onClose }: {
  plan: TestPlan
  folders: Folder[]
  cases: TestCase[]
  current: Set<string>
  onSaved: () => Promise<void>
  onClose: () => void
}) {
  const [selected, setSelected] = useState(new Set(current))
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      const add = [...selected].filter((id) => !current.has(id))
      const remove = [...current].filter((id) => !selected.has(id))
      if (add.length) unwrap(await supabase.from('plan_cases').insert(add.map((case_id) => ({ plan_id: plan.id, case_id }))))
      if (remove.length) unwrap(await supabase.from('plan_cases').delete().eq('plan_id', plan.id).in('case_id', remove))
      await onSaved(); onClose()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <Modal title="增減計畫內的案例" onClose={onClose} wide>
      <ErrorText msg={err} />
      <p className="mb-2 text-xs text-slate-500">取消勾選會移除該案例在此計畫的狀態與備註;新加入的案例預設為「未測試」。</p>
      <CasePicker folders={folders} cases={cases} selected={selected} onChange={setSelected} />
      <div className="mt-4 flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>取消</button>
        <button className="btn-primary" disabled={busy} onClick={save}>儲存</button>
      </div>
    </Modal>
  )
}

export default function PlanDetail() {
  const { projectId = '', planId = '' } = useParams()
  const nav = useNavigate()
  const [plan, setPlan] = useState<TestPlan | null>(null)
  const [pcs, setPcs] = useState<PlanCase[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [modal, setModal] = useState<
    { kind: 'status'; caseId: string } | { kind: 'edit' } | { kind: 'rename' } | { kind: 'delete' } | null
  >(null)

  const load = useCallback(async () => {
    const [p, pc, ca, fo] = await Promise.all([
      supabase.from('test_plans').select('*').eq('id', planId).single(),
      supabase.from('plan_cases').select('*').eq('plan_id', planId),
      supabase.from('test_cases').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('folders').select('*').eq('project_id', projectId).order('created_at'),
    ])
    setPlan(unwrap(p) as TestPlan); setPcs(unwrap(pc) as PlanCase[])
    setCases(unwrap(ca) as TestCase[]); setFolders(unwrap(fo) as Folder[])
  }, [planId, projectId])
  useEffect(() => { load() }, [load])

  if (!plan) return <p className="text-slate-500">載入中…</p>

  const rows = pcs.map((pc) => ({ pc, tc: cases.find((c) => c.id === pc.case_id)! })).filter((r) => r.tc)
  const count = (s: Status) => rows.filter((r) => r.pc.status === s).length
  const active = modal?.kind === 'status' ? rows.find((r) => r.tc.id === modal.caseId) : undefined

  return (
    <div>
      <div className="mb-1 text-sm text-slate-500">
        <Link to="/" className="hover:underline">專案列表</Link> /{' '}
        <Link to={`/p/${projectId}?tab=plans`} className="hover:underline">測試計畫</Link> / {plan.name}
      </div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">{plan.name}</h1>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setModal({ kind: 'edit' })}>增減案例</button>
          <button className="btn-ghost" onClick={() => setModal({ kind: 'rename' })}>改名</button>
          <button className="btn-ghost !text-red-600" onClick={() => setModal({ kind: 'delete' })}>刪除計畫</button>
        </div>
      </div>

      <div className="mb-4 flex gap-4 text-sm text-slate-600">
        <span>共 {rows.length} 案例</span>
        {STATUSES.map((s) => <span key={s}>{s} {count(s)}</span>)}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-slate-500">此計畫尚未加入案例,請按「增減案例」。</p>
      ) : (
        <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr><th className="px-3 py-2">案例名稱</th><th className="px-3 py-2">狀態</th><th className="px-3 py-2">備註</th></tr>
          </thead>
          <tbody>
            {rows.map(({ pc, tc }) => (
              <tr key={tc.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  <button className="cursor-pointer text-indigo-700 hover:underline" onClick={() => setModal({ kind: 'status', caseId: tc.id })}>{tc.title}</button>
                </td>
                <td className="px-3 py-2"><StatusBadge status={pc.status} /></td>
                <td className="max-w-xs truncate px-3 py-2 text-slate-500">{pc.note}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {active && <StatusModal plan={plan} tc={active.tc} pc={active.pc} onSaved={load} onClose={() => setModal(null)} />}
      {modal?.kind === 'edit' && (
        <EditCasesModal plan={plan} folders={folders} cases={cases} current={new Set(pcs.map((p) => p.case_id))}
          onSaved={load} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'rename' && (
        <NameModal title="計畫改名" initial={plan.name} submitLabel="儲存" onClose={() => setModal(null)}
          onSubmit={async (name) => { unwrap(await supabase.from('test_plans').update({ name }).eq('id', plan.id)); await load() }} />
      )}
      {modal?.kind === 'delete' && (
        <ConfirmModal title="刪除測試計畫" onClose={() => setModal(null)}
          message={`確定刪除計畫「${plan.name}」?其中所有測試狀態與備註都會刪除(測試案例本身不受影響)。`}
          onConfirm={async () => {
            unwrap(await supabase.from('test_plans').delete().eq('id', plan.id))
            nav(`/p/${projectId}?tab=plans`)
          }} />
      )}
    </div>
  )
}
