/* eslint-disable react/prop-types */
import { useState } from 'react'

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

function makeId() {
  return Math.random().toString(36).slice(2)
}

function blankMcQuestion() {
  return {
    _id: makeId(),
    question_text: '',
    type: 'mc',
    options: [
      { _id: makeId(), option_text: '', is_correct: false },
      { _id: makeId(), option_text: '', is_correct: false },
      { _id: makeId(), option_text: '', is_correct: false },
      { _id: makeId(), option_text: '', is_correct: false },
    ],
  }
}

function blankTfQuestion() {
  return {
    _id: makeId(),
    question_text: '',
    type: 'tf',
    options: [
      { _id: makeId(), option_text: 'True', is_correct: false },
      { _id: makeId(), option_text: 'False', is_correct: false },
    ],
  }
}

function normalizeExistingQuestions(questions) {
  return questions.map((q) => {
    const isTf =
      q.options.length === 2 &&
      q.options[0].option_text === 'True' &&
      q.options[1].option_text === 'False'
    return {
      _id: String(q.id),
      question_text: q.question_text,
      type: isTf ? 'tf' : 'mc',
      options: q.options.map((o) => ({
        _id: String(o.id),
        option_text: o.option_text,
        is_correct: Boolean(o.is_correct),
      })),
    }
  })
}

// Parses pasted quiz text into questions. Format: questions separated by
// blank lines; first line is the question, following lines are the options.
// Mark the correct option with a * (or add an "Answer: B" / "Answer: True"
// line). Options may be prefixed "A)", "B.", "-", or nothing. Two options
// reading True / False become a True/False question.
function parseBulkText(text) {
  const blocks = text.replace(/\r/g, '').split(/\n\s*\n+/).map((b) => b.trim()).filter(Boolean)
  const questions = []
  const errors = []
  blocks.forEach((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length < 2) {
      errors.push(`Block ${bi + 1}: needs a question line plus its options.`)
      return
    }
    const question = lines[0].replace(/^(?:q(?:uestion)?\s*)?\d+\s*[).:-]\s*/i, '').trim()
    let answerRef = null
    const opts = []
    for (const raw of lines.slice(1)) {
      const ans = raw.match(/^(?:answer|correct(?:\s+answer)?)\s*[:=-]\s*(.+)$/i)
      if (ans) { answerRef = ans[1].trim(); continue }
      let line = raw
      let correct = false
      if (/^\*/.test(line)) { correct = true; line = line.replace(/^\*+\s*/, '') }
      if (/\*+$/.test(line)) { correct = true; line = line.replace(/\s*\*+$/, '') }
      if (/\((?:correct|right)\)$/i.test(line)) { correct = true; line = line.replace(/\s*\((?:correct|right)\)$/i, '') }
      const letter = line.match(/^([A-Fa-f])[).:]\s*(.+)$/)
      let label = null
      if (letter) { label = letter[1].toUpperCase(); line = letter[2].trim() }
      else line = line.replace(/^[-•▪]\s*/, '')
      if (line) opts.push({ label, text: line, correct })
    }
    if (answerRef) {
      const ref = answerRef.replace(/[*.]+$/, '').trim()
      const byLabel = ref.length <= 2 ? opts.find((o) => o.label === ref.toUpperCase()[0]) : null
      const byText = opts.find((o) => o.text.toLowerCase() === ref.toLowerCase())
      const target = byLabel || byText
      if (target) target.correct = true
    }
    const label = question.slice(0, 40)
    if (opts.length < 2) {
      errors.push(`"${label}…": needs at least 2 options.`)
      return
    }
    if (!opts.some((o) => o.correct)) {
      errors.push(`"${label}…": mark the correct answer with * or an "Answer:" line.`)
      return
    }
    const isTf = opts.length === 2 && opts.every((o) => /^(true|false)$/i.test(o.text))
    questions.push({
      _id: makeId(),
      question_text: question,
      type: isTf ? 'tf' : 'mc',
      options: opts.map((o) => ({
        _id: makeId(),
        option_text: isTf ? o.text[0].toUpperCase() + o.text.slice(1).toLowerCase() : o.text,
        is_correct: o.correct,
      })),
    })
  })
  return { questions, errors }
}

const BULK_PLACEHOLDER = `What is the plural of kitāb?
A) Kutub *
B) Kitābāt
C) Kātib

The word qalam means pen.
True *
False`

