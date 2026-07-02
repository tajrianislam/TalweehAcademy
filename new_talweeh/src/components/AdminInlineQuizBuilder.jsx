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

export default function AdminInlineQuizBuilder({ lessonId, existingQuiz, onSaved, onCancel }) {
  const [questions, setQuestions] = useState(() =>
    existingQuiz?.questions?.length
      ? normalizeExistingQuestions(existingQuiz.questions)
      : [blankMcQuestion()]
  )
  const [passPercent, setPassPercent] = useState(existingQuiz?.pass_percent ?? 80)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

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
                  onClick={() => setCorrect(q._id, opt._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setCorrect(q._id, opt._id)}
                >
                  <div className="aqb-opt-left">
                    <span className={`aqb-opt-label${opt.is_correct ? ' correct' : ''}`}>
                      {q.type === 'tf' ? opt.option_text.charAt(0) : OPTION_LABELS[oi] || oi + 1}
                    </span>
                    {q.type === 'mc' ? (
                      <input
                        className="aqb-opt-text-input"
                        placeholder={`Answer option ${OPTION_LABELS[oi] || oi + 1}`}
                        value={opt.option_text}
                        onChange={(e) => {
                          e.stopPropagation()
                          updateOptionText(q._id, opt._id, e.target.value)
                        }}
                        onClick={(e) => e.stopPropagation()}
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
                      <span className="aqb-mark-hint">Set correct</span>
                    )}
                    {q.type === 'mc' && q.options.length > 2 && (
                      <button
                        type="button"
                        className="aqb-remove-opt-btn"
                        onClick={(e) => { e.stopPropagation(); removeOption(q._id, opt._id) }}
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
