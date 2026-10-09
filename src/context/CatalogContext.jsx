import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { loadCatalog } from '../lib/catalog';

/**
 * Single source of truth for the product catalog.
 *
 * Components read products from here instead of importing the bundled demo
 * catalog directly, so connecting the real Shopify store is a data change and
 * not a UI change.
 */

const CatalogContext = createContext(null);

const INITIAL = { products: [], loading: true, source: null, store: null, error: null };

export const useCatalog = () => useContext(CatalogContext) || INITIAL;

export const CatalogProvider = ({ children }) => {
  const [state, setState] = useState(INITIAL);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    return loadCatalog().then((next) => {
      setState(next);
      return next;
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <CatalogContext.Provider value={{ ...state, refresh }}>{children}</CatalogContext.Provider>;
};
