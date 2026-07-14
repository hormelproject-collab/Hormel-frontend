import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./homePage/Dashboard";
import ProducedItems from "./createBom/startFromScratch/ProducedItems";
import SelectedLocation from "./createBom/startFromScratch/SelectedLocation";
import ResourceComponentInfo from "./createBom/startFromScratch/ResourceComponentInfo";
import CreateBOM from "./createBom/CreateBOM";
import SelectExistingBOM from "./createBom/startFromExisting/SelectExistingBOM";
import ModifyExistingBOM from "./createBom/startFromExisting/ModifyExistingBOM";
import EngineeringChangeLog from "./EngineeringChange/Engineeringlog";
import EngineeringChangeDetailModify from "./EngineeringChange/EngineeringChangesDetail_modify";
import DownloadBOM from "./DownloadBom/DownloadBomData";
import SummaryPage from "./createBom/Summary";
import CreateItemBOMRoutingRecord from "./createBom/AddItemBOMRoutingRecord/CreateItemBOMRoutingRecord";
import ModifySelectExistingBOM from "./modifyBom/ModifySelectExistingBOM";
import ModifyExistingBOMData from "./modifyBom/ModifyExistingBOMData";
import ModifyExistingBOMSummary from "./modifyBom/ModifyExistingBOMSummary";
import ReviewSummary from "./createBom/AddItemBOMRoutingRecord/ReviewSummary";
import DeleteBomHome from "./DeleteBOM/DeleteBOMDashboard";
import DeleteExistingBomStep1 from "./DeleteBOM/DeleteExistingBOM";
import DeleteBomSummaryStep2 from "./DeleteBOM/DeleteBOMSummary";
import DeleteExistingItemBomRoutingStep1 from "./DeleteBOM/DeleteExistingIBR";
import DeleteItemBomRoutingSummaryStep2 from "./DeleteBOM/DeleteExistingIBRSummary";
import EngineeringChangeDetailAdd from "./EngineeringChange/EngineeringChangesDetail_Add";
import EngineeringChangeDetailDeleteBOM from "./EngineeringChange/EngineeringChangesDetail_Delete";
import ViewBomData from "./ViewBomData/ViewBomData";

import ProtectedRoute from "./auth/ProtectedRoute";

const protect = (element) => (
    <ProtectedRoute>
        {element}
    </ProtectedRoute>
);

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={protect(<Dashboard />)} />

                <Route
                    path="/change-log"
                    element={protect(<EngineeringChangeLog />)}
                />
                <Route
                    path="/change-log/engineering-change-detail-add"
                    element={protect(<EngineeringChangeDetailAdd />)}
                />
                <Route
                    path="/change-log/engineering-change-detail-delete-bom"
                    element={protect(
                        <EngineeringChangeDetailDeleteBOM />
                    )}
                />
                <Route
                    path="/change-log/engineering-change-detail-modify"
                    element={protect(
                        <EngineeringChangeDetailModify />
                    )}
                />

                <Route
                    path="/download-bom"
                    element={protect(<DownloadBOM />)}
                />

                <Route
                    path="/create-bom"
                    element={protect(<CreateBOM />)}
                />

                <Route
                    path="/produced-items"
                    element={protect(<ProducedItems />)}
                />

                <Route
                    path="/select-location"
                    element={protect(<SelectedLocation />)}
                />

                <Route
                    path="/resource-component"
                    element={protect(<ResourceComponentInfo />)}
                />

                <Route
                    path="/summary"
                    element={protect(<SummaryPage />)}
                />

                <Route
                    path="/select-existing-bom"
                    element={protect(<SelectExistingBOM />)}
                />

                <Route
                    path="/modify-existing-bom/:id"
                    element={protect(<ModifyExistingBOM />)}
                />

                <Route
                    path="/create-item-bom-routing-record"
                    element={protect(
                        <CreateItemBOMRoutingRecord />
                    )}
                />

                <Route
                    path="/modify-select-existing-bom"
                    element={protect(<ModifySelectExistingBOM />)}
                />

                <Route
                    path="/modify-existing-bom-data/:id"
                    element={protect(<ModifyExistingBOMData />)}
                />

                <Route
                    path="/review-changes"
                    element={protect(
                        <ModifyExistingBOMSummary />
                    )}
                />

                <Route
                    path="/review-summary"
                    element={protect(<ReviewSummary />)}
                />

                <Route
                    path="/delete-bom-dashboard"
                    element={protect(<DeleteBomHome />)}
                />

                <Route
                    path="/delete-bom-dashboard/delete-existing-bom"
                    element={protect(
                        <DeleteExistingBomStep1 />
                    )}
                />

                <Route
                    path="/delete-bom-dashboard/delete-existing-bom/summary"
                    element={protect(
                        <DeleteBomSummaryStep2 />
                    )}
                />

                <Route
                    path="/delete-bom-dashboard/delete-existing-ibr"
                    element={protect(
                        <DeleteExistingItemBomRoutingStep1 />
                    )}
                />

                <Route
                    path="/delete-bom-dashboard/delete-existing-ibr/summary"
                    element={protect(
                        <DeleteItemBomRoutingSummaryStep2 />
                    )}
                />

                <Route
                    path="/view-bom-data"
                    element={protect(<ViewBomData />)}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;