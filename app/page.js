'use client';
import { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [path, setPath] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const getAuthHeader = () => {
    const pw = localStorage.getItem('site_pw') || '';
    return pw ? { 'Authorization': `Bearer ${pw}` } : {};
  };

  const fetchFiles = async (p = path) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(p)}`, {
        headers: getAuthHeader()
      });
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      } else if (data.error) {
        setErrorMsg(data.error);
      }
    } catch (e) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to fetch files');
    }
    setLoading(false);
  };

  useEffect(() => {
    const match = document.cookie.match(/site_auth=([^;]+)/);
    if (match) localStorage.setItem('site_pw', match[1]);
    fetchFiles('');
  }, []);

  const uploadFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setErrorMsg('');
    setUploading(true);

    const total = fileList.length;
    let count = 0;

    for (let file of fileList) {
      count++;
      setUploadProgress(`Uploading (${count}/${total}): ${file.name}...`);

      if (file.size > 4.5 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Vercel serverless limit is 4.5MB. Please choose a smaller file.`);
        setUploading(false);
        setUploadProgress('');
        return;
      }

      try {
        const reader = new FileReader();
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result;
            if (typeof result === 'string') {
              const parts = result.split(',');
              resolve(parts.length > 1 ? parts[1] : result);
            } else {
              reject(new Error('Failed to read file contents'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });

        const uploadPath = path ? `${path}/${file.name}` : `uploads/${file.name}`;
        const resp = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeader()
          },
          body: JSON.stringify({ path: uploadPath, content: base64, isBase64: true })
        });

        const result = await resp.json();
        if (!resp.ok || !result.success) {
          throw new Error(result.error || `Server error ${resp.status}`);
        }
      } catch (err) {
        console.error('Upload failed:', err);
        setErrorMsg(`Upload failed for "${file.name}": ${err.message}`);
        setUploading(false);
        setUploadProgress('');
        fetchFiles();
        return;
      }
    }

    setUploading(false);
    setUploadProgress('');
    fetchFiles();
  };

  const onFileChange = (e) => {
    uploadFiles(e.target.files);
    e.target.value = '';
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
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
    setErrorMsg('');
    try {
      const resp = await fetch(`/api/delete?path=${encodeURIComponent(p)}`, {
        method: 'DELETE',
        headers: getAuthHeader()
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Delete failed');
      } else {
        fetchFiles();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Delete request failed');
    }
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
        <button onClick={logout} style={{ padding: '6px 14px', background: '#27272a', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>Logout</button>
      </div>
      <p style={{ opacity: 0.6, fontSize: 13, marginTop: 6 }}>Path: /{path || 'root'} | {loading ? 'Loading...' : `${files.length} items`}</p>

      {/* ERROR ALERT BANNER */}
      {errorMsg && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#450a0a', border: '1px solid #991b1b', borderRadius: 10, color: '#fca5a5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><b>Error:</b> {errorMsg}</div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: 16, cursor: 'pointer', marginLeft: 12 }}>✕</button>
        </div>
      )}

      {/* UPLOAD SECTION - DRAG AND DROP ZONE */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginTop: 20,
          background: isDragging ? '#27272a' : '#18181b',
          border: `2px dashed ${isDragging ? '#3b82f6' : '#3f3f46'}`,
          borderRadius: 16,
          padding: '32px 24px',
          textAlign: 'center',
          transition: 'all 0.2s ease',
          cursor: 'pointer'
        }}
      >
        <div style={{ fontSize: 36, marginBottom: 8 }}>☁️</div>
        <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>
          {uploading ? 'Uploading...' : 'Drag & Drop files here'}
        </h3>
        <p style={{ fontSize: 12, opacity: 0.5, margin: '0 0 16px 0' }}>
          Supports any file format (up to 4MB per file on Vercel)
        </p>

        <input ref={fileInputRef} type="file" multiple onChange={onFileChange} style={{ display: 'none' }} />
        <button
          type="button"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            padding: '10px 24px',
            background: 'white',
            color: 'black',
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 14,
            border: 'none',
            cursor: 'pointer',
            opacity: uploading ? 0.6 : 1
          }}
        >
          {uploading ? 'Uploading...' : '📁 Choose Files to Upload'}
        </button>

        {uploadProgress && <p style={{ marginTop: 12, color: '#60a5fa', fontSize: 13, fontWeight: 600 }}>{uploadProgress}</p>}
      </div>

      {/* FILE LIST */}
      <div style={{ marginTop: 20, background: '#18181b', padding: 16, borderRadius: 16, border: '1px solid #27272a' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => { setPath(''); fetchFiles(''); }} style={{ padding: '6px 14px', background: '#27272a', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>🏠 Root</button>
          {path && <button onClick={() => { const parts = path.split('/'); parts.pop(); const np = parts.join('/'); setPath(np); fetchFiles(np); }} style={{ padding: '6px 14px', background: '#27272a', borderRadius: 8, color: 'white', border: 'none', cursor: 'pointer', fontSize: 13 }}>⬅ Back</button>}
          <button onClick={() => fetchFiles()} style={{ padding: '6px 14px', background: 'white', color: 'black', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{loading ? '...' : '🔄 Refresh'}</button>
        </div>

        {files.length === 0 && !loading && (
          <p style={{ opacity: 0.5, textAlign: 'center', padding: '24px 0', fontSize: 13 }}>No files in this folder. Upload something above!</p>
        )}

        {files.map(f => (
          <div key={f.sha} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: '#09090b', marginBottom: 8, borderRadius: 10, border: '1px solid #1f1f23' }}>
            <span onClick={() => viewFolder(f)} style={{ cursor: f.type === 'dir' ? 'pointer' : 'default', flex: 1, fontSize: 14 }}>
              {f.type === 'dir' ? '📁' : '📄'} <b>{f.name}</b> <span style={{ opacity: 0.4, fontSize: 12, marginLeft: 6 }}>({(f.size / 1024).toFixed(1)} KB)</span>
            </span>
            <div style={{ display: 'flex', gap: 8, marginLeft: 10 }}>
              {f.type === 'file' && (
                <a href={f.download_url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 12px', background: '#27272a', borderRadius: 8, fontSize: 12, textDecoration: 'none', color: 'white', fontWeight: 500 }}>
                  ⬇ Download
                </a>
              )}
              <button onClick={() => handleDelete(f.path)} style={{ padding: '6px 12px', background: '#7f1d1d', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, padding: 14, background: '#1a1a2e', borderRadius: 10, fontSize: 12, color: '#a5b4fc', border: '1px solid #312e81' }}>
        <b>Setup Requirements in Vercel Environment Variables:</b><br />
        1. <code>GITHUB_TOKEN</code>: Personal Access Token (Classic with <code>repo</code> scope, or Fine-grained with <code>Contents: Read & Write</code>).<br />
        2. <code>GITHUB_OWNER</code>: GitHub username (e.g., <code>pavnxet</code>).<br />
        3. <code>GITHUB_REPO</code>: Repository name (e.g., <code>gitstorage</code>).<br />
        4. <code>GITHUB_BRANCH</code>: Branch name (e.g., <code>main</code>).<br />
        5. <code>SITE_PASSWORD</code>: (Optional) Password for login page protection.
      </div>
    </div>
  );
}
