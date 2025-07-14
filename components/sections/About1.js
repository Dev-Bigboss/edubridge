import Link from "next/link";

export default function About1() {
  return (
    <section className="about-area tg-motion-effects section-py-120">
      <div className="container">
        <div className="row align-items-center justify-content-center">
          <div className="col-xl-6 col-lg-8">
            <div className="about__images">
              <img
                className="small-img tg-motion-effects3"
                src="/assets/img/others/about_img02.png"
                alt="EduBridge student"
              />
              <img
                className="big-img"
                src="/assets/img/others/about_img01.png"
                alt="EduBridge tutor"
              />
              <div className="about__exp">
                <svg
                  width={126}
                  height={108}
                  viewBox="0 0 126 108"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M0 10C0 4.47715 4.47715 0 10 0H110.996C116.321 0 120.713 4.17312 120.983 9.4914L125.429 96.7793C125.733 102.754 120.758 107.657 114.789 107.267L9.34719 100.369C4.08901 100.025 0 95.6593 0 90.3899V10Z"
                    fill="currentcolor"
                  />
                </svg>
                <h4 className="year">1+</h4>
                <p>Years Empowering Learning</p>
              </div>
              <img
                src="/assets/img/others/about_dots.svg"
                alt="svg"
                className="dots tg-motion-effects2"
              />
              <svg
                className="circle tg-motion-effects1"
                width={344}
                height={344}
                viewBox="0 0 344 344"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x={20}
                  y={20}
                  width={304}
                  height={304}
                  rx={152}
                  stroke="currentcolor"
                  strokeWidth={40}
                />
              </svg>
            </div>
          </div>
          <div className="col-xl-6 col-lg-7">
            <div className="about__content">
              <div className="section__title">
                <span className="sub-title">About EduBridge</span>
                <h2 className="title tg-svg">
                  Empowering Students with{" "}
                  <span className="position-relative">
                    <span
                      className="svg-icon"
                      id="svg-3"
                      data-svg-icon="assets/img/icons/title_shape.svg"
                    />
                    Trusted Tutors
                  </span>
                </h2>
              </div>
              <p className="desc">
                EduBridge connects learners with experienced tutors for live
                one-on-one sessions across academic and professional subjects.
                With verified tutors, smart matching, and seamless scheduling,
                students get personalized support exactly when they need it.
              </p>
              <ul className="about__info-list list-wrap">
                <li className="about__info-list-item">
                  <div className="icon">
                    <i className="flaticon-support" />
                  </div>
                  <p className="content">
                    Growing <br /> Tutor Network
                  </p>
                </li>
                <li className="about__info-list-item">
                  <div className="icon">
                    <i className="flaticon-file" />
                  </div>
                  <p className="content">
                    Live <br /> One-on-One Sessions
                  </p>
                </li>
                <li className="about__info-list-item">
                  <div className="icon">
                    <i className="flaticon-graduation-cap" />
                  </div>
                  <p className="content">
                    Open to <br /> All Learners
                  </p>
                </li>
                <li className="about__info-list-item">
                  <div className="icon">
                    <i className="flaticon-video-player" />
                  </div>
                  <p className="content">
                    Dozens of <br /> Subjects & Tracks
                  </p>
                </li>
              </ul>

              <div className="tg-button-wrap">
                <Link href="/about" className="btn tg-svg">
                  <span className="text">How It Works</span>
                  <span
                    className="svg-icon"
                    id="about-btn"
                    data-svg-icon="assets/img/icons/btn-arrow.svg"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
