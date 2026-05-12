import { PageHeader, PageHero, PageFooter } from './_shared'

const ASSET = 'https://talweehacademy.com/wp-content/uploads'

const instructors = [
  {
    name: 'Sheikh Omer Khurshid',
    image: `${ASSET}/2025/02/shomarkhurshid.webp`,
    bioHref: 'https://talweehacademy.com/instructor/sheikh-omer-khurshid/',
  },
  {
    name: 'Sheikh Hamza Aktas',
    image: `${ASSET}/2025/10/SheikhHamza.webp`,
    bioHref: 'https://talweehacademy.com/instructor/sheikh-hamza-aktas/',
  },
  {
    name: 'Mufti Mohammad Daud Khurshid',
    image: `${ASSET}/2025/11/mohammad_daud.webp`,
    bioHref: 'https://talweehacademy.com/instructor/mufti-mohammad-daud-khurshid/',
  },
  {
    name: 'Shaykh Farhan Ingar',
    image: `${ASSET}/2026/03/Shaykh-Farhan-Ingar.webp`,
    bioHref: 'https://talweehacademy.com/instructor/shaykh-farhan-ingar/',
  },
]

export default function InstructorsPage() {
  return (
    <div className="page-shell">
      <PageHeader />
      <main>
        <PageHero title="Instructors" />

        {/* Get to know your instructors */}
        <section className="instructors-intro">
          <div className="instructors-intro-inner">
            <h2>Get to know your instructors</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <p>
              Talweeh Academy stands as a beacon of knowledge, uniquely combining traditional wisdom
              with modern academic excellence. Our esteemed instructors possess a rich tapestry of
              experience, having earned Ijāzāt from respected traditional scholars while also holding
              degrees from prestigious universities worldwide. This dual foundation equips them to
              impart knowledge with depth and nuance.
            </p>
            <p>
              We take particular pride in our educators who have graduated from the blessed city of
              the Messenger, peace be upon him. Their firsthand experience in this sacred environment
              enriches their teachings and offers students a profound connection to both heritage and
              scholarship. At Talweeh Academy, we are dedicated to nurturing a vibrant learning
              community that honors tradition while embracing contemporary understanding, fostering a
              holistic educational experience for all.
            </p>
          </div>
        </section>

        {/* Our Instructors grid */}
        <section className="instructors-grid-section">
          <div className="instructors-grid-inner">
            <h2>Our Instructors</h2>
            <img src={`${ASSET}/2024/08/border3.svg`} alt="" />
            <div className="instructors-grid">
              {instructors.map((instructor) => (
                <article key={instructor.name} className="instructor-card-simple">
                  <div className="instructor-card-simple-photo">
                    <img src={instructor.image} alt={instructor.name} />
                  </div>
                  <h3>{instructor.name}</h3>
                  <a
                    className="read-bio-btn"
                    href={instructor.bioHref}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Read Bio
                  </a>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
      <PageFooter />
    </div>
  )
}
