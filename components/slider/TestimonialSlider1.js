import { useEffect, useRef, useState } from "react";
import Slider from "react-slick";

const settings1 = {
  slidesToShow: 1,
  slidesToScroll: 1,
  dots: false,
  arrows: false,
  fade: true,
  focusOnSelect: true,
};

const settings2 = {
  slidesToShow: 1,
  slidesToScroll: 1,
  arrows: false,
  dots: false,
  prevArrow: (
    <button type="button" className="slick-prev">
      <i className="flaticon-chevron"></i>
    </button>
  ),
  nextArrow: (
    <button type="button" className="slick-next">
      <i className="flaticon-chevron"></i>
    </button>
  ),
  appendArrows: ".testimonial__content-nav",
};
  

export default function TestimonialSlider1() {
  const [nav1, setNav1] = useState(null);
  const [nav2, setNav2] = useState(null);
  const slider1Ref = useRef(null);
  const slider2Ref = useRef(null);

  useEffect(() => {
    setNav1(slider1Ref.current);
    setNav2(slider2Ref.current);
  }, []);

  return (
    <>
      <div className="row align-items-xl-center">
        <div className="col-lg-5 col-md-7 col-sm-9">
          <div className="testimonial__image-wrapper position-relative">
            <Slider
              {...settings1}
              asNavFor={nav2}
              ref={slider1Ref}
              className="testimonial__image-active"
            >
              <div className="testimonial__image-item">
                <img src="/assets/img/others/testimonial01.jpg" alt="img" />
              </div>
              <div className="testimonial__image-item">
                <img src="/assets/img/others/testimonial02.jpg" alt="img" />
              </div>
            </Slider>
            <div className="testimonial__shapes">
              <img
                src="/assets/img/objects/testi_shape01.svg"
                alt="shape"
                data-aos="fade-up-left"
                data-aos-delay={300}
              />
              <img
                src="/assets/img/objects/testi_shape02.svg"
                alt="shape"
                data-aos="fade-up-right"
                data-aos-delay={300}
              />
              <img
                src="/assets/img/objects/testi_shape03.svg"
                alt="shape"
                className="rotateme"
              />
            </div>
          </div>
        </div>
        <div className="col-lg-7">
          <div className="testimonial__content-wrapper">
            <div className="section__title white-title mb-40">
              <h2 className="title tg-svg">
                What Our{" "}
                <span className="position-relative">
                  <span
                    className="svg-icon"
                    id="svg-7"
                    data-svg-icon="assets/img/icons/title_shape.svg"
                  />
                  Students
                </span>
                <br />
                Say About Us
              </h2>
            </div>
            <Slider
              {...settings2}
              asNavFor={nav1}
              ref={slider2Ref}
              slidesToShow={1}
              swipeToSlide={true}
              focusOnSelect={true}
              className="testimonial__content-active testimonial__content-nav"
            >
              <div className="testimonial__content-item">
                <div className="testimonial__content-icon">
                  <img src="/assets/img/icons/quote.png" alt="img" />
                </div>
                <p>
                  “EduBridge connected me with an amazing tutor who helped me
                  prepare for my WAEC Math exam. I actually enjoyed studying for
                  the first time.”
                </p>
                <div className="testimonial__content-avatar">
                  <h5 className="name">Chiamaka Okafor</h5>
                  <span className="designation">SS3 Student, Lagos</span>
                </div>
              </div>

              <div className="testimonial__content-item">
                <div className="testimonial__content-icon">
                  <img src="/assets/img/icons/quote.png" alt="img" />
                </div>
                <p>
                  “As a tutor on EduBridge, I get to choose my schedule and
                  teach subjects I love. The platform makes everything simple
                  and professional.”
                </p>
                <div className="testimonial__content-avatar">
                  <h5 className="name">Ahmed Bello</h5>
                  <span className="designation">
                    Tutor – Physics & Chemistry
                  </span>
                </div>
              </div>
            </Slider>
          </div>
        </div>
      </div>
    </>
  );
}
