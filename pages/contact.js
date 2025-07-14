import Layout from "@/components/layout/Layout";
import Link from "next/link";

export default function Contact() {
  return (
    <Layout headerStyle={3} footerStyle={1} breadcrumbTitle="Contact Us">
      <section className="contact-area section-py-120">
        <div className="container">
          <div className="row g-5">
            {/* Contact Info */}
            <div className="col-lg-5">
              <div className="contact-info-wrap">
                <h2 className="title mb-3">Let's Talk</h2>
                <p className="text-muted">
                  Whether you’re a student, tutor, parent or partner — we’re
                  here to help you succeed.
                </p>
                <ul className="list-wrap mt-4">
                  <li className="d-flex mb-3">
                    <div className="icon me-3">
                      <i className="flaticon-pin-1" />
                    </div>
                    <div>
                      <p className="mb-0">EduBridge HQ, Akobo, Ibadan, Nigeria</p>
                    </div>
                  </li>
                  <li className="d-flex mb-3">
                    <div className="icon me-3">
                      <i className="flaticon-phone-call" />
                    </div>
                    <div>
                      <Link href="tel:+2347012345678">+234 701 234 5678</Link>
                    </div>
                  </li>
                  <li className="d-flex">
                    <div className="icon me-3">
                      <i className="flaticon-email" />
                    </div>
                    <div>
                      <Link href="mailto:support@edubridge.ng">
                        support@edubridge.ng
                      </Link>
                    </div>
                  </li>
                </ul>
              </div>
            </div>

            {/* Contact Form */}
            <div className="col-lg-7">
              <div className="contact-form-wrap">
                <h4 className="title mb-3">Send Us a Message</h4>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    alert("Message sent! (This is a demo placeholder)");
                  }}
                >
                  <div className="row g-3">
                    <div className="col-md-6">
                      <input
                        name="name"
                        type="text"
                        className="form-control"
                        placeholder="Full Name *"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        name="email"
                        type="email"
                        className="form-control"
                        placeholder="Email Address *"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        name="phone"
                        type="tel"
                        className="form-control"
                        placeholder="Phone (optional)"
                      />
                    </div>
                    <div className="col-md-6">
                      <input
                        name="subject"
                        type="text"
                        className="form-control"
                        placeholder="Subject *"
                        required
                      />
                    </div>
                    <div className="col-12">
                      <textarea
                        name="message"
                        rows={5}
                        className="form-control"
                        placeholder="Your message..."
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn mt-4">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Map */}
      <div className="contact-map">
        <iframe
          title="EduBridge Map"
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1983.9762321507814!2d3.3792053!3d6.5095057!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x103b8dd5a3c11f6d%3A0x11a2e0a99e0b13f!2sYaba%2C%20Lagos!5e0!3m2!1sen!2sng!4v1689572097817!5m2!1sen!2sng"
          style={{ border: 0, width: "100%", height: "400px" }}
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </Layout>
  );
}
