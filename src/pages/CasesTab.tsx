import { useCallback, useEffect, useState } from 'react'
import { supabase, unwrap } from '../supabase'
import { CASE_TYPES, PRIORITIES, type CaseType, type Folder, type Priority, type TestCase } from '../types'
import { ConfirmModal, ErrorText, Field, Modal, NameModal } from '../components/ui'

/** 選中的資料夾:'all' = 全部案例, 'root' = 專案根目錄, 其餘為資料夾 id */
type Sel = 'all' | 'root' | string

function folderPath(folders: Folder[], id: string | null): string {
  const names: string[] = []
  let cur = folders.find((f) => f.id === id)
  while (cur) {
    names.unshift(cur.name)
    cur = folders.find((f) => f.id === cur!.parent_id)
  }
  return names.join(' / ')
}

function descendantIds(folders: Folder[], id: string): string[] {
  const kids = folders.filter((f) => f.parent_id === id)
  return kids.flatMap((k) => [k.id, ...descendantIds(folders, k.id)])
}

function CaseForm({ projectId, folders, initial, defaultFolder, onSaved, onClose }: {
  projectId: string
  folders: Folder[]
  initial?: TestCase
  defaultFolder: string | null
  onSaved: () => Promise<void>
  onClose: () => void
}) {
  const [f, setF] = useState({
    title: initial?.title ?? '',
    preconditions: initial?.preconditions ?? '',
    steps: initial?.steps ?? '',
    expected_result: initial?.expected_result ?? '',
    priority: (initial?.priority ?? '中') as Priority,
    type: (initial?.type ?? '功能測試') as CaseType,
    folder_id: initial ? initial.folder_id : defaultFolder,
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)
  const set = (k: string, v: string | null) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    if (!f.title.trim()) return setErr('請輸入案例名稱')
    setBusy(true)
    try {
      const row = { ...f, title: f.title.trim() }
      if (initial) unwrap(await supabase.from('test_cases').update(row).eq('id', initial.id))
      else unwrap(await supabase.from('test_cases').insert({ ...row, project_id: projectId }))
      await onSaved(); onClose()
    } catch (e) { setErr((e as Error).message); setBusy(false) }
  }

  return (
    <Modal title={initial ? '編輯測試案例' : '新增測試案例'} onClose={onClose} wide>
      <ErrorText msg={err} />
      <Field label="案例名稱"><input className="input" autoFocus value={f.title} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="前置條件"><textarea className="input" rows={2} value={f.preconditions} onChange={(e) => set('preconditions', e.target.value)} /></Field>
      <Field label="測試步驟"><textarea className="input" rows={4} value={f.steps} onChange={(e) => set('steps', e.target.value)} /></Field>
      <Field label="預期結果"><textarea className="input" rows={2} value={f.expected_result} onChange={(e) => set('expected_result', e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="優先級">
          <select className="input" value={f.priority} onChange={(e) => set('priority', e.target.value)}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="類型">
          <select className="input" value={f.type} onChange={(e) => set('type', e.target.value)}>
            {CASE_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="所屬資料夾">
          <select className="input" value={f.folder_id ?? ''} onChange={(e) => set('folder_id', e.target.value || null)}>
            <option value="">(專案根目錄)</option>
            {folders.map((fo) => <option key={fo.id} value={fo.id}>{folderPath(folders, fo.id)}</option>)}
          </select>
        </Field>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {initial ? <button className="btn-ghost !text-red-600" onClick={() => setConfirmDel(true)}>刪除</button> : <span />}
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" disabled={busy} onClick={save}>{initial ? '儲存' : '創建'}</button>
        </div>
      </div>
      {confirmDel && initial && (
        <ConfirmModal title="刪除測試案例" onClose={() => setConfirmDel(false)}
          message={`確定刪除「${initial.title}」?它也會從所有測試計畫中移除。`}
          onConfirm={async () => { unwrap(await supabase.from('test_cases').delete().eq('id', initial.id)); await onSaved(); onClose() }} />
      )}
    </Modal>
  )
}

export default function CasesTab({ projectId }: { projectId: string }) {
  const [folders, setFolders] = useState<Folder[]>([])
  const [cases, setCases] = useState<TestCase[]>([])
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<Sel>('all')
  const [modal, setModal] = useState<
    | { kind: 'folder' } | { kind: 'renameFolder'; f: Folder } | { kind: 'delFolder'; f: Folder }
    | { kind: 'case'; c?: TestCase } | null
  >(null)

  const load = useCallback(async () => {
    const [fo, ca] = await Promise.all([
      supabase.from('folders').select('*').eq('project_id', projectId).order('created_at'),
      supabase.from('test_cases').select('*').eq('project_id', projectId).order('created_at'),
    ])
    setFolders(unwrap(fo) as Folder[]); setCases(unwrap(ca) as TestCase[]); setLoaded(true)
  }, [projectId])
  useEffect(() => { load() }, [load])

  if (!loaded) return <p className="text-slate-500">載入中…</p>

  const selFolder = folders.find((f) => f.id === sel)
  const shown = cases.filter((c) => sel === 'all' || (sel === 'root' ? c.folder_id === null : c.folder_id === sel))
  const newFolderParent = selFolder ?? null

  function renderTree(parent: string | null, depth: number): React.ReactNode {
    return folders.filter((f) => f.parent_id === parent).map((f) => (
      <div key={f.id}>
        <div className={`group flex items-center justify-between rounded px-2 py-1 text-sm ${sel === f.id ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-100'}`}
          style={{ paddingLeft: 8 + depth * 16 }}>
          <button className="flex-1 cursor-pointer truncate text-left" onClick={() => setSel(f.id)}>📁 {f.name}</button>
          <span className="hidden gap-2 text-xs group-hover:flex">
            <button className="cursor-pointer text-slate-500" onClick={() => setModal({ kind: 'renameFolder', f })}>改名</button>
            <button className="cursor-pointer text-red-500" onClick={() => setModal({ kind: 'delFolder', f })}>刪除</button>
          </span>
        </div>
        {renderTree(f.id, depth + 1)}
      </div>
    ))
  }

  const itemCls = (active: boolean) =>
    `w-full cursor-pointer rounded px-2 py-1 text-left text-sm ${active ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-slate-100'}`

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6">
      <aside className="rounded-lg border border-slate-200 bg-white p-3">
        <button className={itemCls(sel === 'all')} onClick={() => setSel('all')}>全部案例</button>
        <button className={itemCls(sel === 'root')} onClick={() => setSel('root')}>專案根目錄</button>
        <div className="mt-1">{renderTree(null, 0)}</div>
      </aside>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            目前位置:{sel === 'all' ? '全部案例' : sel === 'root' ? '專案根目錄' : folderPath(folders, sel)}
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={() => setModal({ kind: 'folder' })}>新增資料夾</button>
            <button className="btn-primary" onClick={() => setModal({ kind: 'case' })}>新增測試案例</button>
          </div>
        </div>

        {shown.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 py-16 text-center text-slate-500">這裡還沒有測試案例</p>
        ) : (
          <table className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr><th className="px-3 py-2">案例名稱</th><th className="px-3 py-2">優先級</th><th className="px-3 py-2">類型</th><th className="px-3 py-2">資料夾</th></tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-3 py-2">
                    <button className="cursor-pointer text-indigo-700 hover:underline" onClick={() => setModal({ kind: 'case', c })}>{c.title}</button>
                  </td>
                  <td className="px-3 py-2">{c.priority}</td>
                  <td className="px-3 py-2">{c.type}</td>
                  <td className="px-3 py-2 text-slate-500">{folderPath(folders, c.folder_id) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modal?.kind === 'folder' && (
        <NameModal title={newFolderParent ? `新增資料夾(位於 ${folderPath(folders, newFolderParent.id)})` : '新增資料夾'}
          submitLabel="創建" onClose={() => setModal(null)}
          onSubmit={async (name) => {
            unwrap(await supabase.from('folders').insert({ project_id: projectId, parent_id: newFolderParent?.id ?? null, name }))
            await load()
          }} />
      )}
      {modal?.kind === 'renameFolder' && (
        <NameModal title="資料夾改名" initial={modal.f.name} submitLabel="儲存" onClose={() => setModal(null)}
          onSubmit={async (name) => { unwrap(await supabase.from('folders').update({ name }).eq('id', modal.f.id)); await load() }} />
      )}
      {modal?.kind === 'delFolder' && (() => {
        const ids = [modal.f.id, ...descendantIds(folders, modal.f.id)]
        const n = cases.filter((c) => c.folder_id && ids.includes(c.folder_id)).length
        return (
          <ConfirmModal title="刪除資料夾" onClose={() => setModal(null)}
            message={`確定刪除資料夾「${modal.f.name}」?其下 ${ids.length - 1} 個子資料夾與 ${n} 個測試案例會一併刪除,無法復原。`}
            onConfirm={async () => {
              unwrap(await supabase.from('folders').delete().eq('id', modal.f.id))
              if (ids.includes(sel)) setSel('all')
              await load()
            }} />
        )
      })()}
      {modal?.kind === 'case' && (
        <CaseForm projectId={projectId} folders={folders} initial={modal.c}
          defaultFolder={selFolder?.id ?? null} onSaved={load} onClose={() => setModal(null)} />
      )}
    </div>
  )
}
