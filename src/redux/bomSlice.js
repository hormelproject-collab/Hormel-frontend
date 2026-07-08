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
  return s === "ACTIVE" || s === "A" || s === "1" || s === "Y" || s === "TRUE";
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

const defaultPagination = {
  page: 1,
  pageSize: 50,
  total: 0,
  totalPages: 1,
  hasPrev: false,
  hasNext: false,
};

const defaultExistingBomSearchState = {
  loading: false,
  error: null,
  rows: [],
  selectedRowId: "",
  selectedRowIds: [],
  selectedRowsById: {},
  searchBy1: "resource",
  searchBy2: "location",
  query1: "",
  query2: "",
  pagination: defaultPagination,
};

const defaultEngineeringChangeLogState = {
  loading: false,
  error: null,
  rows: [],
  pagination: defaultPagination,
};

const defaultExistingItemBomRoutingSearchState = {
  loading: false,
  error: null,
  rows: [],
  searchBy1: "bomId",
  searchBy2: "item",
  query1: "",
  query2: "",
  pagination: defaultPagination,
  selectedRowIds: [],
  selectedRowsById: {},
};

const normalizeExistingBomSearchRow = (row, index) => {
  const location = String(row.location ?? "").trim();
  const producedItem = String(row.produced_item ?? row.item ?? "").trim();
  const producedItemDesc = String(
    row.produced_item_desc ?? row.item_description ?? row.item_desc ?? ""
  ).trim();
  const bomId = String(row.bom_id ?? row.bomId ?? "").trim();
  const resource = String(row.resource ?? "").trim();
  const routingId = String(row.routing_id ?? row.routingId ?? "").trim();
  const itemReleaseFlag = String(
    row.item_release_flag ??
      row.item_releaseflag ??
      row.release_flag ??
      row.release ??
      ""
  ).trim();
  const erpCoProductAssociation = String(
    row.erp_co_product_association ??
      row.erpCoProductAssociation ??
      row.co_product_association ??
      ""
  ).trim();

  return {
    id: row.id ?? `${bomId}__${routingId || resource || producedItem || "NORESOURCE"}__${index}`,
    location,
    produced_item: producedItem,
    produced_item_desc: producedItemDesc,
    bom_id: bomId,
    resource,
    routing_id: routingId,
    item_release_flag: itemReleaseFlag,
    erp_co_product_association: erpCoProductAssociation,
    __raw: row,
  };
};

const normalizeExistingItemBomRoutingSearchRow = (row, index) => {
  const recId = String(row.rec_id ?? row.recId ?? "").trim();
  const item = String(row.item ?? row.Item ?? "").trim();
  const bomId = String(row.bom_id ?? row.bomId ?? "").trim();
  const routingId = String(row.routing_id ?? row.routingId ?? "").trim();
  const location = String(row.location ?? "").trim();
  const resource = String(row.resource ?? "").trim();
  const erpCoProductAssociation = String(
    row.erp_co_product_association ??
      row.erpCoProductAssociation ??
      row.co_product_association ??
      ""
  ).trim();
  const coProductAssociation = Number(erpCoProductAssociation || "0") >= 1 ? 1 : 0;
  const componentItem = coProductAssociation === 1 ? "" : item;
  const coProductItem = coProductAssociation === 1 ? item : "";

  return {
    id: recId || `${bomId}__${routingId}__${item}__${index}`,
    rec_id: recId,
    item,
    bom_id: bomId,
    routing_id: routingId,
    location,
    resource,
    erp_co_product_association: erpCoProductAssociation,
    co_product_association: coProductAssociation,
    component_item: componentItem,
    co_product_item: coProductItem,
    __raw: row,
  };
};


