import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDoc,
  Timestamp 
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Collection name
const CUSTOMERS_COLLECTION = "customers";

// Customer interface
export interface Customer {
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  totalPurchases?: number;
  createdAt?: Date;
}

// Add a new customer
export const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), {
      ...customer,
      createdAt: Timestamp.now(),
      totalPurchases: customer.totalPurchases || 0
    });
    console.log("Customer added with ID: ", docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error("Error adding customer: ", error);
    return { success: false, error };
  }
};

// Get all customers
export const getAllCustomers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, CUSTOMERS_COLLECTION));
    const customers: Customer[] = [];
    
    querySnapshot.forEach((doc) => {
      customers.push({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      } as Customer);
    });
    
    return { success: true, data: customers };
  } catch (error) {
    console.error("Error getting customers: ", error);
    return { success: false, error, data: [] };
  }
};

// Get a single customer by ID
export const getCustomer = async (customerId: string) => {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        data: { 
          id: docSnap.id, 
          ...docSnap.data(),
          createdAt: docSnap.data().createdAt?.toDate()
        } as Customer 
      };
    } else {
      return { success: false, error: "Customer not found" };
    }
  } catch (error) {
    console.error("Error getting customer: ", error);
    return { success: false, error };
  }
};

// Update a customer
export const updateCustomer = async (customerId: string, updates: Partial<Customer>) => {
  try {
    const docRef = doc(db, CUSTOMERS_COLLECTION, customerId);
    await updateDoc(docRef, updates);
    console.log("Customer updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error updating customer: ", error);
    return { success: false, error };
  }
};

// Delete a customer
export const deleteCustomer = async (customerId: string) => {
  try {
    await deleteDoc(doc(db, CUSTOMERS_COLLECTION, customerId));
    console.log("Customer deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer: ", error);
    return { success: false, error };
  }
};