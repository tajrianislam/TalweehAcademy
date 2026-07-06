require('dotenv').config()
const crypto = require('crypto')
const path = require('path')
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const mysql = require('mysql2/promise')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const rateLimit = require('express-rate-limit')
const { sendPasswordResetEmail, sendContactNotificationEmail } = require('./email')
const axios = require('axios')
const multer = require('multer')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
const quranRouter = require('./quran')

const app = express()

// Railway (and most PaaS) put the app behind a reverse proxy — trust the first
// hop so req.ip / express-rate-limit see the real client IP, not the proxy's.
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN,
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Self-hosted WordPress media (public/wp-content/uploads/...). In production
// these are offloaded to object storage; redirect instead of bundling ~500MB
// into the deploy. Locally MEDIA_BASE_URL is unset, so Vite/express.static
// keeps serving the files straight out of public/ as before.
const MEDIA_BASE_URL = process.env.MEDIA_BASE_URL
if (MEDIA_BASE_URL) {
  app.use('/wp-content/uploads', (req, res) => {
    res.redirect(302, `${MEDIA_BASE_URL.replace(/\/$/, '')}${req.originalUrl}`)
  })
}

// Cloudflare R2 (S3-compatible) — admin image uploads. Gated on env vars so
// the endpoint degrades to 501 when uploads aren't configured.
const R2_BUCKET = process.env.R2_BUCKET
const r2 = (process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && R2_BUCKET)
  ? new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    })
  : null

const UPLOAD_MIME_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    // Images only; no SVG (can carry scripts).
    cb(null, Boolean(UPLOAD_MIME_EXT[file.mimetype]))
  },
})

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
})

const JWT_SECRET = process.env.JWT_SECRET
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000 // 7 days
const COOKIE_SECURE = process.env.NODE_ENV === 'production'
const ARTICLE_IMAGE_URL = '/wp-content/uploads/elementor/thumbs/Hanafi-Uṣul-al-Fiqh-Level-01-rfkd0r9y5ilfd0ttgant6ouyfvlk6r5plneiw5s4d0.webp'
const QUDURI_ARTICLE_IMAGE_URL = '/wp-content/uploads/2025/10/The-Legacy-of-Mukhtaṣar-al-Quduri1.webp'

const MORALITY_ARTICLE_CONTENT = [
  { type: 'paragraph', text: 'Before delving into the primary evidences of Islamic law—namely the Qur’an, Sunnah, Ijmāʿ, and Qiyās—classical scholars of uṣūl al-fiqh established a series of foundational discussions known as mabādiʾ. These preliminaries serve to prepare the student intellectually and methodologically for understanding how legal rulings are derived.' },
  { type: 'paragraph', text: 'From these discussions is one of the most foundational debates in Islamic intellectual history: the issue of taḥsīn and taqbīḥ (moral valuation of actions).' },
  { type: 'paragraph', text: 'The central question is whether actions are intrinsically good or evil, or whether they only become so through divine revelation. Closely related to this are several key theological questions: Is gratitude to the One who bestows blessings obligatory even without revelation? Are people morally accountable before a prophet is sent? Can the intellect independently recognize moral responsibility? These issues deeply affect theology, law, ethics, and even daily religious practice.' },
  { type: 'heading', text: 'Objective and Subjective Morality: Framing the Debate' },
  { type: 'paragraph', text: 'At the heart of taḥsīn and taqbīḥ lies a broader philosophical question: Is morality objective or subjective?' },
  { type: 'paragraph', text: 'Objective morality asserts that certain actions are inherently right or wrong, regardless of time, place, or perspective. Subjective morality, on the other hand, holds that moral judgments depend on individuals or cultures and can vary accordingly. While subjective morality is often defended by pointing to historical and cultural differences, this argument fails upon closer inspection. The mere existence of differing practices does not prove their moral validity.' },
  { type: 'paragraph', text: 'Moreover, complete moral relativism is practically unworkable. No society can function without moral absolutes, as laws themselves are rooted in the assumption that certain actions—such as murder or theft—are definitively wrong. Even those who advocate moral subjectivity routinely impose their own moral judgments on others, revealing an internal inconsistency.' },
  { type: 'heading', text: 'Islam’s Balanced Approach to Morality' },
  { type: 'paragraph', text: 'Islam does not fully endorse either extreme. Instead, it adopts a nuanced and balanced position. Some moral truths are objective and unchanging, such as the goodness of tawḥīd and the evil of shirk. Other rulings, however, are subject to divine wisdom and may change across different communities or time periods. Many legal rulings in Islamic law fall into this latter category.' },
  { type: 'paragraph', text: 'For example, certain practices permitted in earlier revelations were later prohibited, and vice versa. Even actions like killing can be moral or immoral depending on context, such as in cases of just retaliation (qiṣāṣ) or warfare versus unjust aggression. Thus, morality in Islam is neither purely fixed nor purely relative; rather, it is guided by revelation while acknowledging context and divine wisdom.' },
  { type: 'heading', text: 'The Three Meanings of Taḥsīn and Taqbīḥ' },
  { type: 'paragraph', text: 'Classical scholars clarified that disagreements over taḥsīn and taqbīḥ often arise from failing to distinguish between their different meanings. These meanings can be grouped into three categories.' },
  { type: 'paragraph', text: 'The first relates to human inclination and aversion. Actions are described as good if they naturally attract people due to benefit, and bad if they repel them due to harm. All scholars agree that the intellect can independently recognize this type of goodness and badness.' },
  { type: 'paragraph', text: 'The second meaning concerns perfection and deficiency. Qualities such as knowledge, justice, and generosity are recognized by reason as perfections, while ignorance, injustice, and miserliness are deficiencies. Again, there is universal agreement that the intellect can discern this without revelation.' },
  { type: 'paragraph', text: 'The real point of dispute lies in the third meaning: whether an action deserves praise or blame in this world and reward or punishment in the Hereafter. Here, scholars diverge on whether the intellect alone can make this determination, or whether revelation is required.' },
  { type: 'heading', text: 'Scholarly Positions on Moral Accountability' },
  { type: 'subheading', text: 'The Ashʿarī Position' },
  { type: 'paragraph', text: 'The Ashʿarī school maintains that moral accountability—meaning entitlement to reward or punishment—can only be established through revelation. While the intellect can recognize benefit, harm, perfection, and deficiency, it cannot independently determine that an action merits divine reward or punishment. According to this view, legal and moral obligation only applies after revelation has reached a person.' },
  { type: 'subheading', text: 'The Muʿtazilī Position' },
  { type: 'paragraph', text: 'The Muʿtazilah argue that the intellect can fully determine moral value, including deserving praise or blame and reward or punishment. They hold that certain actions are inherently obligatory or forbidden, even before revelation. From this perspective, individuals can be held accountable for failing to act justly or gratefully even if no prophet has reached them.' },
  { type: 'paragraph', text: 'However, they do not claim that all actions fall into this category. Instead, they classify actions into four types, ranging from those that are clearly good or evil by reason alone, to those whose moral status can only be known through revelation.' },
  { type: 'subheading', text: 'The Māturīdī Position' },
  { type: 'paragraph', text: 'The Māturīdī school takes a middle position. It agrees that the intellect can recognize that an action deserves a certain ruling, but it insists that only revelation actually establishes the ruling itself. In other words, reason identifies moral suitability, but divine law confers legal and eschatological consequence. This distinction preserves both the role of reason and the authority of revelation.' },
  { type: 'paragraph', text: 'Notably, this position was favored by later scholars such as Ibn Taymiyyah and Ibn al-Qayyim.' },
  { type: 'heading', text: 'Practical Implications of the Debate' },
  { type: 'paragraph', text: 'The most significant outcome of this disagreement concerns accountability before revelation. According to the Ashʿarīs and Māturīdīs, moral and legal responsibility depends on the arrival of divine message. According to the Muʿtazilah, certain obligations exist regardless of revelation due to rational necessity.' },
  { type: 'paragraph', text: 'Despite these differences, all schools agree that the majority of detailed legal rulings—such as prayer, fasting, zakāh, and ḥajj—can only be known through revelation. These are not accessible through reason alone and belong to the domain where Sharīʿah is indispensable.' },
  { type: 'heading', text: 'Conclusion: Why This Discussion Matters' },
  { type: 'paragraph', text: 'The debate over taḥsīn and taqbīḥ is not an abstract philosophical exercise. It shapes how Muslims understand accountability, ethics, divine justice, and the relationship between reason and revelation. It also provides intellectual clarity when engaging modern moral challenges, especially those rooted in relativism and secular ethics.' },
  { type: 'paragraph', text: 'By carefully distinguishing between different types of moral judgment and recognizing the limits and strengths of human reason, Islamic scholarship presents a coherent moral framework—one that is anchored in revelation while remaining intellectually rigorous and deeply human.' },
]

