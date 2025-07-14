import Link from "next/link";

export default function Footer1() {
  return (
    <footer
      className="footer-bg text-white"
      data-bg-color="var(--tg-common-color-dark)"
    >
      {/* Newsletter Section Inside Footer */}
      <div className="newsletter-footer-wrap py-60 mt-20 border-bottom border-secondary">
        <div className="container">
          <div className="row align-items-center justify-content-between g-4">
            <div className="col-lg-6">
              <h5 className="mb-2 text-white">
                Stay in the loop with EduBridge
              </h5>
              <p className="mb-0 text-white-50">
                Get notified when we launch new features, tutors or classes.
              </p>
            </div>
            <div className="col-lg-6">
              <form className="d-flex flex-wrap gap-2 justify-content-lg-end">
                <input
                  type="email"
                  required
                  className="form-control"
                  placeholder="Enter your email"
                  style={{ maxWidth: "300px" }}
                />
                <button className="btn btn-primary" type="submit">
                  Join Waitlist
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Main Content */}
      <div className="footer__top-wrap pt-60 pb-40">
        <div className="container">
          <div className="row gy-4">
            {/* Left */}
            <div className="col-xl-4 col-md-6">
              <div className="footer__about">
                <div className="footer__logo mb-3">
                  <Link href="/">
                    <img
                      src="/assets/img/logo/secondary_logo.png"
                      alt="EduBridge Logo"
                    />
                  </Link>
                </div>
                <p className="mb-3">
                  EduBridge connects students with top-rated tutors for
                  personalized online learning across Nigeria and beyond.
                </p>
                <p className="mb-1">
                  <strong>Abuja, Nigeria</strong>
                </p>
                <p className="mb-1">+234 800 000 0000</p>
                <div className="social-links mt-3">
                  <Link href="#">
                    <i className="fab fa-facebook-f me-3" />
                  </Link>
                  <Link href="#">
                    <i className="fab fa-twitter me-3" />
                  </Link>
                  <Link href="#">
                    <i className="fab fa-linkedin-in me-3" />
                  </Link>
                  <Link href="#">
                    <i className="fab fa-youtube" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Center */}
            <div className="col-xl-4 col-md-6">
              <h5 className="fw-bold mb-3">Quick Links</h5>
              <ul className="list-unstyled">
                <li>
                  <Link href="/about-us">About Us</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <Link href="/faq">FAQs</Link>
                </li>
                <li>
                  <Link href="/privacy">Privacy Policy</Link>
                </li>
                <li>
                  <Link href="/terms">Terms & Conditions</Link>
                </li>
              </ul>
            </div>

            {/* Right */}
            <div className="col-xl-4 col-md-6">
              <Link href="/signup?type=tutor" className="fw-bold mb-3">
                Become a Tutor
              </Link>
              <p className="mb-3">
                Join EduBridge and start earning by teaching students online at
                your own pace.
              </p>
              <Link
                href="/singup?type=tutor"
                className="btn btn-outline-light btn-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="py-3 border-top border-secondary">
        <div className="container d-flex flex-column flex-md-row justify-content-between text-center text-md-start">
          <p className="mb-2 mb-md-0">
            © {new Date().getFullYear()} EduBridge. All rights reserved.
          </p>
          <div>
            <Link href="/privacy" className="me-3">
              Privacy Policy
            </Link>
            <Link href="/terms">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
