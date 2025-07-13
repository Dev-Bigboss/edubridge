import Link from "next/link";

export default function Banner1() {
  return (
    <section
      className="banner-area banner-bg"
      data-background="/assets/img/banner/banner_bg.jpg"
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-6">
            <div className="banner__content">
              <img
                src="/assets/img/banner/bshape_01.png"
                alt="shape"
                className="shape alltuchtopdown"
              />
              <img
                src="/assets/img/banner/bshape_02.png"
                alt="shape"
                className="shape"
              />
              <span
                className="sub-title"
                data-aos="fade-right"
                data-aos-delay={200}
              >
                Learn. Connect. Grow.
              </span>
              <h3
                className="title tg-svg"
                data-aos="fade-right"
                data-aos-delay={400}
              >
                Connect with{" "}
                <span className="position-relative">
                  <span
                    className="svg-icon"
                    id="svg-2"
                    data-svg-icon="assets/img/icons/title_shape.svg"
                  />
                  Top Tutors
                </span>{" "}
                for Personalized Learning
              </h3>
              <p data-aos="fade-right" data-aos-delay={600}>
                EduBridge helps students find verified tutors for live,
                personalized sessions across various subjects. Join thousands
                already learning smarter.
              </p>
              <div
                className="banner__btn-wrap"
                data-aos="fade-right"
                data-aos-delay={800}
              >
                <div className="tg-button-wrap">
                  <Link href="/signup?type=student" className="btn tg-svg">
                    <span className="text">Find a Tutor</span>
                    <span
                      className="svg-icon"
                      id="svg-1"
                      data-svg-icon="assets/img/icons/btn-arrow.svg"
                    />
                  </Link>
                  <Link href="/signup?type=student" className="btn tg-svg ms-3">
                    <span className="text">Become a Tutor</span>
                    <span
                      className="svg-icon"
                      data-svg-icon="assets/img/icons/btn-arrow.svg"
                    />
                  </Link>
                </div>
                <div className="banner__phone">
                  <i className="flaticon-phone-call" />
                  <div className="number-info">
                    <span>Need help?</span>
                    <h6 className="number">
                      <Link href="tel:+2348000000000">+234 800 000 0000</Link>
                    </h6>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-6">
            <div className="banner__images">
              <img
                src="/assets/img/banner/banner_img.png"
                alt="EduBridge Students"
                className="main-img"
              />
              <img
                src="/assets/img/banner/bshape_03.png"
                alt="shape"
                className="shape"
                data-aos="fade-down-right"
                data-aos-delay={1200}
              />
              <img
                src="/assets/img/banner/bshape_04.png"
                alt="shape"
                className="shape"
                data-aos="fade-right"
                data-aos-delay={1200}
              />
              <img
                src="/assets/img/banner/bshape_05.png"
                alt="shape"
                className="shape"
                data-aos="fade-down-left"
                data-aos-delay={1200}
              />
              <div className="banner__fact">
                <div className="banner__fact-item">
                  <div className="icon">
                    <i className="flaticon-group" />
                  </div>
                  <div className="info">
                    <span>Student Community</span>
                    <h4 className="count">Growing Daily</h4>
                  </div>
                </div>
                <div className="banner__fact-item">
                  <div className="icon">
                    <i className="flaticon-graduation-cap" />
                  </div>
                  <div className="info">
                    <span>Tutor Network</span>
                    <h4 className="count">Handpicked Experts</h4>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
