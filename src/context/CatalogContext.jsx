import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadCatalog } from '../lib/catalog';
import { loadStore } from '../lib/store';

/**
 * Single source of truth for the store + product catalog.
 *
 * `store` is the store this browser is talking to (resolved from the subdomain,
 * or from `?store=<slug>` in development). Components read products from here
 * instead of importing the bundled demo catalog directly, so connecting the
 * real Shopify store is a data change and not a UI change.
 */

const CatalogContext = createContext(null);

const INITIAL = {
  products: [],
  loading: true,
  source: null,
  store: null,
  storeLoading: true,
  error: null,
};

export const useCatalog = () => useContext(CatalogContext) || INITIAL;

export const CatalogProvider = ({ children }) => {
  const [state, setState] = useState(INITIAL);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true, storeLoading: true }));

    const storePromise = loadStore().then((store) => {
      setState((s) => ({ ...s, store, storeLoading: false }));
      return store;
    });

    const catalogPromise = loadCatalog().then((next) => {
      // Merge explicitly: the catalog result must never clobber `store`
      // (it carries its own `shopifyStore` field for the Shopify store domain).
      setState((s) => ({
        ...s,
        products: next.products,
        source: next.source,
        error: next.error,
        shopifyStore: next.shopifyStore ?? null,
        loading: false,
      }));
      return next;
    });

    return Promise.all([storePromise, catalogPromise]);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <CatalogContext.Provider value={{ ...state, refresh }}>{children}</CatalogContext.Provider>;
};