const QUDURI_ARTICLE_CONTENT = [
  { type: 'heading', text: 'The Legacy of Mukhtaṣar al-Qudūrī' },
  { type: 'paragraph', text: 'The following is an excerpt from a larger work introducing the Mukhtaṣar. In this section, we will cover the century-long legacy of the Mukhtaṣar, discovering the most famous works that stem from it.' },
  { type: 'heading', text: 'Detailed Overview' },
  { type: 'subheading', text: 'Commentaries and Footnotes' },
  { type: 'paragraph', text: 'The clarity and brevity of Mukhtaṣar al-Qudūrī inspired many scholars to elaborate upon its contents through detailed commentaries. Among the earliest of these was al-Aqṭaʿ (d. 474 AH), a direct student of Imām al-Qudūrī, who produced one of the first known explanations of the text. His contribution laid the groundwork for a long-standing tradition of scholarly engagement with the Mukhtaṣar.' },
  { type: 'paragraph', text: 'In the centuries that followed, prominent scholars continued this tradition. Al-Zāhidī authored al-Mujtabā, Al-Ḥaddād composed al-Jawharah al-Nayyirah, Al-Kādūrī followed with Jāmiʿ al-Muḍmarāt wa’l-Mushkilāt, and al-Maydānī later wrote al-Lubāb, a work that continues to be studied today. If the footnotes and commentaries authored on the work were gathered, they would approach one hundred, if not more.' },
  { type: 'subheading', text: 'Poetic Renditions' },
  { type: 'paragraph', text: 'Because of its precision and conciseness, Mukhtaṣar al-Qudūrī also lent itself to poetic form. Two well-known versifications were composed to make its study and memorization easier: one by Sirāj al-Dīn al-ʿĀmilī and another by al-Khalwatī. Traditionally, Muslim scholars often converted books into poetry to make them easier for students to memorize.' },
  { type: 'video', url: 'https://www.youtube.com/watch?v=kYe1yEqVMV8', title: 'The Legacy of Mukhtasar al-Qudūrī - Part 2' },
  { type: 'subheading', text: 'Derivative and Supplementary Works' },
  { type: 'paragraph', text: 'Beyond commentaries and poetry, Mukhtaṣar al-Qudūrī inspired numerous derivative works aimed at refining, summarizing, or contextualizing its discussions. Among these was al-Taṣḥīḥ wa’l-Tarjīḥ by Qāsim ibn Quṭlūbughā, in which the author cited relied-upon positions of later authorities, especially when these differed from what is found in the Mukhtaṣar itself.' },
  { type: 'paragraph', text: 'Another major work that emerged from the Mukhtaṣar’s influence was Bidāyat al-Mubtadī by Imām al-Marghīnānī. In this text, he combined al-Jāmiʿ al-Ṣaghīr of Imām Muḥammad al-Shaybānī with Mukhtaṣar al-Qudūrī, focusing on legal discussions without mentioning evidences. His later abridged commentary became the famous al-Hidāyah, one of the most influential works in Islamic jurisprudence.' },
  { type: 'heading', text: 'The Scholarly Tradition of al-Hidāyah' },
  { type: 'paragraph', text: 'Al-Hidāyah itself gave rise to a rich scholarly tradition, including Nihāyat al-Kifāyah, al-Nihāyah fī Sharḥ al-Hidāyah, ʿInāyah, Ghāyat al-Bayān, al-Bināyah, Fatḥ al-Qadīr, and later marginal glosses. These works refined, critiqued, transmitted, and expanded the legal reasoning embedded in al-Hidāyah.' },
  { type: 'paragraph', text: 'Many commentators benefited from Jamāl al-Dīn al-Zaylaʿī’s Naṣb al-Rāyah, in which he gathered and referenced narrations quoted in al-Hidāyah. This was later summarized by Ibn Ḥajar al-ʿAsqalānī in Dirāyah, and further supplemented by Qāsim ibn Quṭlūbughā.' },
  { type: 'heading', text: 'From al-Qudūrī to al-Nasafī and Beyond' },
  { type: 'paragraph', text: 'The influence of Mukhtaṣar al-Qudūrī extended far beyond these centuries. Al-Nasafī explicitly stated in the introduction of al-Wāfī that he relied on al-Qudūrī’s work. He later composed al-Kāfī as a commentary and then abridged al-Wāfī into Kanz al-Daqāʾiq, which remains widely studied in Ḥanafī circles today.' },
  { type: 'paragraph', text: 'Major commentaries on Kanz al-Daqāʾiq include Tabyīn al-Ḥaqāʾiq, Ramz al-Ḥaqāʾiq, al-Baḥr al-Rāʾiq, al-Nahr al-Fāʾiq, and Ibn ʿĀbidīn’s gloss Minḥat al-Khāliq.' },
  { type: 'heading', text: 'Other Major Derivative Works' },
  { type: 'paragraph', text: 'The scholarly chain inspired by al-Qudūrī also includes Majmaʿ al-Baḥrayn, Multaqa al-Abḥur, Majmaʿ al-Anhur, and al-Durr al-Muntaqā. These works preserved and reorganized the school’s legal discussions for later generations.' },
  { type: 'heading', text: 'The Best Way To Study Qudūrī' },
  { type: 'paragraph', text: 'Students should approach the Mukhtaṣar with structure, consistency, and review. A worksheet and guided study can help maximize benefit while reading the text.' },
  { type: 'heading', text: 'Conclusion' },
  { type: 'paragraph', text: 'The far-reaching influence of Mukhtaṣar al-Qudūrī is evident in the centuries of scholarship it inspired. From detailed commentaries and concise primers to poetic renditions and derivative manuals, its intellectual legacy shaped the course of Ḥanafī jurisprudence across generations.' },
  { type: 'heading', text: 'Want to join a detailed Study of Qudūrī?' },
  { type: 'paragraph', text: 'Enroll in the Mukhtaṣar al-Qudūrī courses to attend live classes and study the text in detail.' },
]

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be set and at least 32 characters')
  process.exit(1)
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/

function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

function isValidEmail(email) {
  return EMAIL_REGEX.test(email)
}

function isValidUsername(username) {
  return USERNAME_REGEX.test(username)
}

function setAuthCookie(res, user) {
  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: COOKIE_MAX_AGE,
  })
  return token
}

function userResponse(user) {
  return { id: user.id, name: user.name, username: user.username, email: user.email, role: user.role }
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many registration attempts. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// ── Auth routes ──────────────────────────────────────────

app.post('/api/auth/register', registerLimiter, async (req, res) => {
  const { first_name, last_name, username, email, password, password_confirmation } = req.body

  if (!first_name || !last_name || !username || !email || !password || !password_confirmation) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  if (first_name.trim().length < 2) {
    return res.status(400).json({ error: 'First name must be at least 2 characters.' })
  }
  if (last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Last name must be at least 2 characters.' })
  }
  if (!isValidUsername(username.trim())) {
    return res.status(400).json({ error: 'Username must be 3–30 characters and contain only letters, numbers, underscores, or dots.' })
  }
  const normalizedEmail = normalizeEmail(email)
  if (!isValidEmail(normalizedEmail)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  if (password !== password_confirmation) {
    return res.status(400).json({ error: 'Passwords do not match.' })
  }

  try {
    const [existingEmail] = await pool.query(
      'SELECT id FROM auth_users WHERE email = ?', [normalizedEmail]
    )
    if (existingEmail.length > 0) {
      return res.status(409).json({ error: 'An account with that email already exists.' })
    }
    const [existingUsername] = await pool.query(
      'SELECT id FROM auth_users WHERE username = ?', [username.trim()]
    )
    if (existingUsername.length > 0) {
      return res.status(409).json({ error: 'That username is already taken.' })
    }

    const password_hash = await bcrypt.hash(password, 12)
    const fullName = `${first_name.trim()} ${last_name.trim()}`
    const [result] = await pool.query(
      'INSERT INTO auth_users (name, username, first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [fullName, username.trim(), first_name.trim(), last_name.trim(), normalizedEmail, password_hash]
    )
    const user = { id: result.insertId, email: normalizedEmail, name: fullName, username: username.trim(), role: 'user' }
    setAuthCookie(res, user)
    res.status(201).json(userResponse(user))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Registration failed.' })
  }
})

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' })
  }
  try {
    const loginId = username.trim()
    const normalizedEmail = normalizeEmail(loginId)
    const [rows] = await pool.query(
      'SELECT * FROM auth_users WHERE username = ? OR email = ?',
      [loginId, normalizedEmail]
    )
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }
    const user = rows[0]
    const match = await bcrypt.compare(password, user.password_hash)
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password.' })
    }
    setAuthCookie(res, user)
    res.json(userResponse(user))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Login failed.' })
  }
})

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('token', { httpOnly: true, sameSite: 'lax', secure: COOKIE_SECURE })
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    res.json({ id: payload.id, name: payload.name, username: payload.username, email: payload.email, role: payload.role })
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
})

// ── Password reset routes ─────────────────────────────────

const APP_BASE_URL = (process.env.APP_BASE_URL || process.env.FRONTEND_ORIGIN || 'http://localhost:5174').replace(/\/$/, '')

function sha256(str) {
  return crypto.createHash('sha256').update(str).digest('hex')
}

const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many password reset requests. Please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Always returns the same response to prevent account enumeration.
app.post('/api/auth/forgot-password', resetLimiter, async (req, res) => {
  const GENERIC_MSG = 'If an account with that email exists, a reset link has been sent.'
  const { email } = req.body
  if (!email || !isValidEmail(normalizeEmail(email))) {
    return res.json({ message: GENERIC_MSG })
  }
  const normalizedEmail = normalizeEmail(email)
  try {
    const [users] = await pool.query(
      'SELECT id FROM auth_users WHERE email = ?', [normalizedEmail]
    )
    if (users.length === 0) {
      // Intentionally still 200 — no enumeration
      return res.json({ message: GENERIC_MSG })
    }
    const userId = users[0].id

    // Invalidate any prior unused tokens for this user
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [userId]
    )

    // Generate token: store hash, send raw
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = sha256(rawToken)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 60 min

    await pool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    )

    const resetUrl = `${APP_BASE_URL}/reset-password?token=${rawToken}`
    await sendPasswordResetEmail(normalizedEmail, resetUrl)
    // send errors are logged inside sendPasswordResetEmail; we always return 200

    res.json({ message: GENERIC_MSG })
  } catch (err) {
    console.error(err)
    res.json({ message: GENERIC_MSG })
  }
})

