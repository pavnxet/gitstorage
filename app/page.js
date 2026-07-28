'use client';
import { useState, useEffect, useRef } from 'react';

export default function Page() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [path, setPath] = useState('uploads');
  const [errorMsg, setErrorMsg] = useState('');
  const [theme, setTheme] = useState('dark');
  const [previewFile, setPreviewFile] = useState(null);
  const [htmlMode, setHtmlMode] = useState('live'); // 'live' or 'code'
  const [historyModal, setHistoryModal] = useState(null);
  const [repoStats, setRepoStats] = useState(null);
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

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/stats', { headers: getAuthHeader() });
      const data = await res.json();
      if (data.sizeKB !== undefined) {
        setRepoStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changePath = (newPath) => {
    setPath(newPath);
    localStorage.setItem('site_last_path', newPath);
    fetchFiles(newPath);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('site_theme');
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const match = document.cookie.match(/site_auth=([^;]+)/);
    if (match) localStorage.setItem('site_pw', match[1]);

    const lastPath = localStorage.getItem('site_last_path');
    const initialPath = lastPath !== null ? lastPath : 'uploads';
    setPath(initialPath);
    fetchFiles(initialPath);
    fetchStats();
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

        const uploadPath = path ? `${path}/${file.name}` : file.name;

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
        fetchStats();
        return;
      }
    }

    setUploading(false);
    setUploadProgress('');
    fetchFiles();
    fetchStats();
  };

  const handleCreateFolder = async () => {
    const folderName = prompt('Enter new folder name:');
    if (!folderName || !folderName.trim()) return;
    setErrorMsg('');
    try {
      const resp = await fetch('/api/folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ name: folderName.trim(), path })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to create folder');
      } else {
        fetchFiles();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Folder creation failed');
    }
  };

  const handleRename = async (f) => {
    const newName = prompt(`Rename "${f.name}" to:`, f.name);
    if (!newName || !newName.trim() || newName.trim() === f.name) return;
    setErrorMsg('');
    try {
      const resp = await fetch('/api/rename', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ from: f.path, newName: newName.trim() })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Rename failed');
      } else {
        fetchFiles();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Rename failed');
    }
  };

  const handleCopy = async (srcPath) => {
    const fileName = srcPath.split('/').pop();
    const defaultTo = path ? `${path}/copy_${fileName}` : `copy_${fileName}`;
    const to = prompt(`Copy "${srcPath}" to path:`, defaultTo);
    if (!to || !to.trim()) return;
    setErrorMsg('');
    try {
      const resp = await fetch('/api/copy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ from: srcPath, to: to.trim() })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Copy failed');
      } else {
        fetchFiles();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Copy failed');
    }
  };

  const handleMove = async (srcPath) => {
    const fileName = srcPath.split('/').pop();
    const defaultTo = path ? `${path}/${fileName}` : fileName;
    const to = prompt(`Move "${srcPath}" to new path:`, defaultTo);
    if (!to || !to.trim() || to.trim() === srcPath) return;
    setErrorMsg('');
    try {
      const resp = await fetch('/api/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader()
        },
        body: JSON.stringify({ from: srcPath, to: to.trim() })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        setErrorMsg(data.error || 'Move failed');
      } else {
        fetchFiles();
      }
    } catch (err) {
      setErrorMsg(err.message || 'Move failed');
    }
  };

  const handleHistory = async (f) => {
    setHistoryModal({ file: f, history: [], loading: true });
    try {
      const res = await fetch(`/api/history?path=${encodeURIComponent(f.path)}`, { headers: getAuthHeader() });
      const data = await res.json();
      if (data.history) {
        setHistoryModal({ file: f, history: data.history, loading: false });
      } else {
        setHistoryModal({ file: f, history: [], loading: false, error: data.error || 'No history' });
      }
    } catch (err) {
      setHistoryModal({ file: f, history: [], loading: false, error: err.message });
    }
  };

  const handleFileClick = async (f) => {
    if (f.type === 'dir') {
      changePath(f.path);
      return;
    }

    setHtmlMode('live');
    setPreviewFile({ file: f, content: null, loading: true });

    const ext = f.name.split('.').pop().toLowerCase();
    const textExts = ['txt', 'md', 'json', 'js', 'css', 'html', 'htm', 'py', 'ts', 'jsx', 'tsx', 'csv', 'log', 'xml', 'yaml', 'yml'];

    if (textExts.includes(ext) && f.download_url) {
      try {
        const res = await fetch(f.download_url);
        const text = await res.text();
        setPreviewFile({ file: f, content: text.slice(0, 50000), loading: false });
      } catch (err) {
        setPreviewFile({ file: f, content: 'Failed to load text content.', loading: false });
      }
    } else {
      setPreviewFile({ file: f, content: null, loading: false });
    }
  };

  const getHtmlSrcDoc = (content) => {
    if (!content) return '';
    if (content.includes('<head>')) {
      return content.replace('<head>', '<head><base target="_blank">');
    } else if (content.includes('<html>')) {
      return content.replace('<html>', '<html><head><base target="_blank"></head>');
    }
    return `<head><base target="_blank"></head>${content}`;
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

  const navigateUp = () => {
    if (!path) return;
    const parts = path.split('/');
    parts.pop();
    const np = parts.join('/');
    changePath(np);
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
        fetchStats();
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', fontFamily: 'monospace, system-ui, sans-serif', color: styles.text, background: styles.bg, minHeight: '100vh', transition: 'background 0.2s ease, color 0.2s ease' }}>
      
      {/* Responsive Style Overrides */}
      <style jsx global>{`
        .index-table-wrapper {
          overflow-x: auto;
        }
        .index-table-wrapper::-webkit-scrollbar {
          height: 6px;
        }
        .index-table-wrapper::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        @media (max-width: 768px) {
          .header-container {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 12px !important;
          }
          .controls-group {
            width: 100% !important;
            justify-content: flex-start !important;
            overflow-x: auto;
            flex-wrap: nowrap !important;
            padding-bottom: 4px;
          }
          .controls-btn {
            white-space: nowrap !important;
          }
          .upload-zone {
            flex-direction: column !important;
            text-align: center !important;
            gap: 14px !important;
          }
          .upload-btn {
            width: 100% !important;
          }
          .index-table {
            font-size: 13px !important;
          }
          .index-table th, .index-table td {
            padding: 10px 10px !important;
            white-space: nowrap !important;
          }
          .hide-mobile {
            display: table-cell !important;
          }
        }
      `}</style>

      {/* Header bar with Index path, Theme Toggle, and Controls */}
      <div className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${styles.border}`, paddingBottom: 16 }}>
        <div>
          <h1 style={{ fontSize: 'clamp(18px, 4vw, 22px)', fontWeight: 700, margin: 0, fontFamily: 'system-ui, sans-serif', wordBreak: 'break-word' }}>
            Index of /{path}
          </h1>
          <p style={{ color: styles.mutedText, fontSize: 12, margin: '4px 0 0 0' }}>
            Directory Index Listing {loading ? '(Loading...)' : `(${files.length} items)`}
            {repoStats && ` • 📊 Storage: ${(repoStats.sizeKB / 1024).toFixed(1)} MB`}
          </p>
        </div>
        <div className="controls-group" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="controls-btn"
            onClick={handleCreateFolder}
            style={{ padding: '6px 12px', background: styles.link, color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            📁 + New Folder
          </button>
          <button
            className="controls-btn"
            onClick={toggleTheme}
            style={{ padding: '6px 12px', background: styles.btnBg, color: styles.btnText, border: `1px solid ${styles.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            {isDark ? '☀️ Light' : '🌙 Dark'}
          </button>
          <button
            className="controls-btn"
            onClick={() => { fetchFiles(); fetchStats(); }}
            style={{ padding: '6px 12px', background: styles.btnBg, color: styles.btnText, border: `1px solid ${styles.border}`, borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
          >
            🔄 Refresh
          </button>
          <button
            className="controls-btn"
            onClick={logout}
            style={{ padding: '6px 12px', background: '#3f3f46', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
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
        className="upload-zone"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          marginTop: 20,
          background: isDragging ? styles.cardBg : (isDark ? '#121215' : '#f8f8f8'),
          border: `2px dashed ${isDragging ? styles.link : styles.border}`,
          borderRadius: 10,
          padding: '18px 20px',
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
            {uploading ? 'Uploading Files...' : `📁 Upload Files to /${path}`}
          </h4>
          <p style={{ margin: '4px 0 0 0', fontSize: 12, color: styles.mutedText }}>
            Files will be uploaded directly into <b>/{path || 'root'}</b> (Max 4MB per file)
          </p>
        </div>
        <button
          className="upload-btn"
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
      <div className="index-table-wrapper" style={{ marginTop: 20, overflowX: 'auto', WebkitOverflowScrolling: 'touch', border: `1px solid ${styles.border}`, borderRadius: 8, scrollbarWidth: 'thin' }}>
        <table className="index-table" style={{ width: '100%', minWidth: 750, borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${styles.border}`, color: styles.mutedText }}>
              <th style={{ padding: '10px 8px', fontWeight: 700 }}>Name</th>
              <th className="hide-mobile" style={{ padding: '10px 8px', fontWeight: 700, width: 100 }}>Type</th>
              <th style={{ padding: '10px 8px', fontWeight: 700, width: 90, textAlign: 'right' }}>Size</th>
              <th style={{ padding: '10px 8px', fontWeight: 700, width: 310, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {/* Parent Directory Link */}
            {path && (
              <tr
                onClick={navigateUp}
                style={{ borderBottom: `1px solid ${styles.subtleBorder}`, cursor: 'pointer', background: styles.cardBg }}
              >
                <td colSpan={4} style={{ padding: '10px 8px', color: styles.link, fontWeight: 600 }}>
                  📁 Parent Directory/
                </td>
              </tr>
            )}

            {files.length === 0 && !loading && (
              <tr>
                <td colSpan={4} style={{ padding: '24px 8px', textAlign: 'center', color: styles.mutedText }}>
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
                <td style={{ padding: '12px 10px', whiteSpace: 'nowrap', maxWidth: 350, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {f.type === 'dir' ? (
                    <span
                      onClick={() => handleFileClick(f)}
                      style={{ cursor: 'pointer', color: styles.link, fontWeight: 600, whiteSpace: 'nowrap' }}
                    >
                      📁 {f.name}/
                    </span>
                  ) : (
                    <span
                      onClick={() => handleFileClick(f)}
                      style={{ cursor: 'pointer', color: styles.text, textDecoration: 'underline', textDecorationColor: styles.border, whiteSpace: 'nowrap' }}
                      title={f.name}
                    >
                      📄 {f.name}
                    </span>
                  )}
                </td>
                <td className="hide-mobile" style={{ padding: '10px 8px', color: styles.mutedText, fontSize: 12 }}>
                  {f.type === 'dir' ? 'Directory' : 'File'}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'right', color: styles.mutedText, whiteSpace: 'nowrap' }}>
                  {formatSize(f.size)}
                </td>
                <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'nowrap' }}>
                    {f.type === 'file' && (
                      <a
                        className="action-btn"
                        href={`/api/file?path=${encodeURIComponent(f.path)}&download=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 8px',
                          background: styles.btnBg,
                          color: styles.btnText,
                          borderRadius: 4,
                          fontSize: 11,
                          textDecoration: 'none',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Download
                      </a>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => handleRename(f)}
                      style={{
                        padding: '4px 8px',
                        background: '#0284c7',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Rename
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => handleCopy(f.path)}
                      style={{
                        padding: '4px 8px',
                        background: '#15803d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Copy
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => handleMove(f.path)}
                      style={{
                        padding: '4px 8px',
                        background: '#b45309',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Move
                    </button>
                    {f.type === 'file' && (
                      <button
                        className="action-btn"
                        onClick={() => handleHistory(f)}
                        style={{
                          padding: '4px 8px',
                          background: '#6d28d9',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 11,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        History
                      </button>
                    )}
                    <button
                      className="action-btn"
                      onClick={() => handleDelete(f.path)}
                      style={{
                        padding: '4px 8px',
                        background: '#7f1d1d',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        fontSize: 11,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
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

      {/* Online File Viewer Modal */}
      {previewFile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: styles.cardBg, color: styles.text, border: `1px solid ${styles.border}`, borderRadius: 12, maxWidth: 950, width: '100%', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${styles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'system-ui, sans-serif', wordBreak: 'break-all' }}>
                📄 {previewFile.file.name}
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {previewFile.file.download_url && (
                  <a href={`/api/file?path=${encodeURIComponent(previewFile.file.path)}&download=1`} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 12px', background: styles.btnBg, color: styles.btnText, borderRadius: 6, fontSize: 12, textDecoration: 'none', fontWeight: 600 }}>
                    ⬇ Download
                  </a>
                )}
                <button onClick={() => setPreviewFile(null)} style={{ background: 'none', border: 'none', color: styles.text, fontSize: 20, cursor: 'pointer', padding: '0 6px' }}>✕</button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 20, overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {previewFile.loading ? (
                <p style={{ opacity: 0.6, margin: 'auto' }}>Loading online preview...</p>
              ) : (
                (() => {
                  const ext = previewFile.file.name.split('.').pop().toLowerCase();
                  const imgExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

                  if (['html', 'htm'].includes(ext) && previewFile.content !== null) {
                    return (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
                          <button
                            onClick={() => setHtmlMode('live')}
                            style={{ padding: '6px 14px', background: htmlMode === 'live' ? styles.link : styles.btnBg, color: htmlMode === 'live' ? 'white' : styles.btnText, border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                          >
                            🌐 Live Rendered Preview
                          </button>
                          <button
                            onClick={() => setHtmlMode('code')}
                            style={{ padding: '6px 14px', background: htmlMode === 'code' ? styles.link : styles.btnBg, color: htmlMode === 'code' ? 'white' : styles.btnText, border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                          >
                            📝 Source Code
                          </button>
                        </div>
                        {htmlMode === 'live' ? (
                          <iframe
                            srcDoc={getHtmlSrcDoc(previewFile.content)}
                            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-forms allow-same-origin"
                            title={previewFile.file.name}
                            style={{ width: '100%', height: '65vh', border: 'none', background: '#ffffff', borderRadius: 8 }}
                          />
                        ) : (
                          <pre style={{ width: '100%', padding: 16, background: isDark ? '#000000' : '#ffffff', border: `1px solid ${styles.border}`, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: '65vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>
                            {previewFile.content}
                          </pre>
                        )}
                      </div>
                    );
                  }

                  if (imgExts.includes(ext) && previewFile.file.download_url) {
                    return <img src={previewFile.file.download_url} alt={previewFile.file.name} style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 8, margin: 'auto' }} />;
                  }
                  if (ext === 'pdf' && previewFile.file.download_url) {
                    return <iframe src={previewFile.file.download_url} title={previewFile.file.name} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: 8 }} />;
                  }
                  if (['mp4', 'webm'].includes(ext) && previewFile.file.download_url) {
                    return <video controls src={previewFile.file.download_url} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, margin: 'auto' }} />;
                  }
                  if (['mp3', 'wav', 'ogg'].includes(ext) && previewFile.file.download_url) {
                    return <audio controls src={previewFile.file.download_url} style={{ width: '100%', margin: 'auto' }} />;
                  }
                  if (previewFile.content !== null) {
                    return <pre style={{ width: '100%', padding: 16, background: isDark ? '#000000' : '#ffffff', border: `1px solid ${styles.border}`, borderRadius: 8, fontSize: 12, overflow: 'auto', maxHeight: '65vh', fontFamily: 'monospace', whiteSpace: 'pre-wrap', margin: 0 }}>{previewFile.content}</pre>;
                  }
                  return (
                    <div style={{ textAlign: 'center', padding: 20, margin: 'auto' }}>
                      <p style={{ opacity: 0.7 }}>No inline viewer for .{ext} files.</p>
                      {previewFile.file.download_url && (
                        <a href={previewFile.file.download_url} target="_blank" rel="noopener noreferrer" style={{ padding: '8px 16px', background: styles.link, color: 'white', borderRadius: 6, textDecoration: 'none', fontSize: 13, fontWeight: 600, display: 'inline-block', marginTop: 10 }}>
                          Open File in Browser
                        </a>
                      )}
                    </div>
                  );
                })()
              )}
            </div>

          </div>
        </div>
      )}

      {/* File History Modal */}
      {historyModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: styles.cardBg, color: styles.text, border: `1px solid ${styles.border}`, borderRadius: 12, maxWidth: 650, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '14px 20px', borderBottom: `1px solid ${styles.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontFamily: 'system-ui, sans-serif' }}>
                📜 Revision History: {historyModal.file.name}
              </h3>
              <button onClick={() => setHistoryModal(null)} style={{ background: 'none', border: 'none', color: styles.text, fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
              {historyModal.loading ? (
                <p style={{ textAlign: 'center', opacity: 0.6 }}>Loading commit history...</p>
              ) : historyModal.error ? (
                <p style={{ color: '#fca5a5' }}>Error: {historyModal.error}</p>
              ) : historyModal.history.length === 0 ? (
                <p style={{ opacity: 0.6 }}>No commit history found.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {historyModal.history.map((c) => (
                    <div key={c.sha} style={{ padding: 12, border: `1px solid ${styles.border}`, borderRadius: 8, background: styles.bg }}>
                      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{c.message}</div>
                      <div style={{ fontSize: 11, color: styles.mutedText, display: 'flex', justifyContent: 'space-between' }}>
                        <span>Author: {c.author} • {new Date(c.date).toLocaleString()}</span>
                        <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: styles.link, textDecoration: 'none' }}>
                          {c.sha.slice(0, 7)} ↗
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 28, paddingTop: 16, borderTop: `1px solid ${styles.subtleBorder}`, color: styles.mutedText, fontSize: 11, textAlign: 'center' }}>
        Directory Listing Index • Secure GitHub Storage Server
      </div>
    </div>
  );
}
