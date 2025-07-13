// components/TutorCard.tsx
import Link from "next/link";

export default function TutorCard({ tutor }) {
  return (
    <div className="instructor__item">
      <div className="instructor__img">
        <div
          className="instructor__shape"
          style={{ backgroundColor: "#E8EDFF", borderRadius: "135px 0 0 0" }}
        />
        <Link href={`/tutor/${tutor.id}`}>
          <img src={tutor.photo} alt={tutor.name} />
        </Link>
      </div>

      <div className="instructor__content">
        <div className="left">
          <span className="designation">{tutor.subjects.join(", ")}</span>
          <h4 className="name">
            <Link href={`/tutor/${tutor.id}`}>{tutor.name}</Link>
          </h4>
        </div>

        {tutor.linkedin && (
          <div className="right">
            <span className="share">
              <i className="flaticon-share" />
            </span>
            <ul className="social-list list-wrap">
              <li>
                <Link href={tutor.linkedin} target="_blank">
                  <i className="fab fa-linkedin-in" />
                </Link>
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