app.post('/api/auth/reset-password', resetLimiter, async (req, res) => {
  const { token, password } = req.body
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid or missing reset token.' })
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  try {
    const tokenHash = sha256(token)
    const [rows] = await pool.query(
      `SELECT id, user_id, expires_at, used_at
         FROM password_reset_tokens
        WHERE token_hash = ?`,
      [tokenHash]
    )
    if (rows.length === 0) {
      return res.status(400).json({ error: 'This reset link is invalid or has already been used.' })
    }
    const record = rows[0]
    if (record.used_at !== null) {
      return res.status(400).json({ error: 'This reset link has already been used.' })
    }
    if (new Date() > new Date(record.expires_at)) {
      return res.status(400).json({ error: 'This reset link has expired. Please request a new one.' })
    }

    // Hash new password and update user — mark token used atomically
    const passwordHash = await bcrypt.hash(password, 12)
    await pool.query(
      'UPDATE auth_users SET password_hash = ?, password_changed_at = NOW() WHERE id = ?',
      [passwordHash, record.user_id]
    )
    await pool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?',
      [record.id]
    )

    res.json({ ok: true, message: 'Password updated. You can now log in with your new password.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to reset password. Please try again.' })
  }
})

// ── Middleware ───────────────────────────────────────────

/**
 * Verify the JWT and — crucially — reject tokens issued before the user last
 * changed their password.  This ensures all sessions are invalidated on reset.
 * Adds one DB query per protected request; acceptable at this scale.
 */
async function verifyJwtAndCheckRevocation(token) {
  const payload = jwt.verify(token, JWT_SECRET) // throws on bad/expired token
  const [rows] = await pool.query(
    'SELECT password_changed_at FROM auth_users WHERE id = ?',
    [payload.id]
  )
  if (rows.length === 0) throw new Error('User not found')
  const changedAt = rows[0].password_changed_at
  if (changedAt) {
    // iat is in seconds; changedAt is a Date
    const changedAtSec = Math.floor(new Date(changedAt).getTime() / 1000)
    if (changedAtSec > payload.iat) {
      throw new Error('Session invalidated by password change')
    }
  }
  return payload
}

async function requireAdmin(req, res, next) {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    const payload = await verifyJwtAndCheckRevocation(token)
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin access required' })
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}

async function requireAuth(req, res, next) {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: 'Not authenticated' })
  try {
    req.user = await verifyJwtAndCheckRevocation(token)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' })
  }
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function tableExists(tableName) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName]
  )

  return rows[0].count > 0
}

async function ensureIndex(tableName, indexName, alterSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [tableName, indexName]
  )

  if (rows[0].count === 0) {
    await pool.query(alterSql)
  }
}

async function ensureForeignKey(tableName, constraintName, alterSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ?
      AND CONSTRAINT_NAME = ?
      AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [tableName, constraintName]
  )

  if (rows[0].count === 0) {
    await pool.query(alterSql)
  }
}

async function ensureLessonActivitySchema() {
  const requiredTables = [
    'auth_users',
    'lessons',
    'lesson_progress',
    'lesson_notes',
    'lesson_comments',
  ]
  const tableAvailability = await Promise.all(requiredTables.map(tableExists))

  if (tableAvailability.some((exists) => !exists)) {
    console.warn('Skipping lesson activity foreign keys because required tables are missing')
    return
  }

  await ensureIndex(
    'lesson_progress',
    'idx_lesson_progress_lesson_id',
    'ALTER TABLE lesson_progress ADD INDEX idx_lesson_progress_lesson_id (lesson_id)'
  )
  await ensureIndex(
    'lesson_notes',
    'idx_lesson_notes_lesson_id',
    'ALTER TABLE lesson_notes ADD INDEX idx_lesson_notes_lesson_id (lesson_id)'
  )
  await ensureIndex(
    'lesson_comments',
    'idx_lesson_comments_lesson_created',
    'ALTER TABLE lesson_comments ADD INDEX idx_lesson_comments_lesson_created (lesson_id, created_at)'
  )
  await ensureIndex(
    'lesson_comments',
    'idx_lesson_comments_user_id',
    'ALTER TABLE lesson_comments ADD INDEX idx_lesson_comments_user_id (user_id)'
  )

  await ensureForeignKey(
    'lesson_progress',
    'fk_lesson_progress_user',
    `ALTER TABLE lesson_progress
     ADD CONSTRAINT fk_lesson_progress_user
     FOREIGN KEY (user_id) REFERENCES auth_users(id)
     ON DELETE CASCADE`
  )
  await ensureForeignKey(
    'lesson_progress',
    'fk_lesson_progress_lesson',
    `ALTER TABLE lesson_progress
     ADD CONSTRAINT fk_lesson_progress_lesson
     FOREIGN KEY (lesson_id) REFERENCES lessons(id)
     ON DELETE CASCADE`
  )
  await ensureForeignKey(
    'lesson_notes',
    'fk_lesson_notes_user',
    `ALTER TABLE lesson_notes
     ADD CONSTRAINT fk_lesson_notes_user
     FOREIGN KEY (user_id) REFERENCES auth_users(id)
     ON DELETE CASCADE`
  )
  await ensureForeignKey(
    'lesson_notes',
    'fk_lesson_notes_lesson',
    `ALTER TABLE lesson_notes
     ADD CONSTRAINT fk_lesson_notes_lesson
     FOREIGN KEY (lesson_id) REFERENCES lessons(id)
     ON DELETE CASCADE`
  )
  await ensureForeignKey(
    'lesson_comments',
    'fk_lesson_comments_user',
    `ALTER TABLE lesson_comments
     ADD CONSTRAINT fk_lesson_comments_user
     FOREIGN KEY (user_id) REFERENCES auth_users(id)
     ON DELETE CASCADE`
  )
  await ensureForeignKey(
    'lesson_comments',
    'fk_lesson_comments_lesson',
    `ALTER TABLE lesson_comments
     ADD CONSTRAINT fk_lesson_comments_lesson
     FOREIGN KEY (lesson_id) REFERENCES lessons(id)
     ON DELETE CASCADE`
  )
}

async function ensureLessonProgressTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_progress (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      lesson_id INT NOT NULL,
      \`current_time\` INT DEFAULT 0,
      duration INT DEFAULT 0,
      watch_percentage INT DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      completed_at TIMESTAMP NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_lesson_progress (user_id, lesson_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      lesson_id INT NOT NULL,
      body TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_lesson_note (user_id, lesson_id)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS lesson_comments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      lesson_id INT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS articles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      category VARCHAR(120),
      excerpt TEXT,
      image_url TEXT,
      youtube_url TEXT,
      read_time VARCHAR(50),
      published_at DATE,
      content_json LONGTEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `)

  await ensureLessonActivitySchema()

  await pool.query(
    `INSERT INTO articles
      (title, slug, category, excerpt, image_url, youtube_url, read_time, published_at, content_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      category = VALUES(category),
      excerpt = VALUES(excerpt),
      image_url = VALUES(image_url),
      youtube_url = VALUES(youtube_url),
      read_time = VALUES(read_time),
      published_at = VALUES(published_at),
      content_json = VALUES(content_json)`,
    [
      'Taḥsīn & Taqbīḥ: Reason, Revelation, and the Foundations of Islamic Morality',
      'tahsin-taqbih-reason-revelation-and-the-foundations-of-islamic-morality',
      'Uncategorized',
      'A foundational discussion on moral valuation, objective and subjective morality, and the role of reason and revelation in Islamic law.',
      ARTICLE_IMAGE_URL,
      'https://www.youtube.com/watch?v=cdSwdNNhYoA',
      '6 Minutes',
      '2026-01-08',
      JSON.stringify(MORALITY_ARTICLE_CONTENT),
    ]
  )

  await pool.query(
    `INSERT INTO articles
      (title, slug, category, excerpt, image_url, youtube_url, read_time, published_at, content_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
      title = VALUES(title),
      category = VALUES(category),
      excerpt = VALUES(excerpt),
      image_url = VALUES(image_url),
      youtube_url = VALUES(youtube_url),
      read_time = VALUES(read_time),
      published_at = VALUES(published_at),
      content_json = VALUES(content_json)`,
    [
      'The Legacy of Mukhtasar al-Qudūrī',
      'the-legacy-of-mukhtasar-al-quduri',
      'Scholars and Texts',
      'A tour through the century-long legacy of Mukhtaṣar al-Qudūrī and the major commentaries, abridgements, poetic works, and derivative manuals that stemmed from it.',
      QUDURI_ARTICLE_IMAGE_URL,
      'https://www.youtube.com/watch?v=SQmeAQ6wZ1U',
      '8 Minutes',
      '2025-10-30',
      JSON.stringify(QUDURI_ARTICLE_CONTENT),
    ]
  )
}

function normalizeProgress(row) {
  return {
    lessonId: row.lesson_id,
    currentTime: row.current_time || 0,
    duration: row.duration || 0,
    watchPercentage: row.watch_percentage || 0,
    completed: Boolean(row.completed),
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  }
}

function normalizeNote(row, lessonId) {
  return {
    lessonId,
    body: row?.body || '',
    createdAt: row?.created_at || null,
    updatedAt: row?.updated_at || null,
  }
}

function normalizeComment(row) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    body: row.body,
    author: row.author || 'Student',
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function normalizeArticle(row, includeContent = false) {
  const article = {
    id: row.id,
    title: row.title,
    slug: row.slug,
    category: row.category,
    excerpt: row.excerpt,
    imageUrl: row.image_url,
    youtubeUrl: row.youtube_url,
    readTime: row.read_time,
    publishedAt: row.published_at,
  }

  if (includeContent) {
    try {
      article.content = JSON.parse(row.content_json || '[]')
    } catch {
      article.content = []
    }
  }

  return article
}

// ── Course routes ─────────────────────────────────────────

app.get('/api/courses', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM courses ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch courses' })
  }
})

