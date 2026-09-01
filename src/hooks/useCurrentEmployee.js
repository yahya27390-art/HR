import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

export function useCurrentEmployee() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const res = await base44.entities.Employee.filter({ user_id: user.id });
        if (active) setEmployee(res[0] || null);
      } catch {
        if (active) setEmployee(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  return { employee, loading };
}