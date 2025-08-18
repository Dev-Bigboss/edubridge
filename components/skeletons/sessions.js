import PropTypes from "prop-types";

const SkeletonLoader = ({ count = 2 }) => {
  return (
    <div className="row g-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="col-md-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body d-flex flex-column">
              <div className="d-flex align-items-center mb-3">
                <div
                  className="rounded-circle me-3 bg-light"
                  style={{ width: 50, height: 50 }}
                ></div>
                <div className="flex-grow-1">
                  <div
                    className="bg-light rounded mb-1"
                    style={{ height: 20, width: "60%" }}
                  ></div>
                  <div
                    className="bg-light rounded"
                    style={{ height: 14, width: "40%" }}
                  ></div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-6">
                  <div
                    className="bg-light rounded"
                    style={{ height: 14, width: "80%" }}
                  ></div>
                </div>
                <div className="col-6">
                  <div
                    className="bg-light rounded"
                    style={{ height: 14, width: "80%" }}
                  ></div>
                </div>
              </div>
              <div className="d-flex justify-content-between align-items-center">
                <div
                  className="bg-light rounded"
                  style={{ height: 20, width: "30%" }}
                ></div>
                <div
                  className="bg-light rounded"
                  style={{ height: 30, width: "20%" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

SkeletonLoader.propTypes = {
  count: PropTypes.number,
};

export default SkeletonLoader;
