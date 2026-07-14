import Card from "../createBom/startFromScratch/Card";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";

// Icons
import {
    FaPlus,
    FaEdit,
    FaTrash,
    FaChartLine,
    FaEye,
    FaDownload,
} from "react-icons/fa";

const Dashboard = () => {
    const selectedAction = useSelector((state) => state.bom.selectedAction);
    const navigate = useNavigate();
    const { accounts } = useMsal();

    const [lastFetchTime, setLastFetchTime] = useState(null);

    const userName =
        accounts?.[0]?.name ||
        accounts?.[0]?.username ||
        "Unknown User";

    const fetchLastFetchTime = async () => {
        try {
            const response = await fetch("/api/last-fetch-time");
            const data = await response.json();

            if (data.success) {
                setLastFetchTime(data.lastFetchTime);
            }
        } catch (error) {
            console.error("Failed to fetch last refresh time:", error);
        }
    };

    useEffect(() => {
        fetchLastFetchTime();
    }, []);

    return (
        <div style={styles.container}>
            <h1 style={styles.heading}>BOM Management System</h1>

            <p style={styles.subText}>Select an option to continue</p>

            <div style={styles.fetchTime}>
                Last Data Refresh:{" "}
                {lastFetchTime
                    ? new Date(lastFetchTime).toLocaleString()
                    : "Not Available"}
            </div>

            <div style={styles.grid}>
                <Card
                    title="Create BOM"
                    color="rgb(59,130,246)"
                    Icon={FaPlus}
                    onClick={() => navigate("/create-bom")}
                />

                <Card
                    title="Modify BOM"
                    color="rgb(34, 197, 94)"
                    Icon={FaEdit}
                    onClick={() => navigate("/modify-select-existing-bom")}
                />

                <Card
                    title="Delete BOM"
                    color="rgb(239, 68, 68)"
                    Icon={FaTrash}
                    onClick={() => navigate("/delete-bom-dashboard")}
                />

                <Card
                    title="Engineering Change Summary"
                    color="rgb(168, 85, 247)"
                    Icon={FaChartLine}
                    onClick={() => navigate("/change-log")}
                />

                <Card
                    title="View BOM Data"
                    color="rgb(99, 102, 241)"
                    Icon={FaEye}
                    onClick={() => navigate("/view-bom-data")}
                />

                <Card
                    title="Download BOM Data"
                    color="rgb(249, 115, 22)"
                    Icon={FaDownload}
                    onClick={() => navigate("/download-bom")}
                />
            </div>

            {selectedAction && (
                <p style={styles.selected}>
                    Selected Action: {selectedAction}
                </p>
            )}

            <div style={styles.loggedInUser}>
                Logged in as: <strong>{userName}</strong>
            </div>
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
        marginBottom: "8px",
    },
    fetchTime: {
        color: "#555",
        fontSize: "14px",
        fontWeight: "600",
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
    loggedInUser: {
        position: "fixed",
        bottom: "15px",
        right: "20px",
        backgroundColor: "#f5f5f5",
        padding: "10px 15px",
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
        fontSize: "14px",
        fontWeight: "500",
        zIndex: 1000,
    },
};

export default Dashboard;