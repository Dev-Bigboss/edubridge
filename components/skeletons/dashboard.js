import PropTypes from "prop-types";

const SkeletonLoader = ({ type = "session", count = 2 }) => {
  if (type === "stats") {
    return (
      <div className="row g-3 mb-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="col-md-3 col-sm-6">
            <div className="bg-light rounded p-3 h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded mb-1"
                    style={{ height: 24, width: "50%" }}
                  ></div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded"
                    style={{ height: 14, width: "70%" }}
                  ></div>
                </div>
                <div
                  className="bg-secondary bg-opacity-25 rounded-circle"
                  style={{ width: 24, height: 24 }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === "wallet") {
    return (
      <>
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body d-flex justify-content-between align-items-center">
            <div>
              <div
                className="bg-secondary bg-opacity-25 rounded mb-1"
                style={{ height: 18, width: "40%" }}
              ></div>
              <div
                className="bg-secondary bg-opacity-25 rounded"
                style={{ height: 28, width: "60%" }}
              ></div>
            </div>
            <div
              className="bg-secondary bg-opacity-25 rounded"
              style={{ height: 30, width: "20%" }}
            ></div>
          </div>
        </div>
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-transparent border-bottom">
            <div
              className="bg-secondary bg-opacity-25 rounded"
              style={{ height: 20, width: "30%" }}
            ></div>
          </div>
          <div className="card-body p-0">
            <ul className="list-group list-group-flush">
              {Array.from({ length: count }).map((_, index) => (
                <li
                  key={index}
                  className="list-group-item d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div
                      className="bg-secondary bg-opacity-25 rounded mb-1"
                      style={{ height: 18, width: "50%" }}
                    ></div>
                    <div
                      className="bg-secondary bg-opacity-25 rounded"
                      style={{ height: 14, width: "30%" }}
                    ></div>
                  </div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded"
                    style={{ height: 20, width: "20%" }}
                  ></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </>
    );
  }

  if (type === "profile") {
    return (
      <div className="container">
        <div className="mb-4">
          <div
            className="bg-secondary bg-opacity-25 rounded mb-1"
            style={{ height: 28, width: "20%" }}
          ></div>
          <div
            className="bg-secondary bg-opacity-25 rounded"
            style={{ height: 16, width: "40%" }}
          ></div>
        </div>
        <div className="row g-4">
          <div className="col-md-4 text-center">
            <div
              className="bg-secondary bg-opacity-25 rounded-circle mb-3"
              style={{ width: 120, height: 120 }}
            ></div>
            <div
              className="bg-secondary bg-opacity-25 rounded"
              style={{ height: 30, width: "50%", margin: "0 auto" }}
            ></div>
          </div>
          <div className="col-md-8">
            <div className="row g-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="col-md-6">
                  <div
                    className="bg-secondary bg-opacity-25 rounded mb-1"
                    style={{ height: 16, width: "30%" }}
                  ></div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded"
                    style={{ height: 38, width: "100%" }}
                  ></div>
                </div>
              ))}
              <div className="col-12">
                <div
                  className="bg-secondary bg-opacity-25 rounded mb-1"
                  style={{ height: 16, width: "20%" }}
                ></div>
                <div
                  className="bg-secondary bg-opacity-25 rounded"
                  style={{ height: 80, width: "100%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "requests") {
    return (
      <div className="card border-0 shadow-sm mb-5">
        <div className="card-header bg-transparent">
          <div
            className="bg-secondary bg-opacity-25 rounded"
            style={{ height: 20, width: "30%" }}
          ></div>
        </div>
        <div className="card-body">
          <div className="row g-3">
            {Array.from({ length: count }).map((_, index) => (
              <div key={index} className="col-md-6">
                <div className="p-3 border rounded h-100">
                  <div
                    className="bg-secondary bg-opacity-25 rounded mb-1"
                    style={{ height: 18, width: "40%" }}
                  ></div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded mb-2"
                    style={{ height: 14, width: "60%" }}
                  ></div>
                  <div
                    className="bg-secondary bg-opacity-25 rounded mb-2"
                    style={{ height: 14, width: "80%" }}
                  ></div>
                  <div className="d-flex justify-content-between mb-3">
                    <div
                      className="bg-secondary bg-opacity-25 rounded"
                      style={{ height: 14, width: "30%" }}
                    ></div>
                    <div
                      className="bg-secondary bg-opacity-25 rounded"
                      style={{ height: 14, width: "30%" }}
                    ></div>
                  </div>
                  <div className="d-flex gap-2">
                    <div
                      className="bg-secondary bg-opacity-25 rounded"
                      style={{ height: 30, width: "20%" }}
                    ></div>
                    <div
                      className="bg-secondary bg-opacity-25 rounded"
                      style={{ height: 30, width: "20%" }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Session loader
  return (
    <div className="row g-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex align-items-center">
              <div
                className="rounded-circle me-3 bg-secondary bg-opacity-25"
                style={{ width: 42, height: 42 }}
              ></div>
              <div className="flex-grow-1">
                <div
                  className="bg-secondary bg-opacity-25 rounded mb-1"
                  style={{ height: 18, width: "60%" }}
                ></div>
                <div
                  className="bg-secondary bg-opacity-25 rounded"
                  style={{ height: 14, width: "80%" }}
                ></div>
              </div>
              <div
                className="bg-secondary bg-opacity-25 rounded"
                style={{ height: 30, width: "15%" }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

SkeletonLoader.propTypes = {
  type: PropTypes.oneOf(["stats", "session", "wallet", "profile"]),
  count: PropTypes.number,
};

export default SkeletonLoader;
