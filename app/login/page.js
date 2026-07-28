'use client';
import { useState } from 'react';
export default function Login() {
  const [pw, setPw] = useState(''); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/auth', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ password: pw }) });
    const data = await res.json();
    if (data.success) window.location.href = '/';
    else setErr('Wrong password');
  };
  return (
    <div style={{minHeight:'100vh', display:'grid', placeItems:'center', background:'#09090b'}}>
      <form onSubmit={submit} style={{background:'#18181b', padding:32, borderRadius:16, width:320, border:'1px solid #27272a'}}>
        <h2 style={{margin:0, fontSize:20, fontWeight:700}}>Protected</h2>
        <p style={{opacity:0.6, fontSize:13}}>Enter site password to access storage</p>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Password" style={{width:'100%', marginTop:16, padding:10, borderRadius:8, background:'#27272a', border:'1px solid #3f3f46', color:'white'}} />
        {err && <p style={{color:'#f87171', fontSize:12}}>{err}</p>}
        <button type="submit" style={{width:'100%', marginTop:12, padding:10, background:'white', color:'black', borderRadius:8, fontWeight:700}}>Unlock</button>
      </form>
    </div>
  );
}
