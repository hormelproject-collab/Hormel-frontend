import { useDispatch } from "react-redux";
import { setAction } from "../redux/bomSlice";


const Card = ({ title, color, Icon, onClick }) => {
  return (
    <div style={styles.outerCard}>
      <div
        style={{
          ...styles.innerCard,
          backgroundColor: color,
        }}
        onClick={onClick}
      >
        <div style={styles.circle}>
          {Icon && <Icon size={28} color="white" />}
        </div>
        <h3 style={styles.text}>{title}</h3>
      </div>
    </div>
  );
};


const styles = {
  outerCard: {
    background: "#f5f5f5",
    padding: "15px",
    borderRadius: "10px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  },
  innerCard: {
    height: "150px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    cursor: "pointer",
  },
  circle: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "white",
    fontWeight: "600",
  },
};

export default Card;