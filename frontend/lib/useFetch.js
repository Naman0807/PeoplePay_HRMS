"use client";

import { useCallback, useEffect, useState } from "react";
import api from "./api";

/** Shared loading/error/data hook so every list/detail screen gets the 3 required states for free. */
export function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const run = useCallback(() => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    api
      .get(url)
      .then((res) => setState({ data: res.data.data, loading: false, error: null }))
      .catch((err) =>
        setState({
          data: null,
          loading: false,
          error: err.response?.data?.message || "Something went wrong.",
        })
      );
  }, [url]);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
