import Card from "../createBom/startFromScratch/Card";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

// ✅ Import icons
import { FaPlus, FaEdit, FaTrash, FaChartLine, FaEye, FaDownload } from "react-icons/fa";

const Dashboard = () => {
    const selectedAction = useSelector((state) => state.bom.selectedAction);
    const navigate = useNavigate();

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>BOM Management System</h1>
            <p style={styles.subText}>Select an option to continue</p>

            <div style={styles.grid}>
                <Card
                    title="Create BOM"
                    color="rgb(59,130,246)"
                    Icon={FaPlus}
                    onClick={() => navigate("/create-bom")}
                />
                <Card title="Modify BOM" color="rgb(34, 197, 94)" Icon={FaEdit} onClick={() => navigate("/modify-select-existing-bom")} />
                <Card title="Delete BOM" color="rgb(239, 68, 68)" Icon={FaTrash} />
                <Card title="Engineering Change Summary" color="rgb(168, 85, 247)" Icon={FaChartLine} onClick={() => navigate("/change-log")} />
                <Card title="View BOM Data" color="rgb(99, 102, 241)" Icon={FaEye}  onClick={() => navigate("/view-bom-data")}/>
                <Card title="Download BOM Data" color="rgb(249, 115, 22)" Icon={FaDownload} onClick={() => navigate("/download-bom")} />
            </div>

            {selectedAction && (
                <p style={styles.selected}>
                    Selected Action: {selectedAction}
                </p>
            )}
        </div>
    );
};

const styles = {
    container: {
        textAlign: "center",
        padding: "40px",
    },
    heading: {
        fontSize: "32px",
        marginBottom: "10px",
    },
    subText: {
        color: "#666",
        marginBottom: "30px",
    },
    grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
        gap: "20px",
        maxWidth: "900px",
        margin: "auto",
    },
    selected: {
        marginTop: "20px",
        fontWeight: "bold",
    },
};

export default Dashboard;