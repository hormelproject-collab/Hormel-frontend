import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setAction } from "../redux/bomSlice";

const CreateBOM = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();

    return (
        <div style={styles.container}>
            
            <div style={styles.back} onClick={() => navigate("/")}>
                ← BACK TO MAIN MENU
            </div>

            <h1 style={styles.heading}>Create BOM</h1>
            <p style={styles.subText}>
                Choose how you would like to create a BOM
            </p>

            <div style={styles.cardContainer}>



                <div
                    style={styles.optionCard}
                    onClick={() => navigate("/produced-items")}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e5e7eb")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#f9f9f9")}
                >
                    <h3>Start from Scratch</h3>
                    <p>Create a new BOM from the beginning</p>
                </div>




                <div
                    style={styles.optionCard}
                    onClick={() => navigate("/select-existing-bom")}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e5e7eb")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f9f9f9")
                    }
                    >

                    <h3>Start from Existing BOM</h3>
                    <p>Copy and modify an existing BOM</p>
                </div>


                <div
                    style={styles.optionCard}
                    onClick={() => navigate("/create-item-bom-routing-record")}
                    onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#e5e7eb")
                    }
                    onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#f9f9f9")
                    }
                >

                    <h3>Add Item BOM Routing Record</h3>
                    <p>Add routing record to existing BOM</p>
                </div>
            </div>
        </div>
    );
};

export default CreateBOM;

const styles = {
    container: {
        padding: "40px",
        textAlign: "center",
    },
    back: {
        textAlign: "left",
        color: "rgb(37, 99, 235)",
        cursor: "pointer",
        marginBottom: "20px",
        fontWeight: "500",
    },
    heading: {
        fontSize: "28px",
        marginBottom: "10px",
    },
    subText: {
        color: "#666",
        marginBottom: "30px",
    },
    cardContainer: {
        maxWidth: "800px",
        margin: "auto",
        display: "flex",
        flexDirection: "column",
        gap: "20px",
    },
    optionCard: {
        background: "#f9f9f9",
        padding: "20px",
        borderRadius: "8px",
        textAlign: "left",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
        cursor: "pointer",
        transition: "0.2s",
    },
};