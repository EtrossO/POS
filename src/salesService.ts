import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  Timestamp,
  query,
  orderBy,
  where,
  limit
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { Sale } from "./types";

// Collection name
const SALES_COLLECTION = "sales";

// Add a new sale
export const addSale = async (sale: Omit<Sale, 'id' | 'timestamp'>) => {
  try {
    const docRef = await addDoc(collection(db, SALES_COLLECTION), {
      ...sale,
      timestamp: Timestamp.now()
    });
    console.log("Sale added with ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding sale: ", error);
    return { success: false, error };
  }
};

// Get all sales (sorted by most recent first)
export const getAllSales = async () => {
  try {
    const q = query(
      collection(db, SALES_COLLECTION), 
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const sales: Sale[] = [];
    
    querySnapshot.forEach((doc) => {
      sales.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as Sale);
    });
    
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error getting sales: ", error);
    return { success: false, error, data: [] };
  }
};

// Get sales by date range
export const getSalesByDateRange = async (startDate: Date, endDate: Date) => {
  try {
    const q = query(
      collection(db, SALES_COLLECTION),
      where("timestamp", ">=", Timestamp.fromDate(startDate)),
      where("timestamp", "<=", Timestamp.fromDate(endDate)),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const sales: Sale[] = [];
    
    querySnapshot.forEach((doc) => {
      sales.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as Sale);
    });
    
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error getting sales by date: ", error);
    return { success: false, error, data: [] };
  }
};

// Get sales by payment method
export const getSalesByPaymentMethod = async (paymentMethod: string) => {
  try {
    const q = query(
      collection(db, SALES_COLLECTION),
      where("paymentMethod", "==", paymentMethod),
      orderBy("timestamp", "desc")
    );
    const querySnapshot = await getDocs(q);
    const sales: Sale[] = [];
    
    querySnapshot.forEach((doc) => {
      sales.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as Sale);
    });
    
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error getting sales by payment method: ", error);
    return { success: false, error, data: [] };
  }
};

// Get recent sales (last N sales)
export const getRecentSales = async (limitCount: number = 10) => {
  try {
    const q = query(
      collection(db, SALES_COLLECTION),
      orderBy("timestamp", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    const sales: Sale[] = [];
    
    querySnapshot.forEach((doc) => {
      sales.push({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      } as Sale);
    });
    
    return { success: true, data: sales };
  } catch (error) {
    console.error("Error getting recent sales: ", error);
    return { success: false, error, data: [] };
  }
};

// Get a single sale by ID
export const getSale = async (saleId: string) => {
  try {
    const docRef = doc(db, SALES_COLLECTION, saleId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        data: { 
          id: docSnap.id, 
          ...docSnap.data(),
          timestamp: docSnap.data().timestamp?.toDate()
        } as Sale 
      };
    } else {
      return { success: false, error: "Sale not found" };
    }
  } catch (error) {
    console.error("Error getting sale: ", error);
    return { success: false, error };
  }
};

// Update a sale
export const updateSale = async (saleId: string, updates: Partial<Sale>) => {
  try {
    const docRef = doc(db, SALES_COLLECTION, saleId);
    await updateDoc(docRef, updates);
    console.log("Sale updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating sale: ", error);
    return { success: false, error };
  }
};

// Delete a sale
export const deleteSale = async (saleId: string) => {
  try {
    await deleteDoc(doc(db, SALES_COLLECTION, saleId));
    console.log("Sale deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting sale: ", error);
    return { success: false, error };
  }
};

// Get sales statistics
export const getSalesStats = async () => {
  try {
    const result = await getAllSales();
    
    if (!result.success || result.data.length === 0) {
      return {
        success: true,
        stats: {
          totalSales: 0,
          totalRevenue: 0,
          totalQuantity: 0,
          cashSales: 0,
          qrPaySales: 0,
          averageSale: 0
        }
      };
    }

    const sales: any[] = result.data;
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0);
    const cashSales = sales.filter(s => s.paymentMethod === 'cash').length;
    const qrPaySales = sales.filter(s => s.paymentMethod === 'qr').length;
    const averageSale = totalRevenue / totalSales;

    return {
      success: true,
      stats: {
        totalSales,
        totalRevenue,
        totalQuantity,
        cashSales,
        qrPaySales,
        averageSale
      }
    };
  } catch (error) {
    console.error("Error getting sales stats: ", error);
    return { success: false, error };
  }
};