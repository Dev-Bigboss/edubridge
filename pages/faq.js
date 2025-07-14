import Layout from "@/components/layout/Layout";
import { useState } from "react";

export default function Faq() {
  const [isActive, setIsActive] = useState(null);

  const handleToggle = (key) => {
    setIsActive((prev) => (prev === key ? null : key));
  };

  const faqs = [
    {
      question: "What is EduBridge?",
      answer:
        "EduBridge is an online platform that connects students with experienced tutors for live, personalized learning sessions across Nigeria.",
    },
    {
      question: "How do I become a tutor on EduBridge?",
      answer:
        "To become a tutor, simply sign up, complete your profile, set your availability, and upload an introductory video. Once approved, you can start teaching.",
    },
    {
      question: "How are students matched with tutors?",
      answer:
        "Students can browse tutors by subject, level, and availability. They can book directly with a tutor based on profile reviews, experience, and ratings.",
    },
    {
      question: "What subjects can I learn on EduBridge?",
      answer:
        "EduBridge offers a wide range of subjects including Math, English, Sciences, Coding, Business Studies, and more — from primary to postgraduate level.",
    },
    {
      question: "How do payments work on the platform?",
      answer:
        "Students pay securely via card before sessions. Tutors receive payments into their EduBridge wallets and can withdraw at any time.",
    },
    {
      question: "Can I schedule recurring classes?",
      answer:
        "Yes. You can schedule weekly sessions with your preferred tutor. Our system supports recurring bookings for flexible learning plans.",
    },
    {
      question: "Is there a mobile app for EduBridge?",
      answer:
        "Not yet — but our platform is fully optimized for mobile browsers, and an app is in development.",
    },
    {
      question: "How do I reset my password?",
      answer:
        "Click 'Forgot password?' on the login page and follow the email instructions to reset your password securely.",
    },
  ];

  return (
    <Layout headerStyle={3} footerStyle={1} breadcrumbTitle="FAQs">
      <section className="faq-area section-py-120">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-9 col-lg-10">
              <div className="faq-wrap">
                <h2 className="mb-4 text-center">Frequently Asked Questions</h2>
                <div className="accordion" id="faqAccordion">
                  {faqs.map((faq, index) => (
                    <div className="accordion-item" key={index}>
                      <h2 className="accordion-header">
                        <button
                          className={`accordion-button ${
                            isActive === index ? "" : "collapsed"
                          }`}
                          type="button"
                          onClick={() => handleToggle(index)}
                          aria-expanded={isActive === index}
                          aria-controls={`faq${index}`}
                        >
                          {faq.question}
                        </button>
                      </h2>
                      <div
                        id={`faq${index}`}
                        className={`accordion-collapse collapse ${
                          isActive === index ? "show" : ""
                        }`}
                        data-bs-parent="#faqAccordion"
                      >
                        <div className="accordion-body">{faq.answer}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
