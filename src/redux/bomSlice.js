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
  return (
    s === "ACTIVE" ||
    s === "A" ||
    s === "1" ||
    s === "Y" ||
    s === "TRUE"
  );
};

const makeComponentRow = () => ({
  id: `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  componentItem: "",
  description: "",
  standardUsage: "",
});

const makeCoProductRow = () => ({
  id: `coproduct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  coProductItem: "",
  description: "",
  qtyProduced: "",
});

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

export const fetchResourceComponentMetadata = createAsyncThunk(
  "bom/fetchResourceComponentMetadata",
  async ({ items = [], locations = [] } = {}, { rejectWithValue }) => {
    try {
      const normalizedItems = Array.isArray(items)
        ? items
            .map((x) => (typeof x === "string" ? x : x?.item ?? ""))
            .map((x) => String(x ?? "").trim())
            .filter(Boolean)
        : [];

      const normalizedLocations = Array.isArray(locations)
        ? locations
            .map((x) => {
              if (typeof x === "string") return x;
              if (x && typeof x === "object") return x.location ?? x.id ?? "";
              return "";
            })
            .map((x) => String(x ?? "").trim())
            .filter(Boolean)
        : [];

      const res = await fetch("/api/bigquery/table/resource-component-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: normalizedItems,
          locations: normalizedLocations,
        }),
      });

      if (!res.ok) {
        return rejectWithValue(await res.text());
      }

      const result = await res.json();
      const data = result?.data ?? {};

      const resourceOptionsRows = Array.isArray(data.resourceOptions)
        ? data.resourceOptions
        : [];

      /**
       * Backend now returns ALL resources globally:
       * [
       *   { resource, resource_relevancy }
       * ]
       *
       * So build a flat deduped list first.
       */
      const resourceOptions = [];
      const seenResources = new Set();

      resourceOptionsRows.forEach((row) => {
        const resource = String(row.resource ?? "").trim();
        if (!resource) return;

        const dedupKey = resource.toUpperCase();
        if (seenResources.has(dedupKey)) return;
        seenResources.add(dedupKey);

        resourceOptions.push({
          resource,
          resourceRelevancy: row.resource_relevancy ?? "",
        });
      });

      /**
       * Keep backward compatibility for existing Resource Component screen,
       * which likely expects resourceOptionsByKey[item__location].
       *
       * Since resources are now global, assign the SAME resource list
       * to every selected item + location combination.
       */
      const resourceOptionsByKey = {};

      normalizedItems.forEach((item) => {
        normalizedLocations.forEach((location) => {
          const key = `${item}__${location}`;
          resourceOptionsByKey[key] = resourceOptions;
        });
      });

      return {
        bomVersions: Array.isArray(data.bomVersions) ? data.bomVersions : [],
        itemOptions: Array.isArray(data.itemOptions) ? data.itemOptions : [],
        resourceOptions,
        resourceOptionsByKey,
      };
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to fetch resource component metadata"
      );
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
      const res = await fetch("/api/tables/location_master");

      if (!res.ok) {
        return rejectWithValue(await res.text());
      }

      const data = await res.json();

      return (Array.isArray(data) ? data : []).map((row, index) => ({
        id: row.rec_id ?? row.location ?? `loc-${index}`,
        location: String(row.location ?? ""),
        name: row.location_description ?? row.location_name ?? "",
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

  resourceMeta: {
    loading: false,
    error: null,
    bomVersions: [],
    itemOptions: [],
    resourceOptions: [],
    resourceOptionsByKey: {},
  },

  resourceComponentConfigs: {},
};

const bomSlice = createSlice({
  name: "bom",
  initialState,
  reducers: {
    setAction: (state, action) => {
      state.selectedAction = action.payload;
    },

    setResourceComponentConfig: (state, action) => {
      const { key, config } = action.payload || {};
      if (!key) return;

      const existing = state.resourceComponentConfigs[key] || {};
      state.resourceComponentConfigs[key] = {
        ...existing,
        ...config,
      };
    },

    ensureResourceComponentConfig: (state, action) => {
      const { key, item, location } = action.payload || {};
      if (!key) return;

      if (!state.resourceComponentConfigs[key]) {
        state.resourceComponentConfigs[key] = {
          item,
          location,
          resources: [],
          bomVersion: "PRIMARY",
          noComponentItems: false,
          producedCoProduct: true,
          replicateToAll: false,
          components: [makeComponentRow()],
          coproducts: [makeCoProductRow()],
        };
      }
    },

    replicateResourceComponentInfoToLocations: (state, action) => {
      const { sourceKey, targetKeys = [] } = action.payload || {};
      if (!sourceKey || !state.resourceComponentConfigs[sourceKey]) return;

      const source = state.resourceComponentConfigs[sourceKey];

      targetKeys.forEach((targetKey) => {
        const existing = state.resourceComponentConfigs[targetKey] || {};
        state.resourceComponentConfigs[targetKey] = {
          ...existing,
          item: existing.item ?? source.item,
          location: existing.location ?? source.location,
          resources: [...(source.resources || [])],
          bomVersion: source.bomVersion || "PRIMARY",
          noComponentItems: !!source.noComponentItems,
          producedCoProduct: !!source.producedCoProduct,
          replicateToAll: !!source.replicateToAll,
          components: (source.components || []).map((row) => ({ ...row })),
          coproducts: (source.coproducts || []).map((row) => ({ ...row })),
        };
      });
    },

    clearResourceComponentConfigs: (state) => {
      state.resourceComponentConfigs = {};
    },

    toggleProducedItem: (state, action) => {
      const id = action.payload;
      const idx = state.selectedProducedItemIds.indexOf(id);
      if (idx >= 0) state.selectedProducedItemIds.splice(idx, 1);
      else state.selectedProducedItemIds.push(id);
    },

    clearProducedItems: (state) => {
      state.selectedProducedItemIds = [];
      state.resourceComponentConfigs = {};
    },

    toggleLocation: (state, action) => {
      const id = action.payload;
      const idx = state.selectedLocationIds.indexOf(id);
      if (idx >= 0) state.selectedLocationIds.splice(idx, 1);
      else state.selectedLocationIds.push(id);
    },

    clearLocations: (state) => {
      state.selectedLocationIds = [];
      state.resourceComponentConfigs = {};
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

      // step 3 metadata
      .addCase(fetchResourceComponentMetadata.pending, (state) => {
        state.resourceMeta.loading = true;
        state.resourceMeta.error = null;
      })
      .addCase(fetchResourceComponentMetadata.fulfilled, (state, action) => {
        state.resourceMeta.loading = false;
        state.resourceMeta.bomVersions = action.payload.bomVersions || [];
        state.resourceMeta.itemOptions = action.payload.itemOptions || [];
        state.resourceMeta.resourceOptions = action.payload.resourceOptions || [];
        state.resourceMeta.resourceOptionsByKey =
          action.payload.resourceOptionsByKey || {};
      })
      .addCase(fetchResourceComponentMetadata.rejected, (state, action) => {
        state.resourceMeta.loading = false;
        state.resourceMeta.error =
          action.payload || "Failed to load resource component metadata";
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
  setResourceComponentConfig,
  ensureResourceComponentConfig,
  replicateResourceComponentInfoToLocations,
  clearResourceComponentConfigs,
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

export const selectResourceMetaLoading = (state) =>
  state.bom.resourceMeta.loading;
export const selectResourceMetaError = (state) =>
  state.bom.resourceMeta.error;
export const selectBomVersions = (state) => state.bom.resourceMeta.bomVersions;
export const selectResourceItemOptions = (state) =>
  state.bom.resourceMeta.itemOptions;
export const selectAllResourceOptions = (state) =>
  state.bom.resourceMeta.resourceOptions;
export const selectResourceOptionsByKey = (state) =>
  state.bom.resourceMeta.resourceOptionsByKey;
export const selectResourceComponentConfigs = (state) =>
  state.bom.resourceComponentConfigs;

export const selectCheckoutSummary = createSelector(
  [
    (state) => state.bom.selectedAction,
    selectSelectedProducedItems,
    selectSelectedLocations,
    selectResourceComponentConfigs,
  ],
  (selectedAction, producedItems, locations, resourceComponentConfigs) => ({
    selectedAction,
    producedItems,
    locations,
    resourceComponentConfigs,
  })
);