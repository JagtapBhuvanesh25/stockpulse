import React, { useState, useEffect } from 'react';

function usePolling(fetchFn, interval = 5000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let timeoutId;

    const fetchData = async () => {
      try {
        const result = await fetchFn();
        if (isMounted) {
          setData(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      }
    };

    const scheduleNext = () => {
      timeoutId = setTimeout(() => {
        fetchData().then(scheduleNext);
      }, interval);
    };

    fetchData().then(scheduleNext);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [fetchFn, interval]);

  return { data, loading, error, refetch: () => {} };
}

export { usePolling };