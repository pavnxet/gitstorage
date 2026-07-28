'use client';
import { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [path, setPath] = useState('');
  const fileInputRef = useRef(null);

  const fetchFiles = async (p = path) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('site_pw') || ''}` }
      });
      const data = await res.json();
      if (data.files) setFiles(data.files);
      else if (data.error) console.error(data.error);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  useEffect(() => {
    const pw = document.cookie.split('site_auth=')[1]?.split(';')[0];
    if (pw) localStorage.setItem('site_pw', pw);
    fetchFiles('');
  }, []);

  const processFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setUploading(true);
    try {
      for (let file of fileList) {
        const reader = new FileReader();
        const base64 = await new Promise((res) => {
          reader.onload = () => res(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
        const uploadPath = path ? `${path}/${file.name}` : `uploads/${file.name}`;
        await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('site_pw') || ''}`
          },
          body: JSON.stringify({ path: uploadPath, content: base64, isBase64: true })
        });
      }
    } catch (err) {
      console.error(err);
      alert('Upload failed: ' + err.message);
    }
    setUploading(false);
    fetchFiles();
  };

  const handleUpload = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const viewFolder = (f) => {
    if (f.type === 'dir') {
      setPath(f.path);
      fetchFiles(f.path);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Delete ${p}?`)) return;
    await fetch(`/api/delete?path=${encodeURIComponent(p)}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('site_pw') || ''}` }
    });
    fetchFiles();
  };

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' });
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 24, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>🔒 Secure Storage</h1>
        <button onClick={logout} style={{ padding: '6px 14px', background: '#27272a', color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Logout</button>
      </div>
      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>Path: /{path} | Upload, download & manage files</p>

      {/* Drag and Drop Zone + Large Upload Button */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          marginTop: 20,
          background: isDragging ? '#27272a' : '#18181b',
          border: `2px dashed ${isDragging ? '#3b82f6' : '#3f3f46'}`,
          borderRadius: 16,
          padding: '36px 24px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          multiple
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 40, marginBottom: 8 }}>☁️</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
          {uploading ? 'Uploading files...' : 'Drag & Drop files here'}
        </h3>
        <p style={{ fontSize: 13, color: '#a1a1aa', margin: '0 0 16px 0' }}>
          Supports any file format (up to 4.5MB per file via Vercel)
        </p>
        <button
          type="button"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            padding: '10px 24px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? 'Uploading...' : '📁 Select Files to Upload'}
        </button>
      </div>

      {/* File List */}
      <div style={{ marginTop: 24, background: '#18181b', padding: 20, borderRadius: 16, border: '1px solid #27272a' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button onClick={() => { setPath(''); fetchFiles(''); }} style={{ padding: '6px 14px', background: '#27272a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Root</button>
          {path && <button onClick={() => { const parts = path.split('/'); parts.pop(); const np = parts.join('/'); setPath(np); fetchFiles(np); }} style={{ padding: '6px 14px', background: '#27272a', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Back</button>}
          <button onClick={() => fetchFiles()} style={{ padding: '6px 14px', background: 'white', color: 'black', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{loading ? '...' : 'Refresh'}</button>
        </div>
        {files.length === 0 && <p style={{ opacity: 0.5, fontSize: 13 }}>No files in this folder</p>}
        {files.map(f => (
          <div key={f.sha} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#09090b', marginBottom: 8, borderRadius: 10, border: '1px solid #18181b' }}>
            <span onClick={() => viewFolder(f)} style={{ cursor: f.type === 'dir' ? 'pointer' : 'default', fontWeight: 500 }}>
              {f.type === 'dir' ? '📁' : '📄'} {f.name} <span style={{ opacity: 0.4, fontSize: 12, marginLeft: 6 }}>({(f.size / 1024).toFixed(1)} KB)</span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {f.type === 'file' && <a href={f.download_url} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', background: '#27272a', borderRadius: 6, fontSize: 12, textDecoration: 'none', color: 'white', fontWeight: 500 }}>Download</a>}
              <button onClick={() => handleDelete(f.path)} style={{ padding: '5px 12px', background: '#7f1d1d', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: '#1a1a2e', borderRadius: 10, fontSize: 12, color: '#a5b4fc', border: '1px solid #312e81' }}>
        <b>Fix 403 Token Error:</b><br />
        1. Your PAT must be Classic OR Fine-grained with Contents: Read and Write<br />
        2. Repo must be owned by same user as token<br />
        3. In Vercel Env: GITHUB_TOKEN must start with github_pat_ or ghp_<br />
        4. Re-deploy after changing env vars
      </div>
    </div>
  );
}
