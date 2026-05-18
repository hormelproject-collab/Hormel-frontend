import { configureStore } from "@reduxjs/toolkit";
import bomReducer from "../redux/bomSlice";

export const store = configureStore({
  reducer: {
    bom: bomReducer,
  },
});