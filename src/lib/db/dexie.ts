import Dexie, { type EntityTable } from 'dexie';

export interface LocalGpsPoint {
    id?: number;
    tripId: string;
    lat: number;
    lng: number;
    timestamp: Date;
    synced: boolean;
}

const db = new Dexie('UtripDatabase') as Dexie & {
    gps_points: EntityTable<
        LocalGpsPoint,
        'id' // primary key "id" (for the typings only)
    >;
};

// Schema declaration
db.version(1).stores({
    gps_points: '++id, tripId, timestamp, synced' // primary key "id" (auto-incremented)
});

export { db };
