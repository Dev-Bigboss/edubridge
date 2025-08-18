import PropTypes from "prop-types";

const Spinner = ({ size = "md", className = "" }) => {
  const sizeStyles = {
    sm: "spinner-border-sm",
    md: "",
    lg: "spinner-border-lg",
  };

  return (
    <div
      className={`spinner-border ${sizeStyles[size]} text-primary ${className}`}
      role="status"
    >
      <span className="visually-hidden">Loading...</span>
    </div>
  );
};

Spinner.propTypes = {
  size: PropTypes.oneOf(["sm", "md", "lg"]),
  className: PropTypes.string,
};

export default Spinner;