app.post('/api/courses', requireAdmin, async (req, res) => {
  const {
    title, description, price, cadence, status, category,
    instructor_name, instructor_avatar_url, thumbnail_url, level,
  } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  const slug = slugify(title)
  try {
    const [result] = await pool.query(
      `INSERT INTO courses
        (title, slug, description, price, cadence, status, category, instructor_name, instructor_avatar_url, thumbnail_url, level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slug, description || null, price || 0, cadence || null, status || 'Online',
       category || null, instructor_name || null, instructor_avatar_url || null,
       thumbnail_url || null, level || 'Beginner']
    )
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A course with this title already exists' })
    res.status(500).json({ error: 'Failed to create course' })
  }
})

app.get('/api/courses/:slug', async (req, res) => {
  try {
    const [courses] = await pool.query('SELECT * FROM courses WHERE slug = ?', [req.params.slug])
    if (courses.length === 0) return res.status(404).json({ error: 'Course not found' })
    const course = courses[0]
    const [lessons] = await pool.query(
      `SELECT l.id, l.title, l.slug, l.is_free, l.order_index,
              IF(q.id IS NOT NULL, 1, 0) AS has_quiz
         FROM lessons l
         LEFT JOIN quizzes q ON q.lesson_id = l.id
        WHERE l.course_id = ?
        ORDER BY l.order_index ASC`,
      [course.id]
    )
    res.json({ ...course, lessons })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch course' })
  }
})

// ── Enrollment routes ─────────────────────────────────────

// Check if the authenticated user is enrolled in a course
app.get('/api/courses/:slug/enrollment', requireAuth, async (req, res) => {
  try {
    const [courses] = await pool.query('SELECT id FROM courses WHERE slug = ?', [req.params.slug])
    if (courses.length === 0) return res.status(404).json({ error: 'Course not found' })
    const courseId = courses[0].id

    if (req.user.role === 'admin') return res.json({ enrolled: true })

    const [rows] = await pool.query(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
      [req.user.id, courseId]
    )
    res.json({ enrolled: rows.length > 0 })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to check enrollment' })
  }
})

// List all enrollments (admin)
app.get('/api/enrollments', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT e.id, e.granted_at,
              u.id AS user_id, u.name AS user_name, u.email AS user_email,
              c.id AS course_id, c.title AS course_title, c.slug AS course_slug
       FROM enrollments e
       JOIN auth_users u ON u.id = e.user_id
       JOIN courses c ON c.id = e.course_id
       ORDER BY e.granted_at DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch enrollments' })
  }
})

// Grant enrollment (admin)
app.post('/api/enrollments', requireAdmin, async (req, res) => {
  const { user_email, course_id } = req.body
  if (!user_email || !course_id) {
    return res.status(400).json({ error: 'user_email and course_id are required' })
  }
  try {
    const [users] = await pool.query(
      'SELECT id, name, email FROM auth_users WHERE email = ?',
      [normalizeEmail(user_email)]
    )
    if (users.length === 0) return res.status(404).json({ error: 'No account found with that email' })
    const targetUser = users[0]

    const [courses] = await pool.query('SELECT id, title FROM courses WHERE id = ?', [course_id])
    if (courses.length === 0) return res.status(404).json({ error: 'Course not found' })

    const [result] = await pool.query(
      'INSERT INTO enrollments (user_id, course_id, granted_by) VALUES (?, ?, ?)',
      [targetUser.id, course_id, req.user.id]
    )
    res.status(201).json({
      id: result.insertId,
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
      course: { id: courses[0].id, title: courses[0].title },
    })
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'This student is already enrolled in this course' })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to grant enrollment' })
  }
})

// Revoke enrollment (admin)
app.delete('/api/enrollments/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM enrollments WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Enrollment not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to revoke enrollment' })
  }
})

// ── Article routes ─────────────────────────────────────────

app.get('/api/articles', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, slug, category, excerpt, image_url, youtube_url, read_time, published_at
       FROM articles
       ORDER BY published_at DESC, id DESC`
    )
    res.json(rows.map((row) => normalizeArticle(row)))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch articles' })
  }
})

app.get('/api/articles/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM articles WHERE slug = ?', [req.params.slug])
    if (rows.length === 0) return res.status(404).json({ error: 'Article not found' })
    res.json(normalizeArticle(rows[0], true))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch article' })
  }
})

// ── Lesson routes ─────────────────────────────────────────

app.post('/api/courses/:id/lessons', requireAdmin, async (req, res) => {
  const { title, youtube_url, is_free, order_index } = req.body
  if (!title || !youtube_url) return res.status(400).json({ error: 'title and youtube_url are required' })
  const courseId = req.params.id
  const slug = slugify(title)
  try {
    const [result] = await pool.query(
      'INSERT INTO lessons (course_id, title, slug, youtube_url, is_free, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [courseId, title, slug, youtube_url, is_free ? 1 : 0, order_index || 0]
    )
    const [rows] = await pool.query('SELECT * FROM lessons WHERE id = ?', [result.insertId])
    res.status(201).json(rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create lesson' })
  }
})

app.get('/api/lessons/:id', async (req, res) => {
  try {
    const [lessons] = await pool.query('SELECT * FROM lessons WHERE id = ?', [req.params.id])
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found' })
    const lesson = lessons[0]

    // Identify the viewer if a session cookie is present (needed for both the
    // paid-content gate and for deciding whether quiz answers are included).
    let payload = null
    const token = req.cookies.token
    if (token) {
      try {
        payload = await verifyJwtAndCheckRevocation(token)
      } catch {
        if (!lesson.is_free) return res.status(401).json({ error: 'Invalid or expired session' })
      }
    }

    if (!lesson.is_free) {
      if (!payload) return res.status(401).json({ error: 'not_authenticated' })
      if (payload.role !== 'admin') {
        const [enrRows] = await pool.query(
          'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?',
          [payload.id, lesson.course_id]
        )
        if (enrRows.length === 0) {
          return res.status(403).json({ error: 'enrollment_required' })
        }
      }
    }

    const [quizzes] = await pool.query('SELECT * FROM quizzes WHERE lesson_id = ?', [lesson.id])
    let quiz = null
    if (quizzes.length > 0) {
      const q = quizzes[0]
      const [questions] = await pool.query(
        'SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC', [q.id]
      )
      // Only admins (who edit quizzes) receive is_correct; students are graded
      // server-side via POST /quiz/attempt so answers never leak to the client.
      const isAdmin = payload?.role === 'admin'
      const questionsWithOptions = await Promise.all(
        questions.map(async (question) => {
          const [options] = await pool.query(
            'SELECT * FROM quiz_options WHERE question_id = ? ORDER BY order_index ASC', [question.id]
          )
          return {
            ...question,
            options: isAdmin ? options : options.map(({ is_correct, ...rest }) => rest),
          }
        })
      )
      quiz = { ...q, questions: questionsWithOptions }
    }

    res.json({ ...lesson, quiz })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch lesson' })
  }
})

// ── Video progress routes ─────────────────────────────────

app.get('/api/lessons/:id/progress', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT lesson_id, \`current_time\`, duration, watch_percentage, completed, completed_at, updated_at
       FROM lesson_progress
       WHERE user_id = ? AND lesson_id = ?`,
      [req.user.id, lessonId]
    )

    if (rows.length === 0) {
      return res.json({
        lessonId,
        currentTime: 0,
        duration: 0,
        watchPercentage: 0,
        completed: false,
        completedAt: null,
        updatedAt: null,
      })
    }

    res.json(normalizeProgress(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch lesson progress' })
  }
})

app.put('/api/lessons/:id/progress', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  const currentTime = Math.max(0, Math.floor(Number(req.body.currentTime) || 0))
  const duration = Math.max(0, Math.floor(Number(req.body.duration) || 0))
  const computedPercentage = duration > 0 ? Math.floor((currentTime / duration) * 100) : 0
  const watchPercentage = Math.max(
    0,
    Math.min(100, Math.floor(Number(req.body.watchPercentage) || computedPercentage))
  )
  const completed = Boolean(req.body.completed) || watchPercentage >= 90

  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }

  try {
    const [lessons] = await pool.query('SELECT id FROM lessons WHERE id = ?', [lessonId])
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found' })

    await pool.query(
      `INSERT INTO lesson_progress
        (user_id, lesson_id, \`current_time\`, duration, watch_percentage, completed, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, IF(? = 1, NOW(), NULL))
       ON DUPLICATE KEY UPDATE
        \`current_time\` = VALUES(\`current_time\`),
        duration = VALUES(duration),
        watch_percentage = VALUES(watch_percentage),
        completed = VALUES(completed),
        completed_at = IF(VALUES(completed) = 1, COALESCE(completed_at, NOW()), NULL)`,
      [req.user.id, lessonId, currentTime, duration, watchPercentage, completed ? 1 : 0, completed ? 1 : 0]
    )

    const [rows] = await pool.query(
      `SELECT lesson_id, \`current_time\`, duration, watch_percentage, completed, completed_at, updated_at
       FROM lesson_progress
       WHERE user_id = ? AND lesson_id = ?`,
      [req.user.id, lessonId]
    )

    res.json(normalizeProgress(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save lesson progress' })
  }
})

app.get('/api/courses/:slug/progress', requireAuth, async (req, res) => {
  try {
    const [courses] = await pool.query('SELECT id FROM courses WHERE slug = ?', [req.params.slug])
    if (courses.length === 0) return res.status(404).json({ error: 'Course not found' })

    const [rows] = await pool.query(
      `SELECT lp.lesson_id, lp.\`current_time\`, lp.duration, lp.watch_percentage, lp.completed, lp.completed_at, lp.updated_at
       FROM lesson_progress lp
       INNER JOIN lessons l ON l.id = lp.lesson_id
       WHERE lp.user_id = ? AND l.course_id = ?`,
      [req.user.id, courses[0].id]
    )

    res.json(rows.map(normalizeProgress))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch course progress' })
  }
})

