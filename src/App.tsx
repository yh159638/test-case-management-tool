import { useCallback, useEffect, useState } from 'react'
import { Link, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { configured, supabase, unwrap } from './supabase'
import type { Team } from './types'
import { ErrorText, Field } from './components/ui'
import ProjectList from './pages/ProjectList'
import ProjectPage from './pages/ProjectPage'
import PlanDetail from './pages/PlanDetail'

function SetupNotice() {
  return (
    <div className="mx-auto mt-24 max-w-lg rounded-lg bg-white p-6 shadow">
      <h1 className="mb-2 text-lg font-semibold">尚未設定資料庫</h1>
      <p className="text-sm text-slate-600">
        找不到 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。請依 README 的步驟建立 Supabase 專案,並填入 .env.local。
      </p>
    </div>
  )
}

function AuthForm() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr(''); setInfo(''); setBusy(true)
    const { data, error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    setBusy(false)
    if (error) return setErr(error.message)
    if (mode === 'signup' && !data.session) setInfo('註冊成功,請到信箱點擊驗證連結後再登入。')
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-xl font-semibold">測試案例管理工具</h1>
      <ErrorText msg={err} />
      {info && <p className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{info}</p>}
      <Field label="Email">
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="密碼(至少 6 碼)">
        <input className="input" type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} />
      </Field>
      <button className="btn-primary w-full" disabled={busy} onClick={submit}>
        {mode === 'login' ? '登入' : '註冊'}
      </button>
      <button className="mt-3 w-full cursor-pointer text-sm text-indigo-600"
        onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); setInfo('') }}>
        {mode === 'login' ? '沒有帳號?註冊' : '已有帳號?登入'}
      </button>
    </div>
  )
}

function TeamSetup({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')

  async function create() {
    if (!name.trim()) return setErr('請輸入團隊名稱')
    try { unwrap(await supabase.rpc('create_team', { team_name: name.trim() })); onDone() }
    catch (e) { setErr((e as Error).message) }
  }
  async function join() {
    if (!code.trim()) return setErr('請輸入邀請碼')
    try { unwrap(await supabase.rpc('join_team', { code })); onDone() }
    catch (e) { setErr((e as Error).message) }
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-md rounded-lg bg-white p-6 shadow">
      <h1 className="mb-4 text-lg font-semibold">建立或加入團隊</h1>
      <ErrorText msg={err} />
      <Field label="建立新團隊">
        <div className="flex gap-2">
          <input className="input" placeholder="團隊名稱" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn-primary shrink-0" onClick={create}>建立</button>
        </div>
      </Field>
      <hr className="my-4" />
      <Field label="用邀請碼加入既有團隊">
        <div className="flex gap-2">
          <input className="input" placeholder="邀請碼" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="btn-ghost shrink-0" onClick={join}>加入</button>
        </div>
      </Field>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [teamId, setTeamId] = useState(() => localStorage.getItem('teamId') || '')
  const [showCode, setShowCode] = useState(false)

  useEffect(() => {
    if (!configured) return
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true) })
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  const loadTeams = useCallback(async () => {
    const list = unwrap(await supabase.from('teams').select('*').order('created_at')) as Team[]
    setTeams(list)
  }, [])

  useEffect(() => {
    if (session) loadTeams().catch(() => setTeams([]))
    else setTeams(null)
  }, [session, loadTeams])

  if (!configured) return <SetupNotice />
  if (!ready) return null
  if (!session) return <AuthForm />
  if (!teams) return <p className="p-8 text-slate-500">載入中…</p>
  if (teams.length === 0) return <TeamSetup onDone={loadTeams} />

  const team = teams.find((t) => t.id === teamId) ?? teams[0]

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <Link to="/" className="font-semibold text-indigo-700">測試案例管理工具</Link>
        <div className="flex items-center gap-3 text-sm">
          <select className="input !w-auto" value={team.id}
            onChange={(e) => { setTeamId(e.target.value); localStorage.setItem('teamId', e.target.value) }}>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button className="btn-ghost" onClick={() => setShowCode(!showCode)}>
            {showCode ? `邀請碼:${team.invite_code}` : '顯示邀請碼'}
          </button>
          <span className="text-slate-500">{session.user.email}</span>
          <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>登出</button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl p-6">
        <Routes>
          <Route path="/" element={<ProjectList key={team.id} team={team} />} />
          <Route path="/p/:projectId" element={<ProjectPage />} />
          <Route path="/p/:projectId/plan/:planId" element={<PlanDetail />} />
        </Routes>
      </main>
    </div>
  )
}