/** ------------------ THUNKS ------------------ **/
export const fetchItemMaster = createAsyncThunk(
  "bom/fetchItemMaster",
  async (
    { page = 1, pageSize = 50, search = "", filterBy = "item" } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("filterBy", String(filterBy || "item"));
      params.set("search", String(search || "").trim());

      const res = await fetch(
        `/api/bigquery/table/item-master-with-releaseflag?${params.toString()}`
      );

      if (!res.ok) return rejectWithValue(await res.text());

      const payload = await res.json();
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      return {
        rows: rows.map((row, index) => ({
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
        })),
        pagination: payload?.pagination || {
          ...defaultPagination,
          page,
          pageSize,
          total: rows.length,
        },
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch item master");
    }
  }
);

export const fetchExistingBomSearchRows = createAsyncThunk(
  "bom/fetchExistingBomSearchRows",
  async (
    {
      page = 1,
      pageSize = 50,
      searchBy1 = "resource",
      query1 = "",
      searchBy2 = "location",
      query2 = "",
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("searchBy1", String(searchBy1 || ""));
      params.set("query1", String(query1 || "").trim());
      params.set("searchBy2", String(searchBy2 || ""));
      params.set("query2", String(query2 || "").trim());

      const res = await fetch(`/api/tables/existing-bom-search?${params.toString()}`);

      if (!res.ok) return rejectWithValue(await res.text());

      const payload = await res.json();
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      return {
        rows: rows.map((row, index) => normalizeExistingBomSearchRow(row, index)),
        pagination: payload?.pagination || {
          ...defaultPagination,
          page,
          pageSize,
          total: rows.length,
        },
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch existing BOM records");
    }
  }
);


export const fetchExistingItemBomRoutingSearchRows = createAsyncThunk(
  "bom/fetchExistingItemBomRoutingSearchRows",
  async (
    {
      page = 1,
      pageSize = 50,
      searchBy1 = "bomId",
      query1 = "",
      searchBy2 = "item",
      query2 = "",
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));
      params.set("searchBy1", String(searchBy1 || ""));
      params.set("query1", String(query1 || "").trim());
      params.set("searchBy2", String(searchBy2 || ""));
      params.set("query2", String(query2 || "").trim());

      const res = await fetch(
        `/api/tables/existing-item-bom-routing-search?${params.toString()}`
      );
      if (!res.ok) return rejectWithValue(await res.text());

      const payload = await res.json();
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : [];

      return {
        rows: rows.map((row, index) =>
          normalizeExistingItemBomRoutingSearchRow(row, index)
        ),
        pagination: payload?.pagination || {
          ...defaultPagination,
          page,
          pageSize,
          total: rows.length,
        },
      };
    } catch (e) {
      return rejectWithValue(
        e?.message || "Failed to fetch existing item BOM routing records"
      );
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: normalizedItems, locations: normalizedLocations }),
      });

      if (!res.ok) return rejectWithValue(await res.text());

      const result = await res.json();
      const data = result?.data ?? {};
      const resourceOptionsRows = Array.isArray(data.resourceOptions) ? data.resourceOptions : [];

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
          resourceRelevancy: row.resource_relevancy ?? row.resourceRelevancy ?? "",
        });
      });

      const resourceOptionsByKey = {};
      normalizedItems.forEach((item) => {
        normalizedLocations.forEach((location) => {
          resourceOptionsByKey[`${item}__${location}`] = resourceOptions;
        });
      });

      return {
        bomVersions: Array.isArray(data.bomVersions) ? data.bomVersions : [],
        itemOptions: Array.isArray(data.itemOptions) ? data.itemOptions : [],
        resourceOptions,
        resourceOptionsByKey,
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch resource component metadata");
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
              if (x && typeof x === "object") return x.item ?? x.id ?? "";
              return "";
            })
            .filter(Boolean)
        : [];

      const res = await fetch("/api/bigquery/table/locations-by-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: normalizedItemIds }),
      });

      if (!res.ok) return rejectWithValue(await res.text());

      const result = await res.json();
      const rows = Array.isArray(result?.data)
        ? result.data
        : Array.isArray(result)
          ? result
          : [];

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
          });
        }
      });

      return Array.from(dedupMap.values());
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch locations by items");
    }
  }
);

