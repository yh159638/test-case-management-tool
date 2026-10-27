import type { Folder, TestCase } from '../types'

/** 依資料夾分組、可勾選的案例清單 */
export default function CasePicker({ folders, cases, selected, onChange }: {
  folders: Folder[]
  cases: TestCase[]
  selected: Set<string>
  onChange: (s: Set<string>) => void
}) {
  function toggle(ids: string[], on: boolean) {
    const next = new Set(selected)
    ids.forEach((id) => (on ? next.add(id) : next.delete(id)))
    onChange(next)
  }

  function group(folderId: string | null, label: string, depth: number) {
    const own = cases.filter((c) => c.folder_id === folderId)
    const kids = folders.filter((f) => f.parent_id === folderId)
    return (
      <div key={folderId ?? 'root'} style={{ marginLeft: depth * 14 }}>
        {folderId !== null || own.length > 0 ? (
          <div className="mt-2 flex items-center gap-2 text-sm font-medium text-slate-600">
            <input type="checkbox"
              checked={own.length > 0 && own.every((c) => selected.has(c.id))}
              disabled={own.length === 0}
              onChange={(e) => toggle(own.map((c) => c.id), e.target.checked)} />
            {folderId ? '📁 ' : ''}{label}
          </div>
        ) : null}
        {own.map((c) => (
          <label key={c.id} className="ml-6 flex cursor-pointer items-center gap-2 py-0.5 text-sm">
            <input type="checkbox" checked={selected.has(c.id)} onChange={(e) => toggle([c.id], e.target.checked)} />
            {c.title}
          </label>
        ))}
        {kids.map((k) => group(k.id, k.name, depth + 1))}
      </div>
    )
  }

  if (cases.length === 0) return <p className="text-sm text-slate-500">此專案還沒有測試案例,請先到「測試案例」新增。</p>
  return (
    <div className="max-h-80 overflow-y-auto rounded border border-slate-200 p-3">
      {group(null, '專案根目錄', 0)}
    </div>
  )
}
