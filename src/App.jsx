// import './App.css'

import Dashboard from './homePage/Dashboard'
import { BrowserRouter, Routes, Route } from "react-router-dom";
import SelectLocation from './createBom/startFromScratch/SelectedLocation';
import ProducedItems from './createBom/startFromScratch/ProducedItems';
import SelectedLocation from './createBom/startFromScratch/SelectedLocation';
import ResourceComponentInfo from './createBom/startFromScratch/ResourceComponentInfo';
import CreateBOM from './createBom/CreateBOM';
import SelectExistingBOM from './createBom/startFromExisting/SelectExistingBOM';
import ModifyExistingBOM from './createBom/startFromExisting/ModifyExistingBOM';

function App() {

  return (
    <BrowserRouter>
      <Routes>
        {/* Home */}
        <Route path="/" element={<Dashboard />} />

        {/* CreateBOM */}
        <Route path="/create-bom" element={<CreateBOM />} />

        {/* start from scratch  */}
        <Route path="/produced-items" element={<ProducedItems />} />  {/* step 1 */}
        <Route path="/select-location" element={<SelectedLocation />} />{/* step 2 */}
        <Route path="/resource-component" element={<ResourceComponentInfo />} /> {/* step 3 */}

        {/* Start from Existing BOM*/}
        <Route path="/select-existing-bom" element={<SelectExistingBOM />} /> {/* step 1 */}
        <Route path="/modify-existing-bom/:id" element={<ModifyExistingBOM />} /> {/* step 2 */}


      </Routes>
    </BrowserRouter>
  );

}

export default App