export const fetchEngineeringChangeLogRows = createAsyncThunk(
  "bom/fetchEngineeringChangeLogRows",
  async ({ page = 1, pageSize = 50 } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("pageSize", String(pageSize));

      const res = await fetch(`/api/tables/engineering-change-log?${params.toString()}`);
      if (!res.ok) return rejectWithValue(await res.text());

      const payload = await res.json();
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload?.result)
            ? payload.result
            : Array.isArray(payload)
              ? payload
              : [];

      return {
        rows,
        pagination: payload?.pagination || {
          ...defaultPagination,
          page,
          pageSize,
          total: rows.length,
          totalPages: Math.max(1, Math.ceil(rows.length / pageSize)),
          hasPrev: page > 1,
          hasNext: false,
        },
      };
    } catch (e) {
      return rejectWithValue(e?.message || "Failed to fetch engineering change log");
    }
  }
);

export const fetchLocationMaster = createAsyncThunk(
  "bom/fetchLocationMaster",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch("/api/tables/location_master");
      if (!res.ok) return rejectWithValue(await res.text());

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
  modifySelectState: {
    searchBy1: "",
    searchBy2: "",
    query1: "",
    query2: "",
    rows: [],
    selectedRecord: null,
  },
  modifyExistingBomState: {
    record: null,
    componentItems: [],
    initialComponentItems: [],
    coProducts: [],
    initialCoProducts: [],
    producedCoProduct: false,
  },
  items: itemsAdapter.getInitialState({
    loading: false,
    error: null,
    pagination: defaultPagination,
  }),
  locations: locationsAdapter.getInitialState({
    loading: false,
    error: null,
    pagination: defaultPagination,
    search: "",
  }),
  existingBomSearch: defaultExistingBomSearchState,
  existingItemBomRoutingSearch: defaultExistingItemBomRoutingSearchState,
  engineeringChangeLog: defaultEngineeringChangeLogState,
  selectedProducedItemIds: [],
  selectedProducedItemById: {},
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
    setExistingBomSearchState: (state, action) => {
      const payload = action.payload || {};
      state.existingBomSearch = {
        ...state.existingBomSearch,
        ...payload,
        pagination: {
          ...state.existingBomSearch.pagination,
          ...(payload.pagination || {}),
        },
      };
    },
    clearExistingBomSearchState: (state) => {
      state.existingBomSearch = defaultExistingBomSearchState;
    },
    toggleExistingBomSelectedRow: (state, action) => {
      const row = action.payload;
      const id = row && typeof row === "object" ? row.id : row;
      if (!id) return;

      const selectedIds = state.existingBomSearch.selectedRowIds;
      const existingIndex = selectedIds.indexOf(id);

      if (existingIndex >= 0) {
        selectedIds.splice(existingIndex, 1);
        delete state.existingBomSearch.selectedRowsById[id];
      } else {
        selectedIds.push(id);
        if (row && typeof row === "object") {
          state.existingBomSearch.selectedRowsById[id] = row;
        }
      }
    },
    toggleExistingBomSelectedPageRows: (state, action) => {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      const selectedIds = state.existingBomSearch.selectedRowIds;
      const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

      if (allSelected) {
        rows.forEach((row) => {
          const index = selectedIds.indexOf(row.id);
          if (index >= 0) selectedIds.splice(index, 1);
          delete state.existingBomSearch.selectedRowsById[row.id];
        });
        return;
      }

      rows.forEach((row) => {
        if (!row?.id) return;
        if (!selectedIds.includes(row.id)) selectedIds.push(row.id);
        state.existingBomSearch.selectedRowsById[row.id] = row;
      });
    },
    clearExistingBomSelectedRows: (state) => {
      state.existingBomSearch.selectedRowIds = [];
      state.existingBomSearch.selectedRowsById = {};
    },

    setExistingItemBomRoutingSearchState: (state, action) => {
      const payload = action.payload || {};
      state.existingItemBomRoutingSearch = {
        ...state.existingItemBomRoutingSearch,
        ...payload,
        pagination: {
          ...state.existingItemBomRoutingSearch.pagination,
          ...(payload.pagination || {}),
        },
      };
    },
    clearExistingItemBomRoutingSearchState: (state) => {
      state.existingItemBomRoutingSearch = defaultExistingItemBomRoutingSearchState;
    },
    setEngineeringChangeLogState: (state, action) => {
      const payload = action.payload || {};
      state.engineeringChangeLog = {
        ...state.engineeringChangeLog,
        ...payload,
        pagination: {
          ...state.engineeringChangeLog.pagination,
          ...(payload.pagination || {}),
        },
      };
    },
    toggleExistingIbrSelectedRow: (state, action) => {
      const row = action.payload;
      const id = row && typeof row === "object" ? row.id : row;
      if (!id) return;
      const selectedIds = state.existingItemBomRoutingSearch.selectedRowIds;
      const existingIndex = selectedIds.indexOf(id);
      if (existingIndex >= 0) {
        selectedIds.splice(existingIndex, 1);
        delete state.existingItemBomRoutingSearch.selectedRowsById[id];
      } else {
        selectedIds.push(id);
        if (row && typeof row === "object") {
          state.existingItemBomRoutingSearch.selectedRowsById[id] = row;
        }
      }
    },
    toggleExistingIbrSelectedPageRows: (state, action) => {
      const rows = Array.isArray(action.payload) ? action.payload : [];
      const selectedIds = state.existingItemBomRoutingSearch.selectedRowIds;
      const allSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));
      if (allSelected) {
        rows.forEach((row) => {
          const index = selectedIds.indexOf(row.id);
          if (index >= 0) selectedIds.splice(index, 1);
          delete state.existingItemBomRoutingSearch.selectedRowsById[row.id];
        });
        return;
      }
      rows.forEach((row) => {
        if (!row?.id) return;
        if (!selectedIds.includes(row.id)) selectedIds.push(row.id);
        state.existingItemBomRoutingSearch.selectedRowsById[row.id] = row;
      });
    },
    clearExistingIbrSelectedRows: (state) => {
      state.existingItemBomRoutingSearch.selectedRowIds = [];
      state.existingItemBomRoutingSearch.selectedRowsById = {};
    },
    setLocationsSearch: (state, action) => {
      state.locations.search = String(action.payload ?? "");
      state.locations.pagination.page = 1;
    },
    setLocationsPagination: (state, action) => {
      state.locations.pagination = {
        ...state.locations.pagination,
        ...(action.payload || {}),
      };
    },
    setResourceComponentConfig: (state, action) => {
      const { key, config } = action.payload || {};
      if (!key) return;
      const existing = state.resourceComponentConfigs[key] || {};
      state.resourceComponentConfigs[key] = { ...existing, ...config };
    },
    setModifySelectState: (state, action) => {
      state.modifySelectState = { ...state.modifySelectState, ...(action.payload || {}) };
    },
    clearModifySelectState: (state) => {
      state.modifySelectState = {
        searchBy1: "",
        searchBy2: "",
        query1: "",
        query2: "",
        rows: [],
        selectedRecord: null,
      };
    },
    setModifyExistingBomState: (state, action) => {
      state.modifyExistingBomState = {
        ...state.modifyExistingBomState,
        ...(action.payload || {}),
      };
    },
    clearModifyExistingBomState: (state) => {
      state.modifyExistingBomState = {
        record: null,
        componentItems: [],
        initialComponentItems: [],
        coProducts: [],
        initialCoProducts: [],
        producedCoProduct: false,
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
      const payload = action.payload;
      const row = payload && typeof payload === "object" ? payload : null;
      const id = row?.id ?? payload;
      if (!id) return;

      const idx = state.selectedProducedItemIds.indexOf(id);
      if (idx >= 0) {
        state.selectedProducedItemIds.splice(idx, 1);
        delete state.selectedProducedItemById[id];
      } else {
        state.selectedProducedItemIds.push(id);
        if (row) {
          state.selectedProducedItemById[id] = row;
        } else {
          const existing = state.items.entities[id];
          if (existing) state.selectedProducedItemById[id] = existing;
        }
      }
    },
    clearProducedItems: (state) => {
      state.selectedProducedItemIds = [];
      state.selectedProducedItemById = {};
      state.resourceComponentConfigs = {};
      state.selectedLocationIds = [];
      locationsAdapter.removeAll(state.locations);
      state.locations.search = "";
      state.locations.pagination = defaultPagination;
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
      locationsAdapter.removeAll(state.locations);
      state.locations.error = null;
      state.locations.search = "";
      state.locations.pagination = defaultPagination;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchItemMaster.pending, (state) => {
        state.items.loading = true;
        state.items.error = null;
      })
      .addCase(fetchItemMaster.fulfilled, (state, action) => {
        state.items.loading = false;
        itemsAdapter.setAll(state.items, action.payload?.rows || []);
        state.items.pagination = action.payload?.pagination || {
          ...defaultPagination,
          total: action.payload?.rows?.length || 0,
        };
      })
      .addCase(fetchItemMaster.rejected, (state, action) => {
        state.items.loading = false;
        state.items.error = action.payload || "Failed to load items";
      })
      .addCase(fetchExistingBomSearchRows.pending, (state) => {
        state.existingBomSearch.loading = true;
        state.existingBomSearch.error = null;
      })
      .addCase(fetchExistingBomSearchRows.fulfilled, (state, action) => {
        state.existingBomSearch.loading = false;
        state.existingBomSearch.rows = action.payload?.rows || [];
        state.existingBomSearch.pagination = action.payload?.pagination || {
          ...defaultPagination,
          total: action.payload?.rows?.length || 0,
        };
      })
      .addCase(fetchExistingBomSearchRows.rejected, (state, action) => {
        state.existingBomSearch.loading = false;
        state.existingBomSearch.error = action.payload || "Failed to load existing BOM records";
      })
      .addCase(fetchExistingItemBomRoutingSearchRows.pending, (state) => {
        state.existingItemBomRoutingSearch.loading = true;
        state.existingItemBomRoutingSearch.error = null;
      })
      .addCase(fetchExistingItemBomRoutingSearchRows.fulfilled, (state, action) => {
        state.existingItemBomRoutingSearch.loading = false;
        state.existingItemBomRoutingSearch.rows = action.payload?.rows || [];
        state.existingItemBomRoutingSearch.pagination = action.payload?.pagination || {
          ...defaultPagination,
          total: action.payload?.rows?.length || 0,
        };
      })
      .addCase(fetchExistingItemBomRoutingSearchRows.rejected, (state, action) => {
        state.existingItemBomRoutingSearch.loading = false;
        state.existingItemBomRoutingSearch.error =
          action.payload || "Failed to load existing item BOM routing records";
      })
      .addCase(fetchResourceComponentMetadata.pending, (state) => {
        state.resourceMeta.loading = true;
        state.resourceMeta.error = null;
      })
      .addCase(fetchResourceComponentMetadata.fulfilled, (state, action) => {
        state.resourceMeta.loading = false;
        state.resourceMeta.bomVersions = action.payload.bomVersions || [];
        state.resourceMeta.itemOptions = action.payload.itemOptions || [];
        state.resourceMeta.resourceOptions = action.payload.resourceOptions || [];
        state.resourceMeta.resourceOptionsByKey = action.payload.resourceOptionsByKey || {};
      })
      .addCase(fetchResourceComponentMetadata.rejected, (state, action) => {
        state.resourceMeta.loading = false;
        state.resourceMeta.error = action.payload || "Failed to load resource component metadata";
      })
      .addCase(fetchEngineeringChangeLogRows.pending, (state) => {
        state.engineeringChangeLog.loading = true;
        state.engineeringChangeLog.error = null;
      })
      .addCase(fetchEngineeringChangeLogRows.fulfilled, (state, action) => {
        state.engineeringChangeLog.loading = false;
        state.engineeringChangeLog.rows = action.payload?.rows || [];
        state.engineeringChangeLog.pagination = action.payload?.pagination || {
          ...defaultPagination,
          total: action.payload?.rows?.length || 0,
        };
      })
      .addCase(fetchEngineeringChangeLogRows.rejected, (state, action) => {
        state.engineeringChangeLog.loading = false;
        state.engineeringChangeLog.error = action.payload || "Failed to fetch engineering change log";
        state.engineeringChangeLog.rows = [];
      })
      .addCase(fetchLocationsByItems.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(fetchLocationsByItems.fulfilled, (state, action) => {
        state.locations.loading = false;
        locationsAdapter.setAll(state.locations, action.payload);
        const total = action.payload?.length || 0;
        const pageSize = state.locations.pagination.pageSize || 50;
        state.locations.pagination = {
          ...state.locations.pagination,
          page: 1,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          hasPrev: false,
          hasNext: total > pageSize,
        };
      })
      .addCase(fetchLocationsByItems.rejected, (state, action) => {
        state.locations.loading = false;
        state.locations.error = action.payload || "Failed to load locations";
      })
      .addCase(fetchLocationMaster.pending, (state) => {
        state.locations.loading = true;
        state.locations.error = null;
      })
      .addCase(fetchLocationMaster.fulfilled, (state, action) => {
        state.locations.loading = false;
        locationsAdapter.setAll(state.locations, action.payload);
        const total = action.payload?.length || 0;
        const pageSize = state.locations.pagination.pageSize || 50;
        state.locations.pagination = {
          ...state.locations.pagination,
          page: 1,
          pageSize,
          total,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          hasPrev: false,
          hasNext: total > pageSize,
        };
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
  setLocationsSearch,
  setLocationsPagination,
  setExistingBomSearchState,
  clearExistingBomSearchState,
  toggleExistingBomSelectedRow,
  toggleExistingBomSelectedPageRows,
  clearExistingBomSelectedRows,
  setExistingItemBomRoutingSearchState,
  clearExistingItemBomRoutingSearchState,
  setEngineeringChangeLogState,
  toggleExistingIbrSelectedRow,
  toggleExistingIbrSelectedPageRows,
  clearExistingIbrSelectedRows,
  setResourceComponentConfig,
  setModifySelectState,
  clearModifySelectState,
  setModifyExistingBomState,
  clearModifyExistingBomState,
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

export const selectSelectedProducedItemIds = (state) => state.bom.selectedProducedItemIds;
export const selectSelectedProducedItemById = (state) => state.bom.selectedProducedItemById || {};

export const selectSelectedProducedItems = createSelector(
  [selectAllItemMaster, selectSelectedProducedItemIds, selectSelectedProducedItemById],
  (all, ids, selectedById) =>
    ids.map((id) => selectedById[id] || all.find((x) => x.id === id)).filter(Boolean)
);

export const selectHasInactiveSelected = createSelector(
  [selectSelectedProducedItems],
  (selected) => selected.some((x) => isInactiveStatus(x.status))
);

export const {
  selectAll: selectAllLocations,
  selectById: selectLocationById,
} = locationsAdapter.getSelectors((state) => state.bom.locations);

export const selectSelectedLocationIds = (state) => state.bom.selectedLocationIds;

export const selectSelectedLocations = createSelector(
  [selectAllLocations, selectSelectedLocationIds],
  (all, ids) => all.filter((x) => ids.includes(x.id))
);

export const selectHasInactiveLocationsSelected = createSelector(
  [selectSelectedLocations],
  (selected) => selected.some((x) => !isActiveStatus(x.status))
);

export const selectModifySelectState = (state) => state.bom.modifySelectState;
export const selectModifyExistingBomState = (state) => state.bom.modifyExistingBomState;
export const selectItemsLoading = (state) => state.bom.items.loading;
export const selectItemsError = (state) => state.bom.items.error;
export const selectItemsPagination = (state) => state.bom.items.pagination;
export const selectLocationsLoading = (state) => state.bom.locations.loading;
export const selectLocationsError = (state) => state.bom.locations.error;
export const selectLocationsPagination = (state) => state.bom.locations.pagination;
export const selectLocationsSearch = (state) => state.bom.locations.search;

export const selectExistingBomSearchState = (state) =>
  state.bom.existingBomSearch || defaultExistingBomSearchState;
export const selectExistingBomSearchRows = (state) =>
  (state.bom.existingBomSearch || defaultExistingBomSearchState).rows || [];
export const selectExistingBomSearchLoading = (state) =>
  !!(state.bom.existingBomSearch || defaultExistingBomSearchState).loading;
export const selectExistingBomSearchError = (state) =>
  (state.bom.existingBomSearch || defaultExistingBomSearchState).error;
export const selectExistingBomSearchPagination = (state) =>
  (state.bom.existingBomSearch || defaultExistingBomSearchState).pagination || defaultPagination;
export const selectExistingBomSelectedRowIds = (state) =>
  (state.bom.existingBomSearch || defaultExistingBomSearchState).selectedRowIds || [];
export const selectExistingBomSelectedRowsById = (state) =>
  (state.bom.existingBomSearch || defaultExistingBomSearchState).selectedRowsById || {};
export const selectExistingBomSelectedRows = createSelector(
  [selectExistingBomSelectedRowIds, selectExistingBomSelectedRowsById],
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
);

export const selectExistingItemBomRoutingSearchState = (state) =>
  state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState;
export const selectExistingItemBomRoutingSearchRows = (state) =>
  (state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState).rows || [];
export const selectExistingItemBomRoutingSearchLoading = (state) =>
  !!(state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState).loading;
export const selectExistingItemBomRoutingSearchError = (state) =>
  (state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState).error;
export const selectExistingItemBomRoutingSearchPagination = (state) =>
  (state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState)
    .pagination || defaultPagination;
export const selectExistingIbrSelectedRowIds = (state) =>
  (state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState)
    .selectedRowIds || [];
export const selectExistingIbrSelectedRowsById = (state) =>
  (state.bom.existingItemBomRoutingSearch || defaultExistingItemBomRoutingSearchState)
    .selectedRowsById || {};
export const selectExistingIbrSelectedRows = createSelector(
  [selectExistingIbrSelectedRowIds, selectExistingIbrSelectedRowsById],
  (ids, byId) => ids.map((id) => byId[id]).filter(Boolean)
);

export const selectEngineeringChangeLogState = (state) =>
  state.bom.engineeringChangeLog || defaultEngineeringChangeLogState;
export const selectEngineeringChangeLogRows = (state) =>
  (state.bom.engineeringChangeLog || defaultEngineeringChangeLogState).rows || [];
export const selectEngineeringChangeLogLoading = (state) =>
  !!(state.bom.engineeringChangeLog || defaultEngineeringChangeLogState).loading;
export const selectEngineeringChangeLogError = (state) =>
  (state.bom.engineeringChangeLog || defaultEngineeringChangeLogState).error;
export const selectEngineeringChangeLogPagination = (state) =>
  (state.bom.engineeringChangeLog || defaultEngineeringChangeLogState).pagination || defaultPagination;

export const selectResourceMetaLoading = (state) => state.bom.resourceMeta.loading;
export const selectResourceMetaError = (state) => state.bom.resourceMeta.error;
export const selectBomVersions = (state) => state.bom.resourceMeta.bomVersions;
export const selectResourceItemOptions = (state) => state.bom.resourceMeta.itemOptions;
export const selectAllResourceOptions = (state) => state.bom.resourceMeta.resourceOptions;
export const selectResourceOptionsByKey = (state) => state.bom.resourceMeta.resourceOptionsByKey;
export const selectResourceComponentConfigs = (state) => state.bom.resourceComponentConfigs;

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
