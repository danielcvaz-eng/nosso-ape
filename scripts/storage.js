import { APP_CONFIG, STATUS_VALUES } from "./config.js";
import { clamp, safeNumber } from "./utils.js";

function getStorage() {
  try {
    const testKey = "__nosso_ape_test__";
    window.localStorage.setItem(testKey, "1");
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

function sanitizeStatusMap(rawValue) {
  if (!rawValue || typeof rawValue !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawValue).filter(([, status]) => STATUS_VALUES.includes(status))
  );
}

function sanitizeContributionsMap(rawValue, products) {
  if (!rawValue || typeof rawValue !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(rawValue)
      .map(([id, amount]) => {
        const product = products.find((item) => item.id === Number(id));

        if (!product) {
          return null;
        }

        return [id, clamp(safeNumber(amount), 0, product.preco)];
      })
      .filter(Boolean)
  );
}

function migrateLegacyState(storage, products) {
  if (!storage) {
    return null;
  }

  const legacyStatuses = storage.getItem(APP_CONFIG.storage.legacyStatusKey);
  const legacyContributions = storage.getItem(APP_CONFIG.storage.legacyContributionsKey);

  if (!legacyStatuses && !legacyContributions) {
    return null;
  }

  let statusMap = {};
  let contributionsMap = {};

  try {
    statusMap = sanitizeStatusMap(JSON.parse(legacyStatuses || "{}"));
  } catch {
    statusMap = {};
  }

  try {
    contributionsMap = sanitizeContributionsMap(JSON.parse(legacyContributions || "{}"), products);
  } catch {
    contributionsMap = {};
  }

  return {
    version: APP_CONFIG.storage.version,
    statuses: statusMap,
    contributions: contributionsMap
  };
}

export function loadPersistedState(products) {
  const storage = getStorage();
  const fallbackState = {
    storageAvailable: Boolean(storage),
    statuses: {},
    contributions: {}
  };

  if (!storage) {
    return fallbackState;
  }

  const rawState = storage.getItem(APP_CONFIG.storage.stateKey);

  if (!rawState) {
    const migratedState = migrateLegacyState(storage, products);

    if (!migratedState) {
      return fallbackState;
    }

    savePersistedState(migratedState);
    return {
      storageAvailable: true,
      statuses: migratedState.statuses,
      contributions: migratedState.contributions
    };
  }

  try {
    const parsedState = JSON.parse(rawState);

    if (parsedState.version !== APP_CONFIG.storage.version) {
      const migratedState = migrateLegacyState(storage, products);

      if (migratedState) {
        savePersistedState(migratedState);
        return {
          storageAvailable: true,
          statuses: migratedState.statuses,
          contributions: migratedState.contributions
        };
      }
    }

    return {
      storageAvailable: true,
      statuses: sanitizeStatusMap(parsedState.statuses),
      contributions: sanitizeContributionsMap(parsedState.contributions, products)
    };
  } catch {
    return fallbackState;
  }
}

export function savePersistedState({ statuses, contributions }) {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  const stateToSave = {
    version: APP_CONFIG.storage.version,
    statuses,
    contributions
  };

  try {
    storage.setItem(APP_CONFIG.storage.stateKey, JSON.stringify(stateToSave));
    return true;
  } catch {
    return false;
  }
}

export function clearPersistedState() {
  const storage = getStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(APP_CONFIG.storage.stateKey);
    storage.removeItem(APP_CONFIG.storage.legacyStatusKey);
    storage.removeItem(APP_CONFIG.storage.legacyContributionsKey);
    return true;
  } catch {
    return false;
  }
}
