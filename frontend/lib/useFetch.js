"use client";

import { useCallback, useEffect, useState } from "react";
import api from "./api";

/** Shared loading/error/data hook so every list/detail screen gets the 3 required states for free. */
export function useFetch(url) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });

  const run = useCallback(() => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(url)
      // meta (page/limit/total_records) is only present on list endpoints, undefined
      // otherwise — harmless for the many callers that don't use it.
      .then((res) => setState({ data: res.data.data, meta: res.data.meta ?? null, loading: false, error: null }))
      .catch((err) =>
        setState({
          data: null,
          meta: null,
          loading: false,
          error: err.response?.data?.message || "Something went wrong.",
        })
      );
  }, [url]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  return { ...state, refetch: run };
}
