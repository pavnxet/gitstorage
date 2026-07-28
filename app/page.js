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
  const [theme, setTheme] = useState('dark');
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
    const savedTheme = localStorage.getItem('site_theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const match = document.cookie.match(/site_auth=([^;]+)/);
    if (match) localStorage.setItem('site_pw', match[1]);
    fetchFiles('');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('site_theme', nextTheme);
  };

  const uploadFiles = async (fileList) => {
    if (!fileList || !fileList.length) return;
    setErrorMsg('');
    setUploading(true);

    const total = fileList.length;
    let count = 0;

    for (let file of fileList) {
      count++;
      setUploadProgress(`Uploading (${count}/${total}): ${file.name}...`);

      if (file.size > 4.0 * 1024 * 1024) {
        setErrorMsg(`File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)}MB. Limit is 4.0MB to prevent Vercel body overflow.`);
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

  const navigateUp = () => {
    if (!path) return;
    const parts = path.split('/');
    parts.pop();
    const np = parts.join('/');
    setPath(np);
    fetchFiles(np);
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

  const formatSize = (bytes) => {
    if (bytes === 0 || bytes === undefined) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isDark = theme === 'dark';
  const styles = {
    bg: isDark ? '#09090b' : '#ffffff',
    text: isDark ? '#e4e4e7' : '#18181b',
    border: isDark ? '#27272a' : '#e4e4e7',
    subtleBorder: isDark ? '#18181b' : '#f4f4f5',
    cardBg: isDark ? '#121215' : '#f4f4f5',
    altRowBg: isDark ? '#0d0d10' : '#fafafa',
    mutedText: isDark ? '#a1a1aa' : '#71717a',
    link: isDark ? '#60a5fa' : '#2563eb',
    btnBg: isDark ? '#27272a' : '#e4e4e7',
    btnText: isDark ? '#ffffff' : '#18181b'
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', fontFamily: 'monospace, system-ui, sans-serif', color: styles.text, background: styles.bg, minHeight: '100vh', transition: 'background 0.2s ease, color 0.2s ease' }}>
      
      {/* Header bar with Index path, Theme Toggle, and Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${styles.border}`, paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
            Index of /{path}
          </h1>
          <p style={{ color: styles.mutedText, fontSize: 12, margin: '4px 0 0 0' }}>
            Directory Index Listing {loading ? '(Loading...)' : `(${files.length} items)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={toggleTheme}
            style={{ padding: '6px 14px', background: styles.btnBg, color: styles.btnText, border: `1px solid ${styles.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
          <button
            onClick={() => fetchFiles()}
            style={{ padding: '6px 14px', background: styles.btnBg, color: styles.btnText, border: `1px solid ${styles.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
          <button
            onClick={logout}
            style={{ padding: '6px 14px', background: '#3f3f46', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#450a0a', border: '1px solid #991b1b', borderRadius: 8, color: '#fca5a5', fontSize: 13, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><b>Error:</b> {errorMsg}</div>
          <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', color: '#fca5a5', fontSize: 16, cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginTop: 20,
          background: isDragging ? styles.cardBg : (isDark ? '#121215' : '#f8f8f8'),
          border: `2px dashed ${isDragging ? styles.link : styles.border}`,
          borderRadius: 10,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
      >
        <input ref={fileInputRef} type="file" multiple onChange={onFileChange} style={{ display: 'none' }} />
        <div>
          <h4 style={{ margin: 0, fontSize: 15, fontFamily: 'system-ui, sans-serif', fontWeight: 600 }}>
            {uploading ? 'Uploading Files...' : '📁 Upload Files to Current Directory'}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: styles.mutedText }}>
            Drag & drop files here or click to browse (Max 4MB per file)
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          style={{
            padding: '8px 18px',
            background: isDark ? 'white' : '#18181b',
            color: isDark ? 'black' : 'white',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {uploading ? 'Uploading...' : 'Browse Files'}
        </button>
      </div>

      {uploadProgress && (
        <div style={{ marginTop: 10, fontSize: 12, color: styles.link, fontWeight: 600 }}>
          {uploadProgress}
        </div>
      )}

      {/* Directory Index Table */}
      <div style={{ marginTop: 24, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${styles.border}`, color: styles.mutedText }}>
              <th style={{ padding: '10px 12px', fontWeight: 700 }}>Name</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, width: 140 }}>Type</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, width: 120, textAlign: 'right' }}>Size</th>
              <th style={{ padding: '10px 12px', fontWeight: 700, width: 160, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Parent Directory Link */}
            {path && (
              <tr
                onClick={navigateUp}
                style={{ borderBottom: `1px solid ${styles.subtleBorder}`, cursor: 'pointer', background: styles.cardBg }}
              >
                <td colSpan={4} style={{ padding: '10px 12px', color: styles.link, fontWeight: 600 }}>
                  📁 Parent Directory/
                </td>
              </tr>
            )}

            {files.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: '24px 12px', textAlign: 'center', color: styles.mutedText }}>
                  Directory is empty.
                </td>
              </tr>
            )}

            {files.map((f, idx) => (
              <tr
                key={f.sha || idx}
                style={{
                  borderBottom: `1px solid ${styles.subtleBorder}`,
                  background: idx % 2 === 0 ? styles.bg : styles.altRowBg
                }}
              >
                <td style={{ padding: '10px 12px' }}>
                  {f.type === 'dir' ? (
                    <span
                      onClick={() => viewFolder(f)}
                      style={{ cursor: 'pointer', color: styles.link, fontWeight: 600 }}
                    >
                      📁 {f.name}/
                    </span>
                  ) : (
                    <span>📄 {f.name}</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', color: styles.mutedText, fontSize: 12 }}>
                  {f.type === 'dir' ? 'Directory' : 'File'}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'right', color: styles.mutedText }}>
                  {formatSize(f.size)}
                </td>
                <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    {f.type === 'file' && (
                      <a
                        href={f.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 10px',
                          background: styles.btnBg,
                          color: styles.btnText,
                          borderRadius: 4,
                          fontSize: 11,
                          textDecoration: 'none'
                        }}
                      >
                        Download
                      </a>
                    )}
                    <button
                      onClick={() => handleDelete(f.path)}
                      style={{
                        padding: '4px 10px',
                        background: '#7f1d1d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${styles.subtleBorder}`, color: styles.mutedText, fontSize: 11, textAlign: 'center' }}>
        Directory Listing Index • Secure GitHub Storage Server
      </div>
    </div>
  );
}
