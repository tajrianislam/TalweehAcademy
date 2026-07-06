/* eslint-disable react/prop-types */
// In-place content editing for admins ("Elementor-lite").
//
// - EditModeProvider + useEditMode: app-wide edit-mode flag (admins only).
// - EditModeToggle: floating pencil button, rendered only for admins.
// - Editable: wraps a page section; in edit mode it gets a dashed outline and
//   an "Edit" chip that opens the section's editor. Outside edit mode (and for
//   non-admins) it renders its children untouched.
// - SectionEditorModal: generic form driven by the field schemas declared in
//   src/content/siteContent.js. Handles object sections, lists of objects
//   (add / remove / reorder), and lists of plain strings.
import { createContext, useContext, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useContent } from '../hooks/useContent'
import { CONTENT_REGISTRY } from '../content/siteContent'

const EditModeContext = createContext({ editMode: false, setEditMode: () => {} })

export function EditModeProvider({ children }) {
  const { user } = useAuth()
  const [editMode, setEditMode] = useState(false)
  const isAdmin = user?.role === 'admin'
  return (
    <EditModeContext.Provider value={{ editMode: editMode && isAdmin, setEditMode }}>
      {children}
    </EditModeContext.Provider>
  )
}

export function useEditMode() {
  return useContext(EditModeContext)
}

export function EditModeToggle() {
  const { user } = useAuth()
  const { editMode, setEditMode } = useEditMode()
  const { pathname } = useLocation()
  if (user?.role !== 'admin') return null
  // The FAB edits the public site in place — hide it on admin surfaces.
  if (pathname.startsWith('/admin') || pathname.startsWith('/elementor-dashboard')) return null
  return (
    <button
      type="button"
      className={`edit-fab${editMode ? ' active' : ''}`}
      onClick={() => setEditMode(!editMode)}
      title={editMode ? 'Exit edit mode' : 'Edit page content'}
    >
      {editMode ? '✕ Editing' : '✎ Edit'}
    </button>
  )
}

export function Editable({ page, sectionKey, children }) {
  const { editMode } = useEditMode()
  const [open, setOpen] = useState(false)
  if (!editMode) return children
  const section = CONTENT_REGISTRY[page]?.[sectionKey]
  if (!section) return children
  return (
    <div className="editable-region">
      <button type="button" className="edit-chip" onClick={() => setOpen(true)}>
        ✎ {section.label}
      </button>
      {children}
      {open && (
        <SectionEditorModal page={page} sectionKey={sectionKey} onClose={() => setOpen(false)} />
      )}
    </div>
  )
}

function FieldInput({ field, value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const common = {
    value: value ?? '',
    onChange: (e) => onChange(e.target.value),
  }
  if (field.type === 'textarea') {
    return <textarea rows={4} {...common} />
  }
  if (field.type === 'image') {
    async function handleFile(e) {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file) return
      setUploading(true)
      setUploadError(null)
      try {
        const body = new FormData()
        body.append('file', file)
        const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Upload failed')
        onChange(data.url)
      } catch (err) {
        setUploadError(err.message)
      } finally {
        setUploading(false)
      }
    }
    return (
      <div className="ce-image-field">
        <div className="ce-image-row">
          <input type="text" placeholder="Image URL" {...common} />
          <label className={`ce-upload-btn${uploading ? ' busy' : ''}`}>
            {uploading ? 'Uploading…' : '⬆ Upload'}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} disabled={uploading} hidden />
          </label>
        </div>
        {uploadError && <p className="admin-msg error">{uploadError}</p>}
        {value && <img src={value} alt="" className="ce-image-preview" />}
      </div>
    )
  }
  return <input type="text" {...common} />
}

function ListEditor({ itemSchema, items, onChange }) {
  const isStringList = !Array.isArray(itemSchema)

  function update(index, next) {
    const copy = items.slice()
    copy[index] = next
    onChange(copy)
  }
  function move(index, dir) {
    const target = index + dir
    if (target < 0 || target >= items.length) return
    const copy = items.slice()
    ;[copy[index], copy[target]] = [copy[target], copy[index]]
    onChange(copy)
  }
  function remove(index) {
    onChange(items.filter((_, i) => i !== index))
  }
  function add() {
    if (isStringList) {
      onChange([...items, ''])
    } else {
      onChange([...items, Object.fromEntries(itemSchema.map((f) => [f.name, '']))])
    }
  }

  return (
    <div className="ce-list">
      {items.map((item, i) => (
        <div className="ce-list-item" key={i}>
          <div className="ce-list-item-head">
            <span>#{i + 1}</span>
            <div className="ce-item-actions">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="ce-remove" onClick={() => remove(i)} aria-label="Remove">Remove</button>
            </div>
          </div>
          {isStringList ? (
            <FieldInput field={itemSchema} value={item} onChange={(v) => update(i, v)} />
          ) : (
            itemSchema.map((f) => (
              <label className="ce-field" key={f.name}>
                <span>{f.label}</span>
                <FieldInput field={f} value={item[f.name]} onChange={(v) => update(i, { ...item, [f.name]: v })} />
              </label>
            ))
          )}
        </div>
      ))}
      <button type="button" className="ce-add" onClick={add}>+ Add item</button>
    </div>
  )
}

export function SectionEditorModal({ page, sectionKey, onClose }) {
  const { content, save, reset } = useContent(page)
  const section = CONTENT_REGISTRY[page]?.[sectionKey]
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(content[sectionKey] ?? section?.default)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!section) return null
  const isList = !Array.isArray(section.fields) && section.fields.type === 'list'

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      await save(sectionKey, draft)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!window.confirm('Reset this section to its original content?')) return
    setSaving(true)
    setError(null)
    try {
      await reset(sectionKey)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="ce-overlay" onClick={onClose} role="presentation">
      <div className="ce-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Edit ${section.label}`}>
        <div className="ce-modal-head">
          <h3>{section.label}</h3>
          <button type="button" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="ce-modal-body">
          {isList ? (
            <ListEditor itemSchema={section.fields.item} items={draft} onChange={setDraft} />
          ) : (
            section.fields.map((f) => (
              <label className="ce-field" key={f.name}>
                <span>{f.label}</span>
                {f.type === 'list' ? (
                  <ListEditor
                    itemSchema={f.item}
                    items={draft[f.name] || []}
                    onChange={(v) => setDraft({ ...draft, [f.name]: v })}
                  />
                ) : (
                  <FieldInput field={f} value={draft[f.name]} onChange={(v) => setDraft({ ...draft, [f.name]: v })} />
                )}
              </label>
            ))
          )}
          {error && <p className="admin-msg error">{error}</p>}
        </div>
        <div className="ce-modal-foot">
          <button type="button" className="ce-reset" onClick={handleReset} disabled={saving}>
            Reset to default
          </button>
          <div>
            <button type="button" className="ce-cancel" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="button" className="ce-save" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
