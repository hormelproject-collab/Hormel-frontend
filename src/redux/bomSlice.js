import {
  createSlice,
  createAsyncThunk,
  createEntityAdapter,
  createSelector,
} from "@reduxjs/toolkit";

/** ------------------ HELPERS ------------------ **/
const normalizeStatus = (status) => String(status ?? "").trim().toUpperCase();

const isInactiveStatus = (status) => {
  const s = normalizeStatus(status);
  return s === "INACTIVE" || s === "I";
};

const isActiveStatus = (status) => {
  const s = normalizeStatus(status);
  return s === "ACTIVE" || s === "A";
};

/** ------------------ THUNKS ------------------ **/
export const fetchItemMaster = createAsyncThunk(
  "bom/fetchItemMaster",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/bigquery/table/item-master-with-releaseflag");

      if (!res.ok) {
        return rejectWithValue(await res.text());
      }

      const data = await res.json();

     return (Array.isArray(data) ? data : []).map((row, index) => ({
  id:
    row.rec_id ??
    row.postgresql_rec_id ??
    row.item_id ??
    row.item ??
    `row-${index}`,
  item: row.item ?? row.item_id ?? "",
  desc: row.item_desc ?? row.item_description ?? "",
  status: row.item_status ?? row.status ?? "",
  itemReleaseFlag:
    row.item_releaseflag ??
    row.item_release_flag ??
    row.itemreleaseflag ??
    row.release_flag ??
    row.release ??
    "",
}));

    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch item master");
    }
  }
);

export const fetchLocationsByItems = createAsyncThunk(
  "bom/fetchLocationsByItems",
  async (itemIds = [], { rejectWithValue }) => {
    try {
      const normalizedItemIds = Array.isArray(itemIds)
        ? itemIds
          .map((x) => {
            if (typeof x === "string") return x;
            if (x && typeof x === "object") {
              return x.item ?? x.id ?? "";
            }
            return "";
          })
          .filter(Boolean)
        : [];

      const res = await fetch("/api/bigquery/table/locations-by-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemIds: normalizedItemIds }),
      });

      if (!res.ok) {
        return rejectWithValue(await res.text());
      }

      const result = await res.json();
      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

      // Deduplicate by location because UI is selecting locations
      const dedupMap = new Map();

      rows.forEach((row) => {
        const location = String(row.location ?? "").trim();
        if (!location) return;

        if (!dedupMap.has(location)) {
          dedupMap.set(location, {
            id: location,
            location,
            name: row.location_description ?? "",
            status: row.location_status ?? row.status ?? "",
            item: row.item ?? "",
          });
        }
      });

      return Array.from(dedupMap.values());
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch locations by items");
    }
  }
);

export const fetchLocationMaster = createAsyncThunk(
  "bom/fetchLocationMaster",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/tables/location_master"); // ✅ no limit

      if (!res.ok) {
        return rejectWithValue(await res.text());
      }

      const data = await res.json();

      return (Array.isArray(data) ? data : []).map((row, index) => ({
        id: row.rec_id ?? row.location ?? `loc-${index}`,
        location: String(row.location ?? ""),
        name: row.location_name ?? row.location_description ?? "",
        status: row.location_status ?? row.status ?? "",
        country: row.location_country ?? "",
        region: row.location_region ?? "",
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
  sortComparer: (a, b) => (a.location || "").localeCompare(b.location || ""),
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

      // locations by selected items
      .addCase(fetchLocationsByItems.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(fetchLocationsByItems.fulfilled, (state, action) => {
        state.locations.loading = false;
        locationsAdapter.setAll(state.locations, action.payload);
      })
      .addCase(fetchLocationsByItems.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.payload || "Failed to load locations";
      })

      // full location master
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
  (selected) => selected.some((x) => isInactiveStatus(x.status))
);

export const {
  selectAll: selectAllLocations,
  selectById: selectLocationById,
} = locationsAdapter.getSelectors((state) => state.bom.locations);

export const selectSelectedLocationIds = (state) =>
  state.bom.selectedLocationIds;

export const selectSelectedLocations = createSelector(
  [selectAllLocations, selectSelectedLocationIds],
  (all, ids) => all.filter((x) => ids.includes(x.id))
);

export const selectHasInactiveLocationsSelected = createSelector(
  [selectSelectedLocations],
  (selected) => selected.some((x) => !isActiveStatus(x.status))
);

export const selectItemsLoading = (state) => state.bom.items.loading;
export const selectItemsError = (state) => state.bom.items.error;
export const selectLocationsLoading = (state) => state.bom.locations.loading;
export const selectLocationsError = (state) => state.bom.locations.error;

export const selectCheckoutSummary = createSelector(
  [
    (state) => state.bom.selectedAction,
    selectSelectedProducedItems,
    selectSelectedLocations,
  ],
  (selectedAction, producedItems, locations) => ({
    selectedAction,
    producedItems,
    locations,
  })
);
