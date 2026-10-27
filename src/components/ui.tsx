import { useEffect, useState, type ReactNode } from 'react'

export function Modal({ title, onClose, children, wide }: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className={`mt-10 w-full rounded-lg bg-white shadow-xl ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <button className="cursor-pointer text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      {children}
    </div>
  )
}

export function ErrorText({ msg }: { msg: string }) {
  return msg ? <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p> : null
}

/** 單欄位名稱輸入彈窗(新增/改名用) */
export function NameModal({ title, initial = '', submitLabel, onSubmit, onClose }: {
  title: string
  initial?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit() {
    if (!name.trim()) return setErr('請輸入名稱')
    setBusy(true)
    try { await onSubmit(name.trim()); onClose() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <ErrorText msg={err} />
      <Field label="名稱">
        <input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>取消</button>
        <button className="btn-primary" disabled={busy} onClick={submit}>{submitLabel}</button>
      </div>
    </Modal>
  )
}

export function ConfirmModal({ title, message, onConfirm, onClose }: {
  title: string
  message: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try { await onConfirm(); onClose() } catch (e) { setErr((e as Error).message); setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <ErrorText msg={err} />
      <p className="mb-5 text-sm text-slate-700">{message}</p>
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>取消</button>
        <button className="btn-danger" disabled={busy} onClick={go}>確認刪除</button>
      </div>
    </Modal>
  )
}

export const STATUS_STYLE: Record<string, string> = {
  未測試: 'bg-slate-100 text-slate-600',
  已通過: 'bg-green-100 text-green-700',
  待複測: 'bg-amber-100 text-amber-700',
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>
}