export default function AdminInlineQuizBuilder({ lessonId, existingQuiz, onSaved, onCancel }) {
  const [questions, setQuestions] = useState(() =>
    existingQuiz?.questions?.length
      ? normalizeExistingQuestions(existingQuiz.questions)
      : [blankMcQuestion()]
  )
  const [passPercent, setPassPercent] = useState(existingQuiz?.pass_percent ?? 80)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')
  const [bulkErrors, setBulkErrors] = useState([])

  function importBulk() {
    const { questions: parsed, errors } = parseBulkText(bulkText)
    setBulkErrors(errors)
    if (parsed.length === 0) {
      if (errors.length === 0) setBulkErrors(['Nothing to import — paste questions separated by blank lines.'])
      return
    }
    setQuestions((prev) => {
      // Drop the initial empty placeholder question if it was never touched.
      const kept = prev.filter((q) => q.question_text.trim() || q.options.some((o) => o.is_correct))
      return [...kept, ...parsed]
    })
    setBulkText('')
    if (errors.length === 0) setBulkOpen(false)
    setMsg({ type: 'success', text: `Imported ${parsed.length} question${parsed.length === 1 ? '' : 's'}.` })
  }

  // ── question mutations ─────────────────────────────────

  function addQuestion(type) {
    setQuestions((prev) => [...prev, type === 'tf' ? blankTfQuestion() : blankMcQuestion()])
  }

  function removeQuestion(qid) {
    setQuestions((prev) => prev.filter((q) => q._id !== qid))
  }

  function updateQuestionText(qid, text) {
    setQuestions((prev) => prev.map((q) => q._id === qid ? { ...q, question_text: text } : q))
  }

  function changeType(qid, type) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q._id !== qid) return q
        return {
          ...q,
          type,
          options:
            type === 'tf'
              ? [
                  { _id: makeId(), option_text: 'True', is_correct: false },
                  { _id: makeId(), option_text: 'False', is_correct: false },
                ]
              : [
                  { _id: makeId(), option_text: '', is_correct: false },
                  { _id: makeId(), option_text: '', is_correct: false },
                  { _id: makeId(), option_text: '', is_correct: false },
                  { _id: makeId(), option_text: '', is_correct: false },
                ],
        }
      })
    )
  }

  // ── option mutations ───────────────────────────────────

  function setCorrect(qid, oid) {
    setQuestions((prev) =>
      prev.map((q) =>
        q._id === qid
          ? { ...q, options: q.options.map((o) => ({ ...o, is_correct: o._id === oid })) }
          : q
      )
    )
  }

  function updateOptionText(qid, oid, text) {
    setQuestions((prev) =>
      prev.map((q) =>
        q._id === qid
          ? { ...q, options: q.options.map((o) => o._id === oid ? { ...o, option_text: text } : o) }
          : q
      )
    )
  }

  function addOption(qid) {
    setQuestions((prev) =>
      prev.map((q) =>
        q._id === qid
          ? { ...q, options: [...q.options, { _id: makeId(), option_text: '', is_correct: false }] }
          : q
      )
    )
  }

  function removeOption(qid, oid) {
    setQuestions((prev) =>
      prev.map((q) =>
        q._id === qid ? { ...q, options: q.options.filter((o) => o._id !== oid) } : q
      )
    )
  }

  // ── save ───────────────────────────────────────────────

  async function handleSave() {
    setMsg(null)
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      if (!q.question_text.trim())
        return setMsg({ type: 'error', text: `Question ${i + 1} needs text.` })
      if (q.type === 'mc' && q.options.some((o) => !o.option_text.trim()))
        return setMsg({ type: 'error', text: `Question ${i + 1} has an empty answer option.` })
      if (!q.options.some((o) => o.is_correct))
        return setMsg({ type: 'error', text: `Question ${i + 1} needs a correct answer selected.` })
    }

    setSaving(true)
    try {
      const method = existingQuiz ? 'PUT' : 'POST'
      const res = await fetch(`/api/lessons/${lessonId}/quiz`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pass_percent: passPercent, questions }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMsg({ type: 'success', text: '✓ Quiz saved successfully!' })
      setTimeout(() => onSaved?.(), 900)
    } catch (err) {
      setMsg({ type: 'error', text: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ── render ─────────────────────────────────────────────

  return (
    <div className="aqb-wrap">
      {/* Header */}
      <div className="aqb-header">
        <div className="aqb-header-left">
          <div className="aqb-header-icon-wrap">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </div>
          <div>
            <h3 className="aqb-title">{existingQuiz ? 'Edit Quiz' : 'Add Quiz'}</h3>
            <span className="aqb-subtitle">{questions.length} question{questions.length !== 1 ? 's' : ''} · Lesson Quiz</span>
          </div>
        </div>
        <div className="aqb-header-right">
          <button
            type="button"
            className={`aqb-add-q-btn${bulkOpen ? ' active' : ''}`}
            onClick={() => setBulkOpen((v) => !v)}
          >
            📋 Bulk import
          </button>
          <label className="aqb-pass-label">
            Pass mark
            <div className="aqb-pass-input-wrap">
              <input
                type="number"
                min="1"
                max="100"
                value={passPercent}
                onChange={(e) => setPassPercent(Number(e.target.value))}
                className="aqb-pass-input"
              />
              <span className="aqb-pass-pct">%</span>
            </div>
          </label>
        </div>
      </div>

      {/* Bulk import */}
      {bulkOpen && (
        <div className="aqb-bulk">
          <p className="aqb-bulk-help">
            Paste all your questions at once — one blank line between questions. The first line is the
            question; the lines after it are the options. Mark the correct one with a <strong>*</strong>{' '}
            (or add an <code>Answer: B</code> line). Options that read True / False become True&nbsp;/&nbsp;False questions.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={BULK_PLACEHOLDER}
            rows={10}
          />
          {bulkErrors.length > 0 && (
            <ul className="aqb-bulk-errors">
              {bulkErrors.map((err) => <li key={err}>{err}</li>)}
            </ul>
          )}
          <div className="aqb-bulk-actions">
            <button type="button" className="journey-button" onClick={importBulk} disabled={!bulkText.trim()}>
              Import Questions
            </button>
            <button type="button" className="outline-btn-green" onClick={() => { setBulkOpen(false); setBulkErrors([]) }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Questions */}
      <div className="aqb-questions">
        {questions.map((q, qi) => (
          <div key={q._id} className="aqb-qcard">
            {/* Question header bar */}
            <div className="aqb-qcard-top">
              <div className="aqb-qcard-top-left">
                <span className="aqb-qnum-badge">{qi + 1}</span>
                <div className="aqb-type-pills">
                  <button
                    type="button"
                    className={`aqb-type-pill${q.type === 'mc' ? ' active' : ''}`}
                    onClick={() => changeType(q._id, 'mc')}
                  >
                    Multiple Choice
                  </button>
                  <button
                    type="button"
                    className={`aqb-type-pill${q.type === 'tf' ? ' active' : ''}`}
                    onClick={() => changeType(q._id, 'tf')}
                  >
                    True / False
                  </button>
                </div>
              </div>
              {questions.length > 1 && (
                <button
                  type="button"
                  className="aqb-remove-q-btn"
                  onClick={() => removeQuestion(q._id)}
                  title="Remove this question"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>

            {/* Question text */}
            <textarea
              className="aqb-q-textarea"
              placeholder={`Type question ${qi + 1} here…`}
              value={q.question_text}
              onChange={(e) => updateQuestionText(q._id, e.target.value)}
              rows={2}
            />

            {/* Options */}
            <div className={`aqb-options${q.type === 'tf' ? ' aqb-options-tf' : ''}`}>
              {q.options.map((opt, oi) => (
                <div
                  key={opt._id}
                  className={`aqb-opt-row${opt.is_correct ? ' correct' : ''}`}
                >
                  <div className="aqb-opt-left">
                    <button
                      type="button"
                      className={`aqb-opt-label${opt.is_correct ? ' correct' : ''}`}
                      onClick={() => setCorrect(q._id, opt._id)}
                      title="Mark as the correct answer"
                    >
                      {q.type === 'tf' ? opt.option_text.charAt(0) : OPTION_LABELS[oi] || oi + 1}
                    </button>
                    {q.type === 'mc' ? (
                      <input
                        className="aqb-opt-text-input"
                        placeholder={`Answer option ${OPTION_LABELS[oi] || oi + 1}`}
                        value={opt.option_text}
                        onChange={(e) => updateOptionText(q._id, opt._id, e.target.value)}
                      />
                    ) : (
                      <span className="aqb-opt-text-static">{opt.option_text}</span>
                    )}
                  </div>
                  <div className="aqb-opt-right">
                    {opt.is_correct ? (
                      <span className="aqb-correct-chip">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        Correct
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="aqb-mark-hint"
                        onClick={() => setCorrect(q._id, opt._id)}
                      >
                        Set correct
                      </button>
                    )}
                    {q.type === 'mc' && q.options.length > 2 && (
                      <button
                        type="button"
                        className="aqb-remove-opt-btn"
                        onClick={() => removeOption(q._id, opt._id)}
                        title="Remove option"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {q.type === 'mc' && q.options.length < 6 && (
                <button type="button" className="aqb-add-opt-btn" onClick={() => addOption(q._id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Add Option
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add question row */}
      <div className="aqb-add-q-row">
        <span className="aqb-add-q-label">Add question:</span>
        <button type="button" className="aqb-add-q-btn" onClick={() => addQuestion('mc')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Multiple Choice
        </button>
        <button type="button" className="aqb-add-q-btn" onClick={() => addQuestion('tf')}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          True / False
        </button>
      </div>

      {/* Message */}
      {msg && (
        <div className={`aqb-msg aqb-msg-${msg.type}`}>{msg.text}</div>
      )}

      {/* Footer actions */}
      <div className="aqb-footer">
        <div className="aqb-footer-summary">
          {questions.length} question{questions.length !== 1 ? 's' : ''} · Pass mark {passPercent}%
        </div>
        <div className="aqb-footer-actions">
          {onCancel && (
            <button type="button" className="outline-btn-green" onClick={onCancel} disabled={saving}>
              Discard
            </button>
          )}
          <button type="button" className="journey-button" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : existingQuiz ? 'Update Quiz' : 'Save Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}
