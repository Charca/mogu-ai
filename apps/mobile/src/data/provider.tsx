import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { openDatabaseAsync } from 'expo-sqlite';
import { randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';
import { localDate } from '@mogu/domain';
import { LocalStore, type Snapshot } from './store';
import { Button, Screen, Label } from '../ui/components';

interface DiaryContextValue extends Snapshot {
  today: string;
  store: LocalStore;
  refresh: () => Promise<void>;
}
const DiaryContext = createContext<DiaryContextValue | null>(null);

export function DiaryProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [today, setToday] = useState(localDate());
  const store = useRef<LocalStore | null>(null);
  const userId = useRef<string | null>(null);
  const startup = useRef<Promise<Snapshot> | null>(null);

  useEffect(() => {
    const updateDate = () => setToday(localDate());
    const timer = setInterval(updateDate, 60_000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') updateDate();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    let active = true;
    setError(null);
    if (!startup.current) {
      startup.current = (async () => {
        if (!store.current) {
          const db = await openDatabaseAsync('mogu.db');
          store.current = new LocalStore(db, randomUUID);
        }
        const user = await store.current.initialize();
        userId.current = user.id;
        return store.current.snapshot(user.id);
      })();
    }
    startup.current
      .then((data) => {
        if (active) setSnapshot(data);
      })
      .catch(() => {
        startup.current = null;
        if (active)
          setError('Your diary could not be opened. Existing data has been kept. Try again.');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const value = useMemo(
    () =>
      snapshot && store.current
        ? {
            ...snapshot,
            today,
            store: store.current,
            refresh: async () => {
              if (store.current && userId.current)
                setSnapshot(await store.current.snapshot(userId.current));
            },
          }
        : null,
    [snapshot, today],
  );

  if (error)
    return (
      <Screen>
        <Label size="title">Let's try again</Label>
        <Label>{error}</Label>
        <Button title="Open diary" onPress={() => setAttempt((value) => value + 1)} />
      </Screen>
    );
  if (!value)
    return (
      <Screen>
        <Label size="title">Mogu</Label>
        <Label>Opening your diary…</Label>
      </Screen>
    );
  return <DiaryContext.Provider value={value}>{children}</DiaryContext.Provider>;
}

export function useDiary() {
  const value = useContext(DiaryContext);
  if (!value) throw new Error('useDiary requires DiaryProvider');
  return value;
}
