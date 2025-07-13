import Link from "next/link";
import TutorCard from "./TutorCard";
import tutors from "@/util/tutors";

export default function FeaturedTutors() {
  return (
    <section className="instructor-area section-pt-120 section-pb-70">
      <div className="container">
        {/* Section Title */}
        <div className="section__title-wrap">
          <div className="row align-items-center gap-4 gap-md-0">
            <div className="col-md-8">
              <div className="section__title text-center text-md-start">
                <span className="sub-title">Meet Your Next Mentor</span>
                <h2 className="title tg-svg">
                  Top{" "}
                  <span className="position-relative">
                    <span
                      className="svg-icon"
                      id="svg-8"
                      data-svg-icon="/assets/img/icons/title_shape.svg"
                    />
                    Tutors
                  </span>{" "}
                  on EduBridge
                </h2>
              </div>
            </div>
            <div className="col-md-4">
              <div className="tg-button-wrap justify-content-center justify-content-md-end">
                <Link href="/tutors" className="btn tg-svg">
                  <span className="text">All Tutors</span>
                  <span
                    className="svg-icon"
                    id="instructor-btn"
                    data-svg-icon="/assets/img/icons/btn-arrow.svg"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Tutor Grid */}
        <div className="row justify-content-center">
          {tutors.map((tutor) => (
            <div className="col-xl-3 col-lg-4 col-sm-6" key={tutor.id}>
              <TutorCard tutor={tutor} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
