/* eslint-disable react/prop-types */
import { useState, useEffect } from 'react'
import { CONTENT_REGISTRY } from '../content/siteContent'
import { SectionEditorModal } from './ContentEditor'

// Small helper for authenticated JSON requests.
async function api(url, options = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="admin-section-header">
      <div className="admin-section-icon">{icon}</div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )
}

// ── Instructors ─────────────────────────────────────────────
const BLANK_INSTRUCTOR = { name: '', designation: '', photo_url: '', bio: '', order_index: 0 }

export function InstructorsAdmin() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(BLANK_INSTRUCTOR)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    try { setList(await api('/api/instructors')) } catch { /* noop */ }
  }
  useEffect(() => { refresh() }, [])

  function edit(item) {
    setEditId(item.id)
    setForm({
      name: item.name || '', designation: item.designation || '',
      photo_url: item.photoUrl || '', bio: item.bio || '', order_index: item.orderIndex || 0,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function reset() { setEditId(null); setForm(BLANK_INSTRUCTOR) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      if (editId) await api(`/api/instructors/${editId}`, { method: 'PUT', body: JSON.stringify(form) })
      else await api('/api/instructors', { method: 'POST', body: JSON.stringify(form) })
      setMsg({ type: 'success', text: editId ? 'Instructor updated.' : 'Instructor created.' })
      reset(); refresh()
    } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setSaving(false) }
  }

  async function remove(id, name) {
    if (!window.confirm(`Delete instructor "${name}"?`)) return
    try { await api(`/api/instructors/${id}`, { method: 'DELETE' }); refresh() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  return (
    <div className="admin-section">
      <SectionHeader icon="👤" title="Instructors" subtitle="Add, edit, and remove instructor profiles" />
      <form className="admin-form" onSubmit={submit}>
        <p className="add-lesson-form-title">{editId ? 'Edit Instructor' : 'New Instructor'}</p>
        <div className="admin-form-grid">
          <div className="form-row"><label>Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
          <div className="form-row"><label>Designation</label>
            <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></div>
          <div className="form-row"><label>Photo URL</label>
            <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="/wp-content/uploads/…" /></div>
          <div className="form-row"><label>Order</label>
            <input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
        </div>
        <div className="form-row"><label>Bio</label>
          <textarea rows={5} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Separate paragraphs with a blank line" /></div>
        {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}
        <div className="admin-form-actions">
          <button type="submit" className="journey-button" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Update' : 'Create')}</button>
          {editId && <button type="button" className="outline-btn-green" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="admin-course-list">
        {list.map((i) => (
          <div key={i.id} className="admin-course-card">
            <div className="admin-course-card-header">
              <div className="admin-course-card-info">
                {i.photoUrl ? <img className="admin-course-thumb" src={i.photoUrl} alt="" /> : <div className="admin-course-thumb-placeholder" />}
                <div className="admin-course-card-text">
                  <strong>{i.name}</strong>
                  <div className="admin-course-meta"><span className="admin-course-lessons-count">{i.designation || '—'}</span></div>
                </div>
              </div>
              <div>
                <button type="button" className="outline-btn-green" onClick={() => edit(i)}>Edit</button>
                <button type="button" className="qb-remove-btn" onClick={() => remove(i.id, i.name)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Services ────────────────────────────────────────────────
const BLANK_SERVICE = { title: '', excerpt: '', body: '', thumbnail_url: '', order_index: 0, published_at: '' }

export function ServicesAdmin() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(BLANK_SERVICE)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh() { try { setList(await api('/api/services')) } catch { /* noop */ } }
  useEffect(() => { refresh() }, [])

  function edit(item) {
    setEditId(item.id)
    setForm({
      title: item.title || '', excerpt: item.excerpt || '', body: item.body || '',
      thumbnail_url: item.thumbnailUrl || '', order_index: item.orderIndex || 0,
      published_at: item.publishedAt ? String(item.publishedAt).slice(0, 10) : '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() { setEditId(null); setForm(BLANK_SERVICE) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    try {
      const payload = { ...form, published_at: form.published_at || null }
      if (editId) await api(`/api/services/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/services', { method: 'POST', body: JSON.stringify(payload) })
      setMsg({ type: 'success', text: editId ? 'Service updated.' : 'Service created.' })
      reset(); refresh()
    } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setSaving(false) }
  }
  async function remove(id, title) {
    if (!window.confirm(`Delete service "${title}"?`)) return
    try { await api(`/api/services/${id}`, { method: 'DELETE' }); refresh() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  return (
    <div className="admin-section">
      <SectionHeader icon="🧩" title="Services" subtitle="Manage service offerings" />
      <form className="admin-form" onSubmit={submit}>
        <p className="add-lesson-form-title">{editId ? 'Edit Service' : 'New Service'}</p>
        <div className="admin-form-grid">
          <div className="form-row"><label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="form-row"><label>Thumbnail URL</label>
            <input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
          <div className="form-row"><label>Published Date</label>
            <input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} /></div>
          <div className="form-row"><label>Order</label>
            <input type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: Number(e.target.value) })} /></div>
        </div>
        <div className="form-row"><label>Excerpt</label>
          <textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
        <div className="form-row"><label>Body</label>
          <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
        {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}
        <div className="admin-form-actions">
          <button type="submit" className="journey-button" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Update' : 'Create')}</button>
          {editId && <button type="button" className="outline-btn-green" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="admin-course-list">
        {list.map((s) => (
          <div key={s.id} className="admin-course-card">
            <div className="admin-course-card-header">
              <div className="admin-course-card-info">
                {s.thumbnailUrl ? <img className="admin-course-thumb" src={s.thumbnailUrl} alt="" /> : <div className="admin-course-thumb-placeholder" />}
                <div className="admin-course-card-text"><strong>{s.title}</strong></div>
              </div>
              <div>
                <button type="button" className="outline-btn-green" onClick={() => edit(s)}>Edit</button>
                <button type="button" className="qb-remove-btn" onClick={() => remove(s.id, s.title)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Articles ────────────────────────────────────────────────
const BLANK_ARTICLE = { title: '', category: '', excerpt: '', image_url: '', youtube_url: '', read_time: '', published_at: '', contentText: '[]' }

export function ArticlesAdmin() {
  const [list, setList] = useState([])
  const [form, setForm] = useState(BLANK_ARTICLE)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh() { try { setList(await api('/api/articles')) } catch { /* noop */ } }
  useEffect(() => { refresh() }, [])

  async function edit(item) {
    // fetch full article (with content) by slug
    const full = await api(`/api/articles/${item.slug}`)
    setEditId(item.id)
    setForm({
      title: full.title || '', category: full.category || '', excerpt: full.excerpt || '',
      image_url: full.imageUrl || '', youtube_url: full.youtubeUrl || '', read_time: full.readTime || '',
      published_at: full.publishedAt ? String(full.publishedAt).slice(0, 10) : '',
      contentText: JSON.stringify(full.content || [], null, 2),
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function reset() { setEditId(null); setForm(BLANK_ARTICLE) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    let content
    try { content = JSON.parse(form.contentText || '[]') }
    catch { setSaving(false); return setMsg({ type: 'error', text: 'Content must be valid JSON (array of blocks).' }) }
    try {
      const payload = {
        title: form.title, category: form.category, excerpt: form.excerpt, image_url: form.image_url,
        youtube_url: form.youtube_url, read_time: form.read_time, published_at: form.published_at || null, content,
      }
      if (editId) await api(`/api/articles/${editId}`, { method: 'PUT', body: JSON.stringify(payload) })
      else await api('/api/articles', { method: 'POST', body: JSON.stringify(payload) })
      setMsg({ type: 'success', text: editId ? 'Article updated.' : 'Article created.' })
      reset(); refresh()
    } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setSaving(false) }
  }
  async function remove(id, title) {
    if (!window.confirm(`Delete article "${title}"?`)) return
    try { await api(`/api/articles/${id}`, { method: 'DELETE' }); refresh() }
    catch (err) { setMsg({ type: 'error', text: err.message }) }
  }

  return (
    <div className="admin-section">
      <SectionHeader icon="📝" title="Articles" subtitle="Write and edit articles" />
      <form className="admin-form" onSubmit={submit}>
        <p className="add-lesson-form-title">{editId ? 'Edit Article' : 'New Article'}</p>
        <div className="admin-form-grid">
          <div className="form-row"><label>Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
          <div className="form-row"><label>Category</label>
            <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
          <div className="form-row"><label>Image URL</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
          <div className="form-row"><label>YouTube URL</label>
            <input value={form.youtube_url} onChange={(e) => setForm({ ...form, youtube_url: e.target.value })} /></div>
          <div className="form-row"><label>Read Time</label>
            <input value={form.read_time} onChange={(e) => setForm({ ...form, read_time: e.target.value })} placeholder="6 Minutes" /></div>
          <div className="form-row"><label>Published Date</label>
            <input type="date" value={form.published_at} onChange={(e) => setForm({ ...form, published_at: e.target.value })} /></div>
        </div>
        <div className="form-row"><label>Excerpt</label>
          <textarea rows={2} value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></div>
        <div className="form-row"><label>Content (JSON blocks: heading / subheading / paragraph / video)</label>
          <textarea rows={10} value={form.contentText} onChange={(e) => setForm({ ...form, contentText: e.target.value })} className="admin-textarea-code" /></div>
        {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}
        <div className="admin-form-actions">
          <button type="submit" className="journey-button" disabled={saving}>{saving ? 'Saving…' : (editId ? 'Update' : 'Create')}</button>
          {editId && <button type="button" className="outline-btn-green" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="admin-course-list">
        {list.map((a) => (
          <div key={a.id} className="admin-course-card">
            <div className="admin-course-card-header">
              <div className="admin-course-card-info">
                {a.imageUrl ? <img className="admin-course-thumb" src={a.imageUrl} alt="" /> : <div className="admin-course-thumb-placeholder" />}
                <div className="admin-course-card-text">
                  <strong>{a.title}</strong>
                  <div className="admin-course-meta"><span className="admin-course-lessons-count">{a.category || '—'}</span></div>
                </div>
              </div>
              <div>
                <button type="button" className="outline-btn-green" onClick={() => edit(a)}>Edit</button>
                <button type="button" className="qb-remove-btn" onClick={() => remove(a.id, a.title)}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Pages ───────────────────────────────────────────────────
export function PagesAdmin() {
  const [list, setList] = useState([])
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [contentHtml, setContentHtml] = useState('')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh() { try { setList(await api('/api/pages')) } catch { /* noop */ } }
  useEffect(() => { refresh() }, [])

  async function load(s) {
    try {
      const p = await api(`/api/pages/${s}`)
      setSlug(p.slug); setTitle(p.title); setContentHtml(p.contentHtml || '')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) { setMsg({ type: 'error', text: err.message }) }
  }
  function reset() { setSlug(''); setTitle(''); setContentHtml('') }

  async function submit(e) {
    e.preventDefault()
    if (!slug.trim()) return setMsg({ type: 'error', text: 'Slug is required.' })
    setSaving(true); setMsg(null)
    try {
      await api(`/api/pages/${slug.trim()}`, { method: 'PUT', body: JSON.stringify({ title, content_html: contentHtml }) })
      setMsg({ type: 'success', text: 'Page saved.' })
      refresh()
    } catch (err) { setMsg({ type: 'error', text: err.message }) } finally { setSaving(false) }
  }

  return (
    <div className="admin-section">
      <SectionHeader icon="📄" title="Pages" subtitle="Edit legal & marketing pages (served at /p/:slug)" />
      <form className="admin-form" onSubmit={submit}>
        <div className="admin-form-grid">
          <div className="form-row"><label>Slug *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="privacy-policy" required /></div>
          <div className="form-row"><label>Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
        </div>
        <div className="form-row"><label>Content (HTML)</label>
          <textarea rows={12} value={contentHtml} onChange={(e) => setContentHtml(e.target.value)} className="admin-textarea-code" /></div>
        {msg && <p className={`admin-msg ${msg.type}`}>{msg.text}</p>}
        <div className="admin-form-actions">
          <button type="submit" className="journey-button" disabled={saving}>{saving ? 'Saving…' : 'Save Page'}</button>
          <button type="button" className="outline-btn-green" onClick={reset}>New page</button>
        </div>
      </form>
      <div className="admin-course-list">
        {list.map((p) => (
          <div key={p.id} className="admin-course-card">
            <div className="admin-course-card-header">
              <div className="admin-course-card-info">
                <div className="admin-course-card-text">
                  <strong>{p.title}</strong>
                  <div className="admin-course-meta"><span className="admin-course-lessons-count">/p/{p.slug}</span></div>
                </div>
              </div>
              <button type="button" className="outline-btn-green" onClick={() => load(p.slug)}>Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Contact inbox ───────────────────────────────────────────
export function ContactInbox() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    api('/api/contact').then(setList).catch(() => setList([])).finally(() => setLoading(false))
  }, [])
  return (
    <div className="admin-section">
      <SectionHeader icon="✉️" title="Contact Messages" subtitle="Messages submitted via the contact form" />
      {loading ? <p className="courses-status">Loading…</p> : list.length === 0 ? (
        <p className="courses-status">No messages yet.</p>
      ) : (
        <div className="admin-enrollment-table-wrap">
          <table className="admin-enrollment-table">
            <thead><tr><th>Name</th><th>Email</th><th>Message</th><th>Received</th></tr></thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.email}</td>
                  <td style={{ maxWidth: 420, whiteSpace: 'pre-wrap' }}>{m.message}</td>
                  <td>{new Date(m.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Commerce (read-only) ────────────────────────────────────
export function CommerceAdmin() {
  const [orders, setOrders] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    Promise.all([
      api('/api/orders').catch(() => []),
      api('/api/subscriptions').catch(() => []),
    ]).then(([o, s]) => { setOrders(o); setSubs(s) }).finally(() => setLoading(false))
  }, [])

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—')

  return (
    <div className="admin-section">
      <SectionHeader icon="🧾" title="Commerce" subtitle="Live Stripe payments & imported WordPress history" />
      {loading ? <p className="courses-status">Loading…</p> : (
        <>
          <p className="add-lesson-form-title">Subscriptions ({subs.length})</p>
          <div className="admin-enrollment-table-wrap">
            <table className="admin-enrollment-table">
              <thead><tr><th>Customer</th><th>Course</th><th>Source</th><th>Status</th><th>Amount</th><th>Next Payment</th></tr></thead>
              <tbody>
                {subs.slice(0, 200).map((s) => (
                  <tr key={s.id}>
                    <td>{s.user_name || s.billing_email || '—'}</td>
                    <td>{s.course_title || '—'}</td>
                    <td>{s.stripe_subscription_id ? 'Stripe' : 'WordPress'}</td>
                    <td><span className={`sub-status sub-${s.status}`}>{s.status}</span></td>
                    <td>{s.total != null ? Number(s.total).toFixed(2) : '—'}</td>
                    <td>{fmt(s.next_payment_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="add-lesson-form-title admin-section-spaced">Orders ({orders.length})</p>
          <div className="admin-enrollment-table-wrap">
            <table className="admin-enrollment-table">
              <thead><tr><th>Order</th><th>Customer</th><th>Source</th><th>Status</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {orders.slice(0, 200).map((o) => (
                  <tr key={o.id}>
                    <td>#{o.wp_order_id || o.id}</td>
                    <td>{o.user_name || o.billing_email || '—'}</td>
                    <td>{o.stripe_checkout_session_id || o.stripe_payment_intent_id ? 'Stripe' : 'WordPress'}</td>
                    <td><span className={`sub-status sub-${o.status}`}>{o.status}</span></td>
                    <td>{Number(o.total).toFixed(2)} {o.currency}</td>
                    <td>{fmt(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ── Site Content (in-place editable sections, dashboard fallback) ──
const PAGE_LABELS = {
  global: 'Header & Footer (all pages)',
  landing: 'Home Page',
  about: 'About Us',
  contact: 'Contact Us',
}

export function SiteContentAdmin() {
  const [editing, setEditing] = useState(null) // { page, sectionKey }

  return (
    <section>
      <SectionHeader
        icon="🖋"
        title="Site Content"
        subtitle="Edit the text and images shown on the main pages. Tip: you can also edit in place — browse the site and press the ✎ Edit button in the corner."
      />
      {Object.entries(CONTENT_REGISTRY).map(([page, sections]) => (
        <div key={page} className="admin-section-spaced">
          <h3 className="admin-subheading">{PAGE_LABELS[page] || page}</h3>
          <div className="site-content-grid">
            {Object.entries(sections).map(([key, section]) => (
              <button
                key={key}
                type="button"
                className="site-content-card"
                onClick={() => setEditing({ page, sectionKey: key })}
              >
                <strong>{section.label}</strong>
                <span>✎ Edit</span>
              </button>
            ))}
          </div>
        </div>
      ))}
      {editing && (
        <SectionEditorModal
          page={editing.page}
          sectionKey={editing.sectionKey}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}
