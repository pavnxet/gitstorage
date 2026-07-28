'use client';
import { useState, useEffect } from 'react';

export default function Page() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState('');

  const fetchFiles = async (p=path) => {
    setLoading(true);
    const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('site_pw')||''}` } });
    const data = await res.json();
    if (data.files) setFiles(data.files);
    else if (data.error) console.error(data.error);
    setLoading(false);
  };

  useEffect(()=>{
    const pw = document.cookie.split('site_auth=')[1]?.split(';')[0];
    if(pw) localStorage.setItem('site_pw', pw);
    fetchFiles('');
  },[]);

  const handleUpload = async (e) => {
    const fileList = e.target.files;
    if (!fileList.length) return;
    setLoading(true);
    for (let file of fileList) {
      const reader = new FileReader();
      const base64 = await new Promise(res=>{
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const uploadPath = path ? `${path}/${file.name}` : `uploads/${file.name}`;
      await fetch('/api/upload', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ path: uploadPath, content: base64, isBase64:true })
      });
    }
    setLoading(false);
    fetchFiles();
    e.target.value = '';
  };

  const downloadFile = (f) => {
    // Direct download via GitHub raw with token proxy? Use download_url via API
    // For simplicity, open download_url in new tab (works if repo public or tokenless via Vercel proxy)
    window.open(f.download_url, '_blank');
  };

  const viewFolder = (f) => {
    if (f.type==='dir') { setPath(f.path); fetchFiles(f.path); }
  };

  const handleDelete = async (p) => {
    if(!confirm(`Delete ${p}?`)) return;
    await fetch(`/api/delete?path=${encodeURIComponent(p)}`, { method:'DELETE' });
    fetchFiles();
  };

  const logout = async () => {
    await fetch('/api/auth', { method:'DELETE' });
    localStorage.clear();
    window.location.href='/login';
  };

  return (
    <div style={{maxWidth:900, margin:'0 auto', padding:24}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <h1 style={{fontSize:24, fontWeight:800}}>🔒 Secure Storage</h1>
        <button onClick={logout} style={{padding:'6px 12px', background:'#27272a', borderRadius:8, fontSize:12}}>Logout</button>
      </div>
      <p style={{opacity:0.6, fontSize:13}}>Path: /{path} | Only upload & download (no create file)</p>

      <div style={{marginTop:20, background:'#18181b', padding:16, borderRadius:12, border:'1px solid #27272a'}}>
        <h3 style={{margin:0}}>Upload Files</h3>
        <input type="file" multiple onChange={handleUpload} style={{marginTop:10}} />
        <p style={{fontSize:11, opacity:0.5}}>Files go directly to GitHub repo via API. Supports any file type.</p>
      </div>

      <div style={{marginTop:16, background:'#18181b', padding:16, borderRadius:12, border:'1px solid #27272a'}}>
        <div style={{display:'flex', gap:8, marginBottom:12}}>
          <button onClick={()=>{setPath(''); fetchFiles('');}} style={{padding:'6px 12px', background:'#27272a', borderRadius:8}}>Root</button>
          {path && <button onClick={()=>{const parts=path.split('/'); parts.pop(); const np=parts.join('/'); setPath(np); fetchFiles(np);}} style={{padding:'6px 12px', background:'#27272a', borderRadius:8}}>Back</button>}
          <button onClick={()=>fetchFiles()} style={{padding:'6px 12px', background:'white', color:'black', borderRadius:8}}>{loading?'...':'Refresh'}</button>
        </div>
        {files.length===0 && <p style={{opacity:0.5}}>No files in this folder</p>}
        {files.map(f=>(
          <div key={f.sha} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'#09090b', marginBottom:6, borderRadius:8}}>
            <span onClick={()=>viewFolder(f)} style={{cursor:f.type==='dir'?'pointer':'default'}}>{f.type==='dir'?'📁':'📄'} {f.name} <span style={{opacity:0.4, fontSize:11}}>({(f.size/1024).toFixed(1)} KB)</span></span>
            <div style={{display:'flex', gap:8}}>
              {f.type==='file' && <a href={f.download_url} target="_blank" style={{padding:'4px 10px', background:'#3f3f46', borderRadius:6, fontSize:12, textDecoration:'none', color:'white'}}>Download</a>}
              <button onClick={()=>handleDelete(f.path)} style={{padding:'4px 10px', background:'#7f1d1d', borderRadius:6, fontSize:12}}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:20, padding:12, background:'#1a1a2e', borderRadius:8, fontSize:12}}>
        <b>Fix 403 Token Error:</b><br/>
        1. Your PAT must be Classic OR Fine-grained with Contents: Read and Write<br/>
        2. Repo must be owned by same user as token<br/>
        3. In Vercel Env: GITHUB_TOKEN must start with github_pat_ or ghp_<br/>
        4. Re-deploy after changing env vars
      </div>
    </div>
  );
}
