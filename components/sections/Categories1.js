import Link from "next/link";

export default function Categories1() {
  return (
    <section className="categories-area section-py-130">
      <div className="container">
        <div className="row align-items-center justify-content-center">
          <div className="col-xl-5 col-lg-8 col-md-10">
            <div className="categories__title-wrap text-center text-xl-start">
              <div className="section__title">
                <span className="sub-title">Subjects We Cover</span>
                <h2 className="title tg-svg">
                  Browse Tutors by{" "}
                  <span className="position-relative">
                    <span
                      className="svg-icon"
                      id="svg-5"
                      data-svg-icon="/assets/img/icons/title_shape.svg"
                    />
                    Category
                  </span>
                </h2>
              </div>
              <p>
                Find expert tutors across a wide range of subjects. Whether
                you're preparing for exams or need help with a tricky concept,
                we've got you covered.
              </p>
              <div className="tg-button-wrap justify-content-center justify-content-xl-start">
                <Link href="/tutors" className="btn btn-border tg-svg">
                  <span className="text">All Subjects</span>
                  <span
                    className="svg-icon"
                    id="svg-6"
                    data-svg-icon="/assets/img/icons/btn-arrow.svg"
                  />
                </Link>
              </div>
            </div>
          </div>
          <div className="col-xl-7 col-lg-9">
            <div className="categories__wrap">
              <div className="row justify-content-center row-cols-2 row-cols-md-3">
                {[
                  { icon: "flaticon-bars", name: "Business & Finance" },
                  { icon: "flaticon-atom", name: "Science" },
                  {
                    icon: "flaticon-programming-language",
                    name: "Tech & Coding",
                  },
                  { icon: "flaticon-graphic-design", name: "Creative Arts" },
                  {
                    icon: "flaticon-email-marketing",
                    name: "Language & Communication",
                  },
                  { icon: "flaticon-graduation-cap", name: "Exam Prep" },
                ].map((category, i) => (
                  <div className="col mb-4" key={i}>
                    <div className="categories__item">
                      <Link
                        href={`/tutors?subject=${encodeURIComponent(
                          category.name
                        )}`}
                      >
                        <i className={category.icon} />
                        <span className="name">{category.name}</span>
                        <span className="courses">Live Tutors</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="categories__shapes">
        <div className="categories__shapes-item rotateme">
          <img src="/assets/img/objects/categories_shape01.png" alt="shape" />
        </div>
        <div className="categories__shapes-item" data-aos="fade-up">
          <img src="/assets/img/objects/categories_shape02.png" alt="shape" />
        </div>
      </div>
    </section>
  );
}
