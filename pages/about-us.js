import CounterUp from "@/components/elements/CounterUp";
import Layout from "@/components/layout/Layout";
import Link from "next/link";
import tutors from "@/util/tutors";

export default function AboutUs() {
  return (
    <Layout headerStyle={3} footerStyle={1} breadcrumbTitle="About Us">
      <section className="about-area-two">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-6 col-lg-6">
              <div className="about__title-wrap">
                <div className="section__title">
                  <span className="sub-title">Who we are</span>
                  <h2 className="title tg-svg">
                    Connecting Students to{" "}
                    <span className="position-relative">
                      <span
                        className="svg-icon"
                        id="about-svg"
                        data-svg-icon="assets/img/icons/title_shape.svg"
                      />
                      Top-Rated Tutors
                    </span>{" "}
                    Across Nigeria
                  </h2>
                </div>
                <p className="fw-medium">
                  EduBridge is a platform that connects students with verified,
                  experienced tutors for live online learning tailored to their
                  needs.
                </p>
                <p>
                  Whether you're preparing for exams, learning a new subject, or
                  need academic support — EduBridge gives you access to quality
                  education, anytime, anywhere.
                </p>
                <div className="tg-button-wrap">
                  <Link href="/signup?type=student" className="btn tg-svg">
                    <span className="text">Find a Tutor</span>
                    <span
                      className="svg-icon"
                      data-svg-icon="assets/img/icons/btn-arrow.svg"
                    />
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-xl-6 col-lg-6">
              <div className="about__images-wrap">
                <img
                  src="/assets/img/others/about_img03.jpg"
                  alt="about"
                  className="img-fluid rounded-4 shadow"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mentors-area section-pt-120 section-pb-90">
        <div className="container">
          <div className="section__title-wrap mb-55">
            <div className="row align-items-center">
              <div className="col-md-8">
                <div className="section__title text-center text-md-start">
                  <span className="sub-title">Meet Our Tutors</span>
                  <h2 className="title tg-svg">
                    Featured{" "}
                    <span className="position-relative">
                      <span
                        className="svg-icon"
                        data-svg-icon="assets/img/icons/title_shape.svg"
                      />
                      Tutors
                    </span>
                  </h2>
                </div>
              </div>
              <div className="col-md-4 text-md-end text-center">
                <Link href="/instructors" className="btn btn-border tg-svg">
                  <span className="text">All Tutors</span>
                  <span
                    className="svg-icon"
                    data-svg-icon="assets/img/icons/btn-arrow.svg"
                  />
                </Link>
              </div>
            </div>
          </div>

          <div className="row justify-content-center">
            {tutors.map((tutor, index) => (
              <div className="col-xl-3 col-lg-4 col-sm-6" key={index}>
                <div className="mentors__item">
                  <div className="mentors__img">
                    <Link href="/instructor-details">
                      <img src={tutor.photo} alt={tutor.name} />
                    </Link>
                    <div className="mentors__social">
                      <Link
                        href={tutor.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <i className="fab fa-linkedin-in" />
                      </Link>
                    </div>
                  </div>
                  <div className="mentors__content text-center">
                    <h4 className="name mb-1">
                      <Link href="/instructor-details">{tutor.name}</Link>
                    </h4>
                    <span className="designation text-muted small">
                      {tutor.subjects}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-area-two position-relative">
        <div className="cta__bg" data-background="/assets/img/bg/cta_bg.jpg" />
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-8 col-lg-10 text-center">
              <div className="cta__content">
                <p>READY TO LEARN OR TEACH?</p>
                <h2 className="title">Join EduBridge and start today</h2>
                <div className="tg-button-wrap justify-content-center mt-3">
                  <Link
                    href="/signup?type=student"
                    className="btn btn-border tg-svg me-3"
                  >
                    <span className="text">Find a Tutor</span>
                  </Link>
                  <Link href="/signup?type=tutor" className="btn tg-svg">
                    <span className="text">Become a Tutor</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