app.get('/api/youtube-duration/:videoId', requireAuth, async (req, res) => {
  const { videoId } = req.params
  const youtubeApiKey = process.env.YOUTUBE_API_KEY

  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'Invalid YouTube video id' })
  }

  if (!youtubeApiKey) {
    return res.status(503).json({ error: 'YOUTUBE_API_KEY is not configured' })
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
      params: {
        id: videoId,
        part: 'contentDetails',
        key: youtubeApiKey,
      },
    })
    const item = response.data.items?.[0]
    if (!item) return res.status(404).json({ error: 'YouTube video not found' })

    res.json({ duration: item.contentDetails.duration })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch YouTube duration' })
  }
})

// ── Lesson notes and comments routes ───────────────────────

app.get('/api/lessons/:id/note', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT body, created_at, updated_at
       FROM lesson_notes
       WHERE user_id = ? AND lesson_id = ?`,
      [req.user.id, lessonId]
    )

    res.json(normalizeNote(rows[0], lessonId))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch lesson note' })
  }
})

app.put('/api/lessons/:id/note', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  const body = String(req.body.body || '').trim()
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }

  try {
    const [lessons] = await pool.query('SELECT id FROM lessons WHERE id = ?', [lessonId])
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found' })

    await pool.query(
      `INSERT INTO lesson_notes (user_id, lesson_id, body)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE body = VALUES(body)`,
      [req.user.id, lessonId, body]
    )

    const [rows] = await pool.query(
      `SELECT body, created_at, updated_at
       FROM lesson_notes
       WHERE user_id = ? AND lesson_id = ?`,
      [req.user.id, lessonId]
    )

    res.json(normalizeNote(rows[0], lessonId))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save lesson note' })
  }
})

app.get('/api/lessons/:id/comments', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }

  try {
    const [rows] = await pool.query(
      `SELECT lc.id, lc.lesson_id, lc.user_id, lc.body, lc.created_at, lc.updated_at, au.name AS author
       FROM lesson_comments lc
       LEFT JOIN auth_users au ON au.id = lc.user_id
       WHERE lc.lesson_id = ?
       ORDER BY lc.created_at DESC`,
      [lessonId]
    )

    res.json(rows.map(normalizeComment))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch lesson comments' })
  }
})

app.post('/api/lessons/:id/comments', requireAuth, async (req, res) => {
  const lessonId = Number(req.params.id)
  const body = String(req.body.body || '').trim()
  if (!Number.isInteger(lessonId) || lessonId <= 0) {
    return res.status(400).json({ error: 'Invalid lesson id' })
  }
  if (!body) return res.status(400).json({ error: 'Comment cannot be empty' })

  try {
    const [lessons] = await pool.query('SELECT id FROM lessons WHERE id = ?', [lessonId])
    if (lessons.length === 0) return res.status(404).json({ error: 'Lesson not found' })

    const [result] = await pool.query(
      'INSERT INTO lesson_comments (user_id, lesson_id, body) VALUES (?, ?, ?)',
      [req.user.id, lessonId, body]
    )

    const [rows] = await pool.query(
      `SELECT lc.id, lc.lesson_id, lc.user_id, lc.body, lc.created_at, lc.updated_at, au.name AS author
       FROM lesson_comments lc
       LEFT JOIN auth_users au ON au.id = lc.user_id
       WHERE lc.id = ?`,
      [result.insertId]
    )

    res.status(201).json(normalizeComment(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save lesson comment' })
  }
})

// ── Quiz routes ───────────────────────────────────────────

app.post('/api/lessons/:id/quiz', requireAdmin, async (req, res) => {
  const { pass_percent, questions } = req.body
  const lessonId = req.params.id
  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' })
  }
  try {
    const [existing] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lessonId])
    if (existing.length > 0) {
      return res.status(409).json({ error: 'This lesson already has a quiz' })
    }
    const [quizResult] = await pool.query(
      'INSERT INTO quizzes (lesson_id, pass_percent) VALUES (?, ?)',
      [lessonId, pass_percent || 70]
    )
    const quizId = quizResult.insertId
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      const [qResult] = await pool.query(
        'INSERT INTO quiz_questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)',
        [quizId, q.question_text, qi]
      )
      const questionId = qResult.insertId
      for (let oi = 0; oi < q.options.length; oi++) {
        const opt = q.options[oi]
        await pool.query(
          'INSERT INTO quiz_options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
          [questionId, opt.option_text, opt.is_correct ? 1 : 0, oi]
        )
      }
    }
    res.status(201).json({ ok: true, quiz_id: quizId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to create quiz' })
  }
})

// ── Quiz PUT (upsert) ─────────────────────────────────────
app.put('/api/lessons/:id/quiz', requireAdmin, async (req, res) => {
  const { pass_percent, questions } = req.body
  const lessonId = req.params.id
  if (!questions || questions.length === 0) {
    return res.status(400).json({ error: 'At least one question is required' })
  }
  try {
    const [existing] = await pool.query('SELECT id FROM quizzes WHERE lesson_id = ?', [lessonId])
    let quizId
    if (existing.length > 0) {
      quizId = existing[0].id
      const [qRows] = await pool.query('SELECT id FROM quiz_questions WHERE quiz_id = ?', [quizId])
      for (const qRow of qRows) {
        await pool.query('DELETE FROM quiz_options WHERE question_id = ?', [qRow.id])
      }
      await pool.query('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId])
      await pool.query('UPDATE quizzes SET pass_percent = ? WHERE id = ?', [pass_percent || 70, quizId])
    } else {
      const [quizResult] = await pool.query(
        'INSERT INTO quizzes (lesson_id, pass_percent) VALUES (?, ?)',
        [lessonId, pass_percent || 70]
      )
      quizId = quizResult.insertId
    }
    for (let qi = 0; qi < questions.length; qi++) {
      const q = questions[qi]
      const [qResult] = await pool.query(
        'INSERT INTO quiz_questions (quiz_id, question_text, order_index) VALUES (?, ?, ?)',
        [quizId, q.question_text, qi]
      )
      const questionId = qResult.insertId
      for (let oi = 0; oi < q.options.length; oi++) {
        const opt = q.options[oi]
        await pool.query(
          'INSERT INTO quiz_options (question_id, option_text, is_correct, order_index) VALUES (?, ?, ?, ?)',
          [questionId, opt.option_text, opt.is_correct ? 1 : 0, oi]
        )
      }
    }
    res.json({ ok: true, quiz_id: quizId })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save quiz' })
  }
})

// ── Quiz attempt routes ───────────────────────────────────

// Record a completed quiz attempt for the authenticated user.
// Looks up quiz_id from lesson_id so the client never needs to know it.
// Grade an attempt server-side. The client submits { answers: { [questionId]: optionId } }
// and receives the score plus the correct option per question (revealed only
// after submitting — the lesson GET never includes is_correct for students).
// Guests may take quizzes on free lessons; their attempts are graded but not recorded.
app.post('/api/lessons/:id/quiz/attempt', async (req, res) => {
  const lessonId = req.params.id
  const answers  = req.body.answers

  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return res.status(400).json({ error: 'answers (questionId -> optionId map) is required' })
  }

  try {
    let userId = null
    if (req.cookies.token) {
      try {
        const payload = await verifyJwtAndCheckRevocation(req.cookies.token)
        userId = payload.id
      } catch { /* treat as guest */ }
    }

    const [lessonRows] = await pool.query('SELECT is_free FROM lessons WHERE id = ?', [lessonId])
    if (lessonRows.length === 0) return res.status(404).json({ error: 'Lesson not found' })
    if (!userId && !lessonRows[0].is_free) {
      return res.status(401).json({ error: 'not_authenticated' })
    }

    const [quizRows] = await pool.query(
      'SELECT id, pass_percent FROM quizzes WHERE lesson_id = ?',
      [lessonId]
    )
    if (quizRows.length === 0) {
      return res.status(404).json({ error: 'No quiz found for this lesson' })
    }
    const quiz = quizRows[0]

    const [rows] = await pool.query(
      `SELECT qq.id AS question_id, qo.id AS option_id, qo.is_correct
         FROM quiz_questions qq
         JOIN quiz_options qo ON qo.question_id = qq.id
        WHERE qq.quiz_id = ?`,
      [quiz.id]
    )

    const correctByQuestion = {}
    for (const r of rows) {
      if (r.is_correct) correctByQuestion[r.question_id] = r.option_id
    }

    const questionIds = [...new Set(rows.map((r) => r.question_id))]
    const total = questionIds.length
    let score = 0
    for (const qid of questionIds) {
      if (Number(answers[qid]) === correctByQuestion[qid]) score++
    }
    const pct = total > 0 ? Math.round((score / total) * 100) : 0
    const passed = pct >= (quiz.pass_percent ?? 70)

    let attemptId = null
    if (userId) {
      const [result] = await pool.query(
        `INSERT INTO quiz_attempts (user_id, quiz_id, score, total, pct, passed)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, quiz.id, score, total, pct, passed ? 1 : 0]
      )
      attemptId = result.insertId
    }

    res.status(201).json({
      id:          attemptId,
      user_id:     userId,
      quiz_id:     quiz.id,
      score,
      total,
      pct,
      passed,
      correct_options: correctByQuestion,
      attempted_at: new Date().toISOString(),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save quiz attempt' })
  }
})

