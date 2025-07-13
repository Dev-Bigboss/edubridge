import Link from "next/link";
import MobileMenu from "../MobileMenu";

export default function Header1({ scroll, isMobileMenu, handleMobileMenu }) {
  return (
    <header>
      <div
        id="sticky-header"
        className={`tg-header__area transparent-header ${
          scroll ? "sticky-menu" : ""
        }`}
      >
        <div className="container custom-container">
          <div className="row">
            <div className="col-12">
              {/* Mobile Toggler */}
              <div className="mobile-nav-toggler" onClick={handleMobileMenu}>
                <i className="tg-flaticon-menu-1" />
              </div>

              {/* Desktop Header */}
              <div className="tgmenu__wrap">
                <nav className="tgmenu__nav">
                  {/* Logo */}
                  <div className="logo">
                    <Link href="/">
                      <img
                        src="/assets/img/logo/logo.png"
                        alt="EduBridge Logo"
                      />
                    </Link>
                  </div>

                  {/* Nav Menu */}
                  <div className="tgmenu__navbar-wrap tgmenu__main-menu d-none d-xl-flex">
                    <ul className="navigation">
                      <li className="active">
                        <Link href="/">Home</Link>
                      </li>
                      <li>
                        <Link href="/signup?type=student">Find a Tutor</Link>
                      </li>
                      <li>
                        <Link href="/signup?type=tutor">Become a Tutor</Link>
                      </li>
                      <li>
                        <Link href="/about-us">About</Link>
                      </li>
                      <li>
                        <Link href="/faq">FAQs</Link>
                      </li>
                      <li>
                        <Link href="/contact">Contact</Link>
                      </li>
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="tgmenu__action d-none d-md-block">
                    <ul className="list-wrap d-flex align-items-center gap-2">
                      <li>
                        <Link href="/login" className="btn btn-outline-light">
                          Log in
                        </Link>
                      </li>
                      <li>
                        <Link href="/signup" className="btn btn-primary">
                          Sign up
                        </Link>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>

              {/* Mobile Menu */}
              <div className="tgmobile__menu">
                <nav className="tgmobile__menu-box">
                  <div className="close-btn" onClick={handleMobileMenu}>
                    <i className="tg-flaticon-close-1" />
                  </div>
                  <div className="nav-logo">
                    <Link href="/">
                      <img
                        src="/assets/img/logo/logo.png"
                        alt="EduBridge Logo"
                      />
                    </Link>
                  </div>
                  <div className="tgmobile__menu-outer">
                    <ul className="navigation">
                      <li>
                        <Link href="/">Home</Link>
                      </li>
                      <li>
                        <Link href="/signup?type=student">Find a Tutor</Link>
                      </li>
                      <li>
                        <Link href="/signup?type=tutor">Become a Tutor</Link>
                      </li>
                      <li>
                        <Link href="/about-us">About</Link>
                      </li>
                      <li>
                        <Link href="/faq">FAQs</Link>
                      </li>
                      <li>
                        <Link href="/contact">Contact</Link>
                      </li>
                    </ul>
                  </div>
                  <div className="tgmenu__action mt-4">
                    <ul className="list-wrap">
                      <li>
                        <Link href="/login" className="btn">
                          Log in
                        </Link>
                      </li>
                      <li>
                        <Link href="/signup" className="btn">
                          Sign up
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="social-links mt-4">
                    <ul className="list-wrap">
                      <li>
                        <Link href="#">
                          <i className="fab fa-facebook-f" />
                        </Link>
                      </li>
                      <li>
                        <Link href="#">
                          <i className="fab fa-twitter" />
                        </Link>
                      </li>
                      <li>
                        <Link href="#">
                          <i className="fab fa-instagram" />
                        </Link>
                      </li>
                      <li>
                        <Link href="#">
                          <i className="fab fa-linkedin-in" />
                        </Link>
                      </li>
                      <li>
                        <Link href="#">
                          <i className="fab fa-youtube" />
                        </Link>
                      </li>
                    </ul>
                  </div>
                </nav>
              </div>
              <div
                className="tgmobile__menu-backdrop"
                onClick={handleMobileMenu}
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
