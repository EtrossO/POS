import Dexie, {type Table } from 'dexie';
import { Sale, PromoRule } from './types';

// Define the database
export const db = new Dexie ('KacangParpuDB') as Dexie & {
    sales: Table<Sale>;
    promos: Table<PromoRule>;
    settings: Table<{ key: string; value: any }>;
};

db.version(1).stores({
    sales: 'id, date, quantity, totalPrice, paymentMethod',
    promos: 'id, quantity',
    settings: 'key'
});

//helper to initialize data if DB is empty
export const initializeDefaults = async () => {
    const promoCount = await db.promos.count();
    if (promoCount === 0) {
        await db.promos.bulkAdd([
            { id: '1', quantity: 2, price: 5 },
            { id: '2', quantity: 4, price: 10 }
        ]);
    }

    const basePriceSet = await db.settings.get('basePrice');
    if (!basePriceSet) {
        await db.settings.put({ key: 'basePrice', value: 3 });
    }
};