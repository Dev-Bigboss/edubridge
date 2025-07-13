import Link from "next/link";

export default function Cta1() {
  return (
    <section className="cta-area">
      <div className="container">
        <div className="row">
          <div className="col-12">
            <div className="cta__wrapper">
              <div className="section__title white-title">
                <h2 className="title tg-svg">
                  Ready to{" "}
                  <span className="position-relative">
                    <span
                      className="svg-icon"
                      id="svg-9"
                      data-svg-icon="assets/img/icons/title_shape.svg"
                    />
                    Teach
                  </span>{" "}
                  and Earn?
                </h2>
              </div>
              <div className="cta__desc">
                <p>
                  Join EduBridge and get connected with students across Nigeria
                  and beyond. Set your own rate, teach your way, and grow your
                  impact.
                </p>
              </div>
              <div className="tg-button-wrap justify-content-center justify-content-md-end">
                <Link
                  href="/signup?type=tutor"
                  className="btn white-btn tg-svg"
                >
                  <span className="text">Become a Tutor</span>
                  <span
                    className="svg-icon"
                    id="cta-btn"
                    data-svg-icon="assets/img/icons/btn-arrow.svg"
                  />
                </Link>
              </div>
              <img
                className="object"
                src="/assets/img/objects/cta_shape01.svg"
                style={{ left: 25, top: "-35px" }}
                alt="Object"
                data-aos="fade-down"
                data-aos-delay={400}
              />
              <img
                className="object"
                src="/assets/img/objects/cta_shape02.svg"
                style={{ right: "-20px", bottom: "-80px" }}
                alt="Object"
                data-aos="fade-up"
                data-aos-delay={400}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