// Return all attempts by the authenticated user for a given lesson's quiz,
// newest first.  Used to populate the attempt history table in the UI.
app.get('/api/lessons/:id/quiz/attempts', requireAuth, async (req, res) => {
  const lessonId = req.params.id
  const userId   = req.user.id

  try {
    const [rows] = await pool.query(
      `SELECT qa.id, qa.score, qa.total, qa.pct, qa.passed, qa.attempted_at
         FROM quiz_attempts qa
         JOIN quizzes q ON q.id = qa.quiz_id
        WHERE q.lesson_id = ? AND qa.user_id = ?
        ORDER BY qa.attempted_at DESC`,
      [lessonId, userId]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch quiz attempts' })
  }
})

// ── Instructor routes ─────────────────────────────────────

function normalizeInstructor(row) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    designation: row.designation,
    bio: row.bio,
    photoUrl: row.photo_url,
    orderIndex: row.order_index,
  }
}

app.get('/api/instructors', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM instructors ORDER BY order_index ASC, id ASC')
    res.json(rows.map(normalizeInstructor))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch instructors' })
  }
})

app.get('/api/instructors/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM instructors WHERE slug = ?', [req.params.slug])
    if (rows.length === 0) return res.status(404).json({ error: 'Instructor not found' })
    const instructor = normalizeInstructor(rows[0])
    const [courses] = await pool.query(
      `SELECT id, title, slug, thumbnail_url, price, cadence, status
         FROM courses
        WHERE instructor_id = ? OR instructor_name = ?
        ORDER BY created_at DESC`,
      [rows[0].id, rows[0].name]
    )
    res.json({ ...instructor, courses })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch instructor' })
  }
})

app.post('/api/instructors', requireAdmin, async (req, res) => {
  const { name, designation, bio, photo_url, order_index } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const [result] = await pool.query(
      'INSERT INTO instructors (name, slug, designation, bio, photo_url, order_index) VALUES (?, ?, ?, ?, ?, ?)',
      [name, slugify(name), designation || null, bio || null, photo_url || null, order_index || 0]
    )
    const [rows] = await pool.query('SELECT * FROM instructors WHERE id = ?', [result.insertId])
    res.status(201).json(normalizeInstructor(rows[0]))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An instructor with this name already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to create instructor' })
  }
})

app.put('/api/instructors/:id', requireAdmin, async (req, res) => {
  const { name, designation, bio, photo_url, order_index } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  try {
    const [result] = await pool.query(
      'UPDATE instructors SET name = ?, slug = ?, designation = ?, bio = ?, photo_url = ?, order_index = ? WHERE id = ?',
      [name, slugify(name), designation || null, bio || null, photo_url || null, order_index || 0, req.params.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Instructor not found' })
    const [rows] = await pool.query('SELECT * FROM instructors WHERE id = ?', [req.params.id])
    res.json(normalizeInstructor(rows[0]))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An instructor with this name already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to update instructor' })
  }
})

app.delete('/api/instructors/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM instructors WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Instructor not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete instructor' })
  }
})

// ── Service routes ─────────────────────────────────────────

function normalizeService(row) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    body: row.body,
    thumbnailUrl: row.thumbnail_url,
    orderIndex: row.order_index,
    publishedAt: row.published_at,
  }
}

app.get('/api/services', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services ORDER BY order_index ASC, id ASC')
    res.json(rows.map(normalizeService))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch services' })
  }
})

app.get('/api/services/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM services WHERE slug = ?', [req.params.slug])
    if (rows.length === 0) return res.status(404).json({ error: 'Service not found' })
    res.json(normalizeService(rows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch service' })
  }
})

app.post('/api/services', requireAdmin, async (req, res) => {
  const { title, excerpt, body, thumbnail_url, order_index, published_at } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const [result] = await pool.query(
      'INSERT INTO services (title, slug, excerpt, body, thumbnail_url, order_index, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, slugify(title), excerpt || null, body || null, thumbnail_url || null, order_index || 0, published_at || null]
    )
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [result.insertId])
    res.status(201).json(normalizeService(rows[0]))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A service with this title already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to create service' })
  }
})

app.put('/api/services/:id', requireAdmin, async (req, res) => {
  const { title, excerpt, body, thumbnail_url, order_index, published_at } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const [result] = await pool.query(
      'UPDATE services SET title = ?, slug = ?, excerpt = ?, body = ?, thumbnail_url = ?, order_index = ?, published_at = ? WHERE id = ?',
      [title, slugify(title), excerpt || null, body || null, thumbnail_url || null, order_index || 0, published_at || null, req.params.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' })
    const [rows] = await pool.query('SELECT * FROM services WHERE id = ?', [req.params.id])
    res.json(normalizeService(rows[0]))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A service with this title already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to update service' })
  }
})

app.delete('/api/services/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM services WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Service not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete service' })
  }
})

// ── Page routes (legal / marketing) ───────────────────────

app.get('/api/pages/:slug', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT slug, title, content_html, updated_at FROM pages WHERE slug = ?', [req.params.slug])
    if (rows.length === 0) return res.status(404).json({ error: 'Page not found' })
    const row = rows[0]
    res.json({ slug: row.slug, title: row.title, contentHtml: row.content_html, updatedAt: row.updated_at })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch page' })
  }
})

app.get('/api/pages', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, slug, title, updated_at FROM pages ORDER BY title ASC')
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch pages' })
  }
})

app.put('/api/pages/:slug', requireAdmin, async (req, res) => {
  const { title, content_html } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  // Defense-in-depth: page HTML is rendered with dangerouslySetInnerHTML on the
  // client, so strip script tags and inline event handlers even for admin input.
  const safeHtml = content_html
    ? String(content_html)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*')/gi, '')
    : null
  try {
    await pool.query(
      `INSERT INTO pages (slug, title, content_html) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), content_html = VALUES(content_html)`,
      [req.params.slug, title, safeHtml]
    )
    const [rows] = await pool.query('SELECT slug, title, content_html, updated_at FROM pages WHERE slug = ?', [req.params.slug])
    const row = rows[0]
    res.json({ slug: row.slug, title: row.title, contentHtml: row.content_html, updatedAt: row.updated_at })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save page' })
  }
})

// ── Site content (admin-editable sections; defaults live client-side) ──

// Content values are structured JSON, never HTML: leaves must be plain
// strings/numbers/booleans, and link-ish keys must use safe URL schemes.
// The client renders every leaf as a React text node, so this stays XSS-inert.
const CONTENT_MAX_BYTES = 100 * 1024
const CONTENT_LINK_KEY = /(url|href|link|src|to)$/i
const CONTENT_SAFE_LINK = /^(https?:\/\/|\/|mailto:|tel:|#)/

function validateContentValue(value, path = '') {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return null
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const err = validateContentValue(value[i], `${path}[${i}]`)
      if (err) return err
    }
    return null
  }
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    for (const [key, v] of Object.entries(value)) {
      if (CONTENT_LINK_KEY.test(key) && typeof v === 'string' && v !== '' && !CONTENT_SAFE_LINK.test(v.trim())) {
        return `unsafe link value at ${path}.${key}`
      }
      const err = validateContentValue(v, path ? `${path}.${key}` : key)
      if (err) return err
    }
    return null
  }
  return `unsupported value type at ${path || 'root'}`
}

app.get('/api/content/:page', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT section_key, content_json FROM site_content WHERE page_slug = ?',
      [req.params.page]
    )
    const sections = {}
    for (const row of rows) {
      try {
        sections[row.section_key] = JSON.parse(row.content_json)
      } catch {
        // Skip a corrupt row rather than break the whole page.
        console.error(`Invalid content_json for ${req.params.page}/${row.section_key}`)
      }
    }
    res.json({ sections })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch content' })
  }
})

app.put('/api/content/:page/:key', requireAdmin, async (req, res) => {
  const { content } = req.body
  if (content === undefined || content === null || typeof content !== 'object') {
    return res.status(400).json({ error: 'content must be an object or array' })
  }
  const validationError = validateContentValue(content)
  if (validationError) return res.status(400).json({ error: validationError })
  const serialized = JSON.stringify(content)
  if (Buffer.byteLength(serialized, 'utf8') > CONTENT_MAX_BYTES) {
    return res.status(400).json({ error: 'content too large (max 100KB)' })
  }
  try {
    await pool.query(
      `INSERT INTO site_content (page_slug, section_key, content_json) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE content_json = VALUES(content_json)`,
      [req.params.page, req.params.key, serialized]
    )
    res.json({ page: req.params.page, key: req.params.key, content })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to save content' })
  }
})

app.delete('/api/content/:page/:key', requireAdmin, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM site_content WHERE page_slug = ? AND section_key = ?',
      [req.params.page, req.params.key]
    )
    res.status(204).end()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to reset content' })
  }
})

