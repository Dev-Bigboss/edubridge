import React from "react";
import { Loader2 } from "lucide-react";



const Loader = ({ text = "Loading...", size = 20 }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        justifyContent: "center",
        padding: "12px",
      }}
    >
      <Loader2
        size={size}
        className="animate-spin"
        style={{ color: "#4B5563" }}
      />
      {text && (
        <span style={{ fontSize: "14px", color: "#4B5563" }}>{text}</span>
      )}
    </div>
  );
};

export default Loader;
