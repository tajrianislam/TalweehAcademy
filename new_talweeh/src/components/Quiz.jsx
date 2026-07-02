/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'

function formatDate(isoString) {
  const d = new Date(isoString)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function Quiz({ quiz, lessonId }) {
  const { user } = useAuth()

  // ── answering state ───────────────────────────────────
  const [answers, setAnswers]       = useState({})
  const [submitted, setSubmitted]   = useState(false)
  const [result, setResult]         = useState(null)
  // questionId -> correct optionId, revealed by the server after grading
  const [correctOptions, setCorrectOptions] = useState({})
  const [savingAttempt, setSavingAttempt] = useState(false)

  // ── attempt history ───────────────────────────────────
  const [attempts, setAttempts]     = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const fetchAttempts = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz/attempts`, { credentials: 'include' })
      if (res.ok) setAttempts(await res.json())
    } catch { /* non-critical */ }
    finally { setHistoryLoading(false) }
  }, [user, lessonId])

  useEffect(() => { fetchAttempts() }, [fetchAttempts])

  // ── answer selection ──────────────────────────────────
  function handleSelect(questionId, optionId) {
    if (submitted) return
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }))
  }

  // ── submit ────────────────────────────────────────────
  // Grading happens server-side: the API returns the score and the correct
  // option per question (answers are never exposed before submission).
  async function handleSubmit() {
    setSavingAttempt(true)
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz/attempt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error('Failed to submit quiz')
      const saved = await res.json()

      setResult({ score: saved.score, total: saved.total, pct: saved.pct, passed: saved.passed })
      setCorrectOptions(saved.correct_options || {})
      setSubmitted(true)
      // Prepend to local attempts list so UI updates immediately
      setAttempts((prev) => [saved, ...prev])
    } catch {
      setResult(null)
    } finally {
      setSavingAttempt(false)
    }
  }

  // ── retry ─────────────────────────────────────────────
  function handleRetry() {
    setAnswers({})
    setSubmitted(false)
    setResult(null)
    setCorrectOptions({})
  }

  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined)

  return (
    <div className="quiz-container">
      {/* ── Header ── */}
      <div className="quiz-header-row">
        <div>
          <h3 className="quiz-title">Lesson Quiz</h3>
          <p className="quiz-pass-note">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} &nbsp;·&nbsp; Pass mark: {quiz.pass_percent ?? 70}%
          </p>
        </div>
        {attempts.length > 0 && !submitted && (
          <span className="quiz-best-badge">
            Best: {Math.max(...attempts.map((a) => a.pct))}%
            &nbsp;{Math.max(...attempts.map((a) => a.pct)) >= (quiz.pass_percent ?? 70) ? '✓' : ''}
          </span>
        )}
      </div>

      {/* ── Questions ── */}
      <ol className="quiz-questions">
        {quiz.questions.map((q, qi) => {
          const chosenId  = answers[q.id]
          const correctId = correctOptions[q.id]
          const correctOpt = q.options.find((o) => o.id === correctId)

          return (
            <li key={q.id} className="quiz-question">
              <p className="quiz-question-text">{qi + 1}. {q.question_text}</p>
              <ul className="quiz-options">
                {q.options.map((opt) => {
                  const isCorrect = opt.id === correctId
                  let cls = 'quiz-option'
                  if (submitted) {
                    if (isCorrect)                          cls += ' correct'
                    else if (opt.id === chosenId && !isCorrect) cls += ' wrong'
                  } else if (opt.id === chosenId) {
                    cls += ' selected'
                  }
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        className={cls}
                        onClick={() => handleSelect(q.id, opt.id)}
                        disabled={submitted}
                      >
                        {opt.option_text}
                        {submitted && isCorrect && <span className="quiz-indicator"> ✓</span>}
                        {submitted && opt.id === chosenId && !isCorrect && <span className="quiz-indicator"> ✗</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
              {submitted && chosenId !== correctId && (
                <p className="quiz-correct-hint">
                  Correct answer: <strong>{correctOpt?.option_text}</strong>
                </p>
              )}
            </li>
          )
        })}
      </ol>

      {/* ── Submit button ── */}
      {!submitted && (
        <button
          type="button"
          className="journey-button quiz-submit-btn"
          onClick={handleSubmit}
          disabled={!allAnswered || savingAttempt}
        >
          {savingAttempt ? 'Submitting…' : allAnswered ? 'Submit Quiz' : `Answer all ${quiz.questions.length} questions to submit`}
        </button>
      )}

      {/* ── Result card ── */}
      {submitted && result && (
        <div className={`quiz-result ${result.passed ? 'pass' : 'fail'}`}>
          <h4>{result.passed ? 'Passed!' : 'Not quite — try again'}</h4>
          <p className="quiz-score">
            You scored <strong>{result.score}/{result.total}</strong> ({result.pct}%)
            {savingAttempt && <span className="quiz-saving-note"> · saving…</span>}
          </p>
          <p className="quiz-threshold">
            Pass mark: {quiz.pass_percent ?? 70}% — {result.passed ? '✓ You passed' : '✗ You did not pass'}
          </p>
          <button type="button" className="outline-btn-green quiz-retry-btn" onClick={handleRetry}>
            Retry Quiz
          </button>
        </div>
      )}

      {/* ── Attempt history ── */}
      {user && (
        <div className="quiz-history">
          <h4 className="quiz-history-title">Your Attempt History</h4>
          {historyLoading ? (
            <p className="quiz-history-empty">Loading history…</p>
          ) : attempts.length === 0 ? (
            <p className="quiz-history-empty">No attempts yet. Submit the quiz above to record your first attempt.</p>
          ) : (
            <div className="quiz-history-table-wrap">
              <table className="quiz-history-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Questions</th>
                    <th>Correct</th>
                    <th>Incorrect</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id ?? i}>
                      <td className="quiz-history-num">{attempts.length - i}</td>
                      <td className="quiz-history-date">{formatDate(a.attempted_at ?? a.date)}</td>
                      <td>{a.total}</td>
                      <td className="quiz-history-correct">{a.score}</td>
                      <td className="quiz-history-wrong">{a.total - a.score}</td>
                      <td><strong>{a.pct}%</strong></td>
                      <td>
                        <span className={`quiz-history-badge ${a.passed ? 'pass' : 'fail'}`}>
                          {a.passed ? 'Pass' : 'Fail'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