// Aggregate counts + recent activity for the admin dashboard widgets.
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
  try {
    const [[students]] = await pool.query('SELECT COUNT(*) AS n FROM auth_users')
    const [[enrollments]] = await pool.query('SELECT COUNT(*) AS n FROM enrollments')
    const [[courses]] = await pool.query("SELECT COUNT(*) AS n FROM courses WHERE status <> 'Hidden'")
    const [[articles]] = await pool.query('SELECT COUNT(*) AS n FROM articles')
    const [[instructors]] = await pool.query('SELECT COUNT(*) AS n FROM instructors')
    const [[services]] = await pool.query('SELECT COUNT(*) AS n FROM services')
    const [[messages]] = await pool.query('SELECT COUNT(*) AS n FROM contact_messages')
    const [[messagesWeek]] = await pool.query(
      'SELECT COUNT(*) AS n FROM contact_messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    )
    const [recentUsers] = await pool.query(
      'SELECT name, username, created_at FROM auth_users ORDER BY created_at DESC LIMIT 5'
    )
    const [recentMessages] = await pool.query(
      'SELECT name, email, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 5'
    )
    res.json({
      counts: {
        students: students.n,
        enrollments: enrollments.n,
        courses: courses.n,
        articles: articles.n,
        instructors: instructors.n,
        services: services.n,
        messages: messages.n,
        messagesThisWeek: messagesWeek.n,
      },
      recentUsers,
      recentMessages,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

// Admin image upload -> R2. Returns the public URL to use in content fields.
app.post('/api/upload', requireAdmin, uploadImage.single('file'), async (req, res) => {
  if (!r2) return res.status(501).json({ error: 'Uploads are not configured on this server.' })
  if (!req.file) return res.status(400).json({ error: 'No image file received (jpeg/png/webp/gif, max 5MB).' })
  try {
    const ext = UPLOAD_MIME_EXT[req.file.mimetype]
    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const base = path.basename(req.file.originalname || 'image', path.extname(req.file.originalname || ''))
      .toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'image'
    const key = `wp-content/uploads/${yyyy}/${mm}/${base}-${crypto.randomBytes(3).toString('hex')}.${ext}`
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
      CacheControl: 'public, max-age=31536000, immutable',
    }))
    // Absolute public URL: new uploads exist only in R2 (not in local public/),
    // so a relative path would 404 in dev where Vite serves static files.
    const url = MEDIA_BASE_URL ? `${MEDIA_BASE_URL.replace(/\/$/, '')}/${key}` : `/${key}`
    res.json({ url, key })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Upload failed.' })
  }
})

// ── Article admin CRUD ─────────────────────────────────────

app.post('/api/articles', requireAdmin, async (req, res) => {
  const { title, category, excerpt, image_url, youtube_url, read_time, published_at, content } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const [result] = await pool.query(
      `INSERT INTO articles (title, slug, category, excerpt, image_url, youtube_url, read_time, published_at, content_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, slugify(title), category || null, excerpt || null, image_url || null,
       youtube_url || null, read_time || null, published_at || null,
       JSON.stringify(Array.isArray(content) ? content : [])]
    )
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [result.insertId])
    res.status(201).json(normalizeArticle(rows[0], true))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An article with this title already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to create article' })
  }
})

app.put('/api/articles/:id', requireAdmin, async (req, res) => {
  const { title, category, excerpt, image_url, youtube_url, read_time, published_at, content } = req.body
  if (!title) return res.status(400).json({ error: 'title is required' })
  try {
    const [result] = await pool.query(
      `UPDATE articles SET title = ?, slug = ?, category = ?, excerpt = ?, image_url = ?,
              youtube_url = ?, read_time = ?, published_at = ?, content_json = ?
       WHERE id = ?`,
      [title, slugify(title), category || null, excerpt || null, image_url || null,
       youtube_url || null, read_time || null, published_at || null,
       JSON.stringify(Array.isArray(content) ? content : []), req.params.id]
    )
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Article not found' })
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [req.params.id])
    res.json(normalizeArticle(rows[0], true))
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An article with this title already exists' })
    console.error(err)
    res.status(500).json({ error: 'Failed to update article' })
  }
})

app.delete('/api/articles/:id', requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.query('DELETE FROM articles WHERE id = ?', [req.params.id])
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Article not found' })
    res.status(204).send()
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to delete article' })
  }
})

// ── Contact routes ─────────────────────────────────────────

const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many messages. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
})

app.post('/api/contact', contactLimiter, async (req, res) => {
  const name = String(req.body.name || '').trim()
  const email = normalizeEmail(String(req.body.email || ''))
  const message = String(req.body.message || '').trim()
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email and message are required.' })
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }
  if (message.length > 5000) {
    return res.status(400).json({ error: 'Message is too long (max 5000 characters).' })
  }
  try {
    await pool.query(
      'INSERT INTO contact_messages (name, email, message) VALUES (?, ?, ?)',
      [name.slice(0, 200), email.slice(0, 320), message]
    )
    sendContactNotificationEmail({ name, email, message }).catch(() => {})
    res.status(201).json({ ok: true, message: 'Thank you! We have received your message.' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send message. Please try again.' })
  }
})

app.get('/api/contact', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, message, source, created_at FROM contact_messages ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// ── Commerce (read-only history) routes ───────────────────

app.get('/api/me/orders', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT id, wp_order_id, status, total, currency, payment_method, created_at
         FROM orders WHERE user_id = ? OR billing_email = ?
        ORDER BY created_at DESC`,
      [req.user.id, req.user.email]
    )
    const ids = orders.map((o) => o.id)
    let itemsByOrder = {}
    if (ids.length) {
      const [items] = await pool.query(
        'SELECT order_id, name, quantity, total, course_id FROM order_items WHERE order_id IN (?)', [ids]
      )
      for (const it of items) {
        if (!itemsByOrder[it.order_id]) itemsByOrder[it.order_id] = []
        itemsByOrder[it.order_id].push(it)
      }
    }
    res.json(orders.map((o) => ({ ...o, items: itemsByOrder[o.id] || [] })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

app.get('/api/me/subscriptions', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.wp_subscription_id, s.status, s.total, s.billing_period,
              s.start_at, s.next_payment_at, c.title AS course_title, c.slug AS course_slug
         FROM subscriptions s
         LEFT JOIN courses c ON c.id = s.course_id
        WHERE s.user_id = ? OR s.billing_email = ?
        ORDER BY s.start_at DESC`,
      [req.user.id, req.user.email]
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

app.get('/api/orders', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT o.id, o.wp_order_id, o.status, o.total, o.currency, o.payment_method, o.created_at,
              o.billing_email, u.name AS user_name
         FROM orders o LEFT JOIN auth_users u ON u.id = o.user_id
        ORDER BY o.created_at DESC LIMIT 1000`
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

app.get('/api/subscriptions', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT s.id, s.wp_subscription_id, s.status, s.total, s.billing_period,
              s.start_at, s.next_payment_at, s.billing_email,
              u.name AS user_name, c.title AS course_title
         FROM subscriptions s
         LEFT JOIN auth_users u ON u.id = s.user_id
         LEFT JOIN courses c ON c.id = s.course_id
        ORDER BY s.start_at DESC LIMIT 1000`
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

app.get('/api/coupons', requireAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, code, discount_type, amount, usage_limit, usage_count, expires_at FROM coupons ORDER BY code ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to fetch coupons' })
  }
})

// ── Quran Mushaf reader (proxies Al Quran Cloud — see server/quran.js) ────
app.use('/api/quran', quranRouter)

// ── Production static hosting ─────────────────────────────
// Serves the Vite build (../dist) and falls back to index.html for any
// non-API route so client-side routing (React Router) works on refresh/deep
// links. Registered last so it never shadows an /api/* route above.
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '..', 'dist')
  app.use(express.static(distPath))
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'))
  })
}

const PORT = process.env.PORT || 3001

// ── Quiz attempts table + indexes + FKs ───────────────────

async function ensureQuizAttemptsSchema() {
  // 1. Create table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id           INT          AUTO_INCREMENT PRIMARY KEY,
      user_id      INT          NOT NULL,
      quiz_id      INT          NOT NULL,
      score        SMALLINT     UNSIGNED NOT NULL COMMENT 'correct answers',
      total        SMALLINT     UNSIGNED NOT NULL COMMENT 'total questions',
      pct          TINYINT      UNSIGNED NOT NULL COMMENT '0-100 percentage',
      passed       BOOLEAN      NOT NULL DEFAULT FALSE,
      attempted_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,

      -- Covering index for the most common query:
      --   "all attempts by <user> for <quiz>", ordered newest-first
      INDEX idx_qa_user_quiz_time (user_id, quiz_id, attempted_at),

      -- Supporting index for admin/analytics queries per quiz
      INDEX idx_qa_quiz_time (quiz_id, attempted_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // 2. Add foreign keys only when parent tables exist
  const [quizzesExists, usersExists] = await Promise.all([
    tableExists('quizzes'),
    tableExists('auth_users'),
  ])

  if (quizzesExists && usersExists) {
    await ensureForeignKey(
      'quiz_attempts',
      'fk_qa_user',
      `ALTER TABLE quiz_attempts
       ADD CONSTRAINT fk_qa_user
       FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE`
    )
    await ensureForeignKey(
      'quiz_attempts',
      'fk_qa_quiz',
      `ALTER TABLE quiz_attempts
       ADD CONSTRAINT fk_qa_quiz
       FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE`
    )
  } else {
    console.warn('Skipping quiz_attempts foreign keys: quizzes or auth_users table not yet present')
  }
}

async function ensureColumn(tableName, columnName, alterSql) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName]
  )
  if (rows[0].count === 0) {
    await pool.query(alterSql)
  }
}

async function ensureEnrollmentsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      user_id     INT NOT NULL,
      course_id   INT NOT NULL,
      granted_by  INT NULL COMMENT 'admin user id who granted access',
      granted_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY  uq_enrollment (user_id, course_id),
      INDEX       idx_enr_user   (user_id),
      INDEX       idx_enr_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  const [coursesExists, usersExists] = await Promise.all([
    tableExists('courses'),
    tableExists('auth_users'),
  ])

  if (coursesExists && usersExists) {
    await ensureForeignKey(
      'enrollments',
      'fk_enr_user',
      `ALTER TABLE enrollments
       ADD CONSTRAINT fk_enr_user
       FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE`
    )
    await ensureForeignKey(
      'enrollments',
      'fk_enr_course',
      `ALTER TABLE enrollments
       ADD CONSTRAINT fk_enr_course
       FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE`
    )
  } else {
    console.warn('Skipping enrollments foreign keys: courses or auth_users table not yet present')
  }
}

async function ensureAuthUsersSchema() {
  const authUsersExists = await tableExists('auth_users')
  if (!authUsersExists) return

  // Add username, first_name, last_name columns idempotently
  await ensureColumn(
    'auth_users',
    'username',
    'ALTER TABLE auth_users ADD COLUMN username VARCHAR(60) NULL AFTER name'
  )
  await ensureColumn(
    'auth_users',
    'first_name',
    'ALTER TABLE auth_users ADD COLUMN first_name VARCHAR(100) NULL AFTER username'
  )
  await ensureColumn(
    'auth_users',
    'last_name',
    'ALTER TABLE auth_users ADD COLUMN last_name VARCHAR(100) NULL AFTER first_name'
  )

  // Backfill username for existing rows: use email prefix, then resolve collisions
  const [needsBackfill] = await pool.query(
    'SELECT COUNT(*) AS count FROM auth_users WHERE username IS NULL'
  )
  if (needsBackfill[0].count > 0) {
    // First pass: set username to the part before @
    await pool.query(
      "UPDATE auth_users SET username = SUBSTRING_INDEX(email, '@', 1) WHERE username IS NULL"
    )
    // Resolve any duplicates by appending the row id
    await pool.query(`
      UPDATE auth_users a
      JOIN (
        SELECT id, username, COUNT(*) OVER (PARTITION BY username) AS cnt
        FROM auth_users
      ) dup ON a.id = dup.id
      SET a.username = CONCAT(dup.username, '_', a.id)
      WHERE dup.cnt > 1
    `)
  }

  // Unique index on username (safe to re-run: ensureIndex checks first)
  await ensureIndex(
    'auth_users',
    'uq_auth_users_username',
    'ALTER TABLE auth_users ADD UNIQUE KEY uq_auth_users_username (username)'
  )
}

async function ensurePasswordResetSchema() {
  // 1. Add password_changed_at to auth_users for session invalidation on reset
  const authUsersExists = await tableExists('auth_users')
  if (authUsersExists) {
    await ensureColumn(
      'auth_users',
      'password_changed_at',
      'ALTER TABLE auth_users ADD COLUMN password_changed_at TIMESTAMP NULL'
    )
  }

  // 2. Create password_reset_tokens table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id          INT          AUTO_INCREMENT PRIMARY KEY,
      user_id     INT          NOT NULL,
      token_hash  CHAR(64)     NOT NULL COMMENT 'SHA-256 hex of the raw token',
      expires_at  TIMESTAMP    NOT NULL,
      used_at     TIMESTAMP    NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY  uq_prt_token_hash (token_hash),
      INDEX       idx_prt_user    (user_id),
      INDEX       idx_prt_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // 3. Foreign key (only when auth_users is ready)
  if (authUsersExists) {
    await ensureForeignKey(
      'password_reset_tokens',
      'fk_prt_user',
      `ALTER TABLE password_reset_tokens
       ADD CONSTRAINT fk_prt_user
       FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE CASCADE`
    )
  }
}

// ── Instructors / services / pages content schema ─────────

async function ensureInstructorsSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS instructors (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      name          VARCHAR(160) NOT NULL,
      slug          VARCHAR(200) NOT NULL UNIQUE,
      designation   VARCHAR(200) NULL,
      bio           LONGTEXT NULL,
      photo_url     VARCHAR(500) NULL,
      order_index   INT NOT NULL DEFAULT 0,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Optional link from courses to a structured instructor (keeps instructor_name string).
  if (await tableExists('courses')) {
    // Allow a 'Hidden' status so placeholder/test courses can be excluded from the public site.
    const [statusCol] = await pool.query(
      `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'courses' AND COLUMN_NAME = 'status'`
    )
    if (statusCol.length && /enum/i.test(statusCol[0].COLUMN_TYPE) && !/hidden/i.test(statusCol[0].COLUMN_TYPE)) {
      await pool.query(
        "ALTER TABLE courses MODIFY COLUMN status ENUM('Online','Completed','Coming Soon','Hidden') DEFAULT 'Online'"
      )
    }
    await ensureColumn(
      'courses',
      'instructor_id',
      'ALTER TABLE courses ADD COLUMN instructor_id INT NULL AFTER instructor_name'
    )
    await ensureForeignKey(
      'courses',
      'fk_courses_instructor',
      `ALTER TABLE courses
       ADD CONSTRAINT fk_courses_instructor
       FOREIGN KEY (instructor_id) REFERENCES instructors(id) ON DELETE SET NULL`
    )
  }
}

async function ensureServicesSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      title         VARCHAR(255) NOT NULL,
      slug          VARCHAR(255) NOT NULL UNIQUE,
      body          LONGTEXT NULL,
      excerpt       TEXT NULL,
      thumbnail_url VARCHAR(500) NULL,
      order_index   INT NOT NULL DEFAULT 0,
      published_at  DATE NULL,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function ensurePagesSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      slug         VARCHAR(200) NOT NULL UNIQUE,
      title        VARCHAR(255) NOT NULL,
      content_html LONGTEXT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

// Admin-editable site content (hero slides, testimonials, page copy).
// Stores JSON overrides per (page, section); defaults live in the frontend
// registry (src/content/siteContent.js), so an empty table = stock site.
async function ensureSiteContentSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_content (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      page_slug    VARCHAR(100) NOT NULL,
      section_key  VARCHAR(100) NOT NULL,
      content_json LONGTEXT NOT NULL,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_site_content (page_slug, section_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

// ── Commerce schema (historical data; no live checkout) ───

async function ensureCommerceSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      wp_product_id  BIGINT NULL,
      course_id      INT NULL,
      name           VARCHAR(255) NOT NULL,
      price          DECIMAL(10,2) NOT NULL DEFAULT 0,
      type           ENUM('onetime','subscription') NOT NULL DEFAULT 'onetime',
      billing_period VARCHAR(40) NULL,
      created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_products_wp (wp_product_id),
      INDEX idx_products_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      wp_order_id    BIGINT NULL,
      user_id        INT NULL,
      billing_email  VARCHAR(320) NULL,
      status         VARCHAR(40) NOT NULL DEFAULT 'completed',
      total          DECIMAL(10,2) NOT NULL DEFAULT 0,
      currency       VARCHAR(10) NOT NULL DEFAULT 'USD',
      payment_method VARCHAR(120) NULL,
      created_at     DATETIME NULL,
      UNIQUE KEY uq_orders_wp (wp_order_id),
      INDEX idx_orders_user (user_id),
      INDEX idx_orders_email (billing_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS order_items (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      order_id    INT NOT NULL,
      product_id  INT NULL,
      course_id   INT NULL,
      name        VARCHAR(255) NULL,
      quantity    INT NOT NULL DEFAULT 1,
      total       DECIMAL(10,2) NOT NULL DEFAULT 0,
      INDEX idx_order_items_order (order_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      wp_subscription_id BIGINT NULL,
      user_id            INT NULL,
      billing_email      VARCHAR(320) NULL,
      course_id          INT NULL,
      product_id         INT NULL,
      status             VARCHAR(40) NOT NULL DEFAULT 'active',
      total              DECIMAL(10,2) NULL,
      billing_period     VARCHAR(40) NULL,
      start_at           DATETIME NULL,
      next_payment_at    DATETIME NULL,
      created_at         DATETIME NULL,
      UNIQUE KEY uq_subscriptions_wp (wp_subscription_id),
      INDEX idx_subscriptions_user (user_id),
      INDEX idx_subscriptions_email (billing_email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      wp_coupon_id  BIGINT NULL,
      code          VARCHAR(190) NOT NULL,
      discount_type VARCHAR(60) NULL,
      amount        DECIMAL(10,2) NOT NULL DEFAULT 0,
      usage_limit   INT NULL,
      usage_count   INT NOT NULL DEFAULT 0,
      expires_at    DATETIME NULL,
      created_at    DATETIME NULL,
      UNIQUE KEY uq_coupons_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)

  // Foreign keys only when parent tables are present.
  if (await tableExists('auth_users')) {
    await ensureForeignKey('orders', 'fk_orders_user',
      'ALTER TABLE orders ADD CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL')
    await ensureForeignKey('subscriptions', 'fk_subs_user',
      'ALTER TABLE subscriptions ADD CONSTRAINT fk_subs_user FOREIGN KEY (user_id) REFERENCES auth_users(id) ON DELETE SET NULL')
  }
  await ensureForeignKey('order_items', 'fk_order_items_order',
    'ALTER TABLE order_items ADD CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE')

  // Subscriptions can have far-future next-payment dates (beyond the TIMESTAMP 2038 limit),
  // so ensure these date columns are DATETIME on pre-existing tables.
  const datetimeCols = [
    ['orders', 'created_at'],
    ['subscriptions', 'start_at'],
    ['subscriptions', 'next_payment_at'],
    ['subscriptions', 'created_at'],
    ['coupons', 'expires_at'],
    ['coupons', 'created_at'],
  ]
  for (const [table, col] of datetimeCols) {
    const [rows] = await pool.query(
      `SELECT DATA_TYPE FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
      [table, col]
    )
    if (rows.length && rows[0].DATA_TYPE.toLowerCase() === 'timestamp') {
      await pool.query(`ALTER TABLE ${table} MODIFY COLUMN ${col} DATETIME NULL`)
    }
  }
}

async function ensureContactSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(200) NOT NULL,
      email      VARCHAR(320) NOT NULL,
      message    TEXT NOT NULL,
      source     VARCHAR(60) NOT NULL DEFAULT 'contact_form',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_contact_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `)
}

async function startServer() {
  try {
    await ensureLessonProgressTable()
    await ensureQuizAttemptsSchema()
    await ensurePasswordResetSchema()
    await ensureEnrollmentsSchema()
    await ensureAuthUsersSchema()
    await ensureInstructorsSchema()
    await ensureServicesSchema()
    await ensurePagesSchema()
    await ensureSiteContentSchema()
    await ensureCommerceSchema()
    await ensureContactSchema()
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
  } catch (err) {
    console.error('Failed to start server', err)
    process.exit(1)
  }
}

startServer()
