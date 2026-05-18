import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
} from "@reduxjs/toolkit";

/** ------------------ THUNKS ------------------ **/

export const fetchItemMaster = createAsyncThunk(
  "bom/fetchItemMaster",
  async (limit = 10, { rejectWithValue }) => {
    try {
      // ✅ use proxy path to avoid CORS
      const res = await fetch(`/api/bigquery/table/item_master?limit=${limit}`);
      if (!res.ok) return rejectWithValue(await res.text());

      const data = await res.json();
      return data.map((row) => ({
        id: row.rec_id,
        item: row.item,
        desc: row.item_desc,
        status: row.item_status, // "ACTIVE"/"INACTIVE"
      }));
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch item master");
    }
  }
);

export const fetchLocationMaster = createAsyncThunk(
  "bom/fetchLocationMaster",
  async (limit = 10, { rejectWithValue }) => {
    try {
      // ✅ use proxy path to avoid CORS
      const res = await fetch(
        `/api/bigquery/table/location_master?limit=${limit}`
      );
      if (!res.ok) return rejectWithValue(await res.text());

      const data = await res.json();

      // API sample has: rec_id, location, location_description, location_status ("A")
      return data.map((row) => ({
        id: row.rec_id,
        location: String(row.location), // "2266"
        name: row.location_description, // "2266-Jiaxing Hormel Foods..."
        status: row.location_status, // usually "A" for Active; handle others safely
        country: row.location_country,
        region: row.location_region,
      }));
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch location master");
    }
  }
);

/** ------------------ ADAPTERS ------------------ **/

const itemsAdapter = createEntityAdapter({
  selectId: (x) => x.id,
  sortComparer: (a, b) => (a.item || "").localeCompare(b.item || ""),
});

const locationsAdapter = createEntityAdapter({
  selectId: (x) => x.id,
  sortComparer: (a, b) =>
    (a.location || "").localeCompare(b.location || ""),
});

/** ------------------ SLICE ------------------ **/

const initialState = {
  selectedAction: null,

  items: itemsAdapter.getInitialState({
    loading: false,
    error: null,
  }),

  locations: locationsAdapter.getInitialState({
    loading: false,
    error: null,
  }),

  selectedProducedItemIds: [],
  selectedLocationIds: [],
};

const bomSlice = createSlice({
  name: "bom",
  initialState,
  reducers: {
    setAction: (state, action) => {
      state.selectedAction = action.payload;
    },

    toggleProducedItem: (state, action) => {
      const id = action.payload;
      const idx = state.selectedProducedItemIds.indexOf(id);
      if (idx >= 0) state.selectedProducedItemIds.splice(idx, 1);
      else state.selectedProducedItemIds.push(id);
    },

    clearProducedItems: (state) => {
      state.selectedProducedItemIds = [];
    },

    toggleLocation: (state, action) => {
      const id = action.payload;
      const idx = state.selectedLocationIds.indexOf(id);
      if (idx >= 0) state.selectedLocationIds.splice(idx, 1);
      else state.selectedLocationIds.push(id);
    },

    clearLocations: (state) => {
      state.selectedLocationIds = [];
    },
  },

  extraReducers: (builder) => {
    builder
      // items
      .addCase(fetchItemMaster.pending, (state) => {
        state.items.loading = true;
        state.items.error = null;
      })
      .addCase(fetchItemMaster.fulfilled, (state, action) => {
        state.items.loading = false;
        itemsAdapter.setAll(state.items, action.payload);
      })
      .addCase(fetchItemMaster.rejected, (state, action) => {
        state.items.loading = false;
        state.items.error = action.payload || "Failed to load items";
      })

      // locations
      .addCase(fetchLocationMaster.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(fetchLocationMaster.fulfilled, (state, action) => {
        state.locations.loading = false;
        locationsAdapter.setAll(state.locations, action.payload);
      })
      .addCase(fetchLocationMaster.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.payload || "Failed to load locations";
      });
  },
});

export const {
  setAction,
  toggleProducedItem,
  clearProducedItems,
  toggleLocation,
  clearLocations,
} = bomSlice.actions;

export default bomSlice.reducer;

/** ------------------ SELECTORS ------------------ **/

// item selectors
export const {
  selectAll: selectAllItemMaster,
  selectById: selectItemById,
} = itemsAdapter.getSelectors((state) => state.bom.items);

export const selectSelectedProducedItemIds = (state) =>
  state.bom.selectedProducedItemIds;

export const selectSelectedProducedItems = createSelector(
  [selectAllItemMaster, selectSelectedProducedItemIds],
  (all, ids) => all.filter((x) => ids.includes(x.id))
);

export const selectHasInactiveSelected = createSelector(
  [selectSelectedProducedItems],
  (selected) => selected.some((x) => x.status === "INACTIVE")
);

// location selectors
export const {
  selectAll: selectAllLocations,
  selectById: selectLocationById,
} = locationsAdapter.getSelectors((state) => state.bom.locations);

export const selectSelectedLocationIds = (state) => state.bom.selectedLocationIds;

export const selectSelectedLocations = createSelector(
  [selectAllLocations, selectSelectedLocationIds],
  (all, ids) => all.filter((x) => ids.includes(x.id))
);

// Treat "A" as Active, everything else as Inactive (safe)
export const selectHasInactiveLocationsSelected = createSelector(
  [selectSelectedLocations],
  (selected) => selected.some((x) => x.status !== "A")
);

export const selectItemsLoading = (state) => state.bom.items.loading;
export const selectItemsError = (state) => state.bom.items.error;

export const selectLocationsLoading = (state) => state.bom.locations.loading;
export const selectLocationsError = (state) => state.bom.locations.error;

// ✅ For your final checkout page later (everything in one selector)
export const selectCheckoutSummary = createSelector(
  [(state) => state.bom.selectedAction, selectSelectedProducedItems, selectSelectedLocations],
  (selectedAction, producedItems, locations) => ({
    selectedAction,
    producedItems,
    locations,
  })
);
