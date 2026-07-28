'use client';
import { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = async (p=path) => {
    setLoading(true);
    try {
      const pw = localStorage.getItem('site_pw') || '';
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, {
        headers: { 'Authorization': `Bearer ${pw}` }
      });
      const data = await res.json();
      if (data.files) setFiles(data.files);
      else console.error(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{
    const match = document.cookie.match(/site_auth=([^;]+)/);
    if(match) localStorage.setItem('site_pw', match[1]);
    fetchFiles('');
  },[]);

  const uploadFiles = async (fileList) => {
    if (!fileList.length) return;
    setLoading(true);
    const pw = localStorage.getItem('site_pw') || '';
    for (let file of fileList) {
      const reader = new FileReader();
      const base64 = await new Promise(res=>{
        reader.onload = () => res(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const uploadPath = path ? `${path}/${file.name}` : `uploads/${file.name}`;
      const resp = await fetch('/api/upload', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'Authorization': `Bearer ${pw}` },
        body: JSON.stringify({ path: uploadPath, content: base64, isBase64:true })
      });
      const result = await resp.json();
      if (!result.success) {
        alert(`Upload failed for ${file.name}: ${result.error}`);
      }
    }
    setLoading(false);
    fetchFiles();
  };

  const onFileChange = (e) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const onDrop = (e) => {
    e.preventDefault();
    uploadFiles(e.dataTransfer.files);
  };

  const viewFolder = (f) => {
    if (f.type==='dir') { setPath(f.path); fetchFiles(f.path); }
  };

  const handleDelete = async (p) => {
    if(!confirm(`Delete ${p}?`)) return;
    const pw = localStorage.getItem('site_pw') || '';
    await fetch(`/api/delete?path=${encodeURIComponent(p)}`, { 
      method:'DELETE',
      headers:{ 'Authorization': `Bearer ${pw}` }
    });
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
        <button onClick={logout} style={{padding:'6px 12px', background:'#27272a', borderRadius:8, fontSize:12, color:'white'}}>Logout</button>
      </div>
      <p style={{opacity:0.6, fontSize:13}}>Path: /{path || 'root'} | {loading ? 'Loading...' : `${files.length} items`}</p>

      {/* UPLOAD SECTION - BIG BUTTON */}
      <div 
        onDragOver={(e)=>e.preventDefault()} 
        onDrop={onDrop}
        style={{marginTop:20, background:'#18181b', padding:24, borderRadius:16, border:'2px dashed #3f3f46', textAlign:'center'}}
      >
        <h3 style={{margin:'0 0 8px 0'}}>Upload Files</h3>
        <p style={{fontSize:12, opacity:0.5, margin:'0 0 16px 0'}}>Drag & drop here or click button (max 4MB per file on Vercel)</p>
        
        <input ref={fileInputRef} type="file" multiple onChange={onFileChange} style={{display:'none'}} />
        <button 
          onClick={()=>fileInputRef.current?.click()}
          style={{padding:'12px 24px', background:'white', color:'black', borderRadius:10, fontWeight:800, fontSize:14, border:'none', cursor:'pointer'}}
        >
          📁 Choose Files to Upload
        </button>
        
        {loading && <p style={{marginTop:12, color:'#a1a1aa'}}>Uploading...</p>}
      </div>

      {/* FILE LIST */}
      <div style={{marginTop:16, background:'#18181b', padding:16, borderRadius:12, border:'1px solid #27272a'}}>
        <div style={{display:'flex', gap:8, marginBottom:12, flexWrap:'wrap'}}>
          <button onClick={()=>{setPath(''); fetchFiles('');}} style={{padding:'6px 12px', background:'#27272a', borderRadius:8, color:'white', border:'none', cursor:'pointer'}}>🏠 Root</button>
          {path && <button onClick={()=>{const parts=path.split('/'); parts.pop(); const np=parts.join('/'); setPath(np); fetchFiles(np);}} style={{padding:'6px 12px', background:'#27272a', borderRadius:8, color:'white', border:'none'}}>⬅ Back</button>}
          <button onClick={()=>fetchFiles()} style={{padding:'6px 12px', background:'white', color:'black', borderRadius:8, border:'none', cursor:'pointer'}}>{loading?'...':'🔄 Refresh'}</button>
        </div>
        
        {files.length===0 && !loading && <p style={{opacity:0.5, textAlign:'center', padding:20}}>No files here. Upload something!</p>}
        
        {files.map(f=>(
          <div key={f.sha} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px', background:'#09090b', marginBottom:8, borderRadius:10, border:'1px solid #1f1f23'}}>
            <span onClick={()=>viewFolder(f)} style={{cursor:f.type==='dir'?'pointer':'default', flex:1}}>
              {f.type==='dir'?'📁':'📄'} <b>{f.name}</b> <span style={{opacity:0.4, fontSize:11}}> {(f.size/1024).toFixed(1)} KB</span>
            </span>
            <div style={{display:'flex', gap:8, marginLeft:10}}>
              {f.type==='file' && <a href={f.download_url} target="_blank" rel="noopener noreferrer" style={{padding:'6px 12px', background:'#3f3f46', borderRadius:8, fontSize:12, textDecoration:'none', color:'white'}}>⬇ Download</a>}
              <button onClick={()=>handleDelete(f.path)} style={{padding:'6px 12px', background:'#7f1d1d', borderRadius:8, fontSize:12, color:'white', border:'none', cursor:'pointer'}}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
