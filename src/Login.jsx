import { useState } from 'react'
import { supabase } from './supabase'

const BORDER = '3px solid #111'
const MONO   = "'Space Mono', 'Courier New', monospace"

export default function Login() {
  const [mode, setMode]         = useState('signin')   // 'signin' | 'signup'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(null)
  const [loading, setLoading]   = useState(false)

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirm('')
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match.'); return }
    if (password.length < 6)  { setError('Password must be at least 6 characters.'); return }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Account created! Check your email to confirm your address, then sign in.')
    }
    setLoading(false)
  }

  const handleDemo = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email:'danielpapageorge@gmail.com', password:'DemoTime99!' })
    if (error) setError('Demo unavailable. Try again later.')
    setLoading(false)
  }

  const isSignUp = mode === 'signup'

  return (
    <div style={{ minHeight:'100vh', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:MONO, padding:16 }}>
      <div style={{ width:'100%', maxWidth:380, border:BORDER, boxShadow:'5px 5px 0 #111' }}>

        {/* Header */}
        <div style={{ padding:'24px 24px 20px', borderBottom:BORDER }}>
          <h1 style={{ margin:0, fontSize:36, fontWeight:400, letterSpacing:'0.1em', textTransform:'uppercase', lineHeight:1, fontFamily:"'VT323', monospace" }}>MOODY</h1>
          <p style={{ margin:'6px 0 0', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase', color:'#555' }}>
            {isSignUp ? 'Create an account' : 'Sign in to continue'}
          </p>
        </div>

        {/* Demo banner */}
        <button onClick={handleDemo} disabled={loading}
          style={{ width:'100%', padding:'13px 0', border:'none', borderBottom:BORDER, background:'#f5f5f5', color:'#111', fontSize:11, fontWeight:700, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.1em', fontFamily:MONO }}>
          ▶  TRY DEMO — NO SIGN UP NEEDED
        </button>

        {/* Mode tabs */}
        <div style={{ display:'flex', borderBottom:BORDER }}>
          {[['signin','SIGN IN'],['signup','CREATE ACCOUNT']].map(([m, label]) => (
            <button key={m} onClick={() => switchMode(m)}
              style={{ flex:1, padding:'11px 0', border:'none', borderRight: m==='signin' ? BORDER : 'none',
                background: mode===m ? '#111' : '#fff', color: mode===m ? '#fff' : '#111',
                fontSize:11, fontWeight:700, cursor:'pointer', textTransform:'uppercase',
                letterSpacing:'0.08em', fontFamily:MONO }}>
              {label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn}
          style={{ padding:24, display:'flex', flexDirection:'column', gap:16 }}>

          <div>
            <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 6px', fontFamily:MONO }}>EMAIL</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:14, fontFamily:MONO, outline:'none', background:'#fff', boxSizing:'border-box' }}
              placeholder="you@example.com" required />
          </div>

          <div>
            <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 6px', fontFamily:MONO }}>PASSWORD</p>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:14, fontFamily:MONO, outline:'none', background:'#fff', boxSizing:'border-box' }}
              placeholder="••••••••" required />
          </div>

          {isSignUp && (
            <div>
              <p style={{ fontSize:10, fontWeight:900, letterSpacing:'0.12em', textTransform:'uppercase', margin:'0 0 6px', fontFamily:MONO }}>CONFIRM PASSWORD</p>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                style={{ width:'100%', border:BORDER, padding:'10px 12px', fontSize:14, fontFamily:MONO, outline:'none', background:'#fff', boxSizing:'border-box' }}
                placeholder="••••••••" required />
            </div>
          )}

          {error && (
            <p style={{ margin:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#c00', fontFamily:MONO }}>{error}</p>
          )}

          {success && (
            <p style={{ margin:0, fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:'#276', lineHeight:1.5, fontFamily:MONO }}>{success}</p>
          )}

          {!success && (
            <button type="submit" disabled={loading}
              style={{ padding:'14px 0', border:BORDER, background:'#111', color:'#fff', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.12em', marginTop:4, fontFamily:MONO }}>
              {loading ? (isSignUp ? 'CREATING…' : 'SIGNING IN…') : (isSignUp ? 'CREATE ACCOUNT' : 'SIGN IN')}
            </button>
          )}

          {success && (
            <button type="button" onClick={() => switchMode('signin')}
              style={{ padding:'14px 0', border:BORDER, background:'#fff', color:'#111', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.12em', fontFamily:MONO }}>
              BACK TO SIGN IN
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
