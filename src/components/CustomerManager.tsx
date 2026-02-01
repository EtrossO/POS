import React, { useState, useEffect } from 'react';
import { 
  addCustomer, 
  getAllCustomers, 
  updateCustomer, 
  deleteCustomer,
  Customer 
} from '../customerService';

const CustomerManager: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  // Load customers when component mounts
  useEffect(() => {
    loadCustomers();
  }, []);

  // Load all customers from Firebase
  const loadCustomers = async () => {
    setLoading(true);
    const result = await getAllCustomers();
    if (result.success) {
      setCustomers(result.data);
    }
    setLoading(false);
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Add new customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Please enter customer name');
      return;
    }

    const result = await addCustomer(formData);
    
    if (result.success) {
      alert('Customer added successfully!');
      setFormData({ name: '', email: '', phone: '', address: '' });
      loadCustomers(); // Reload the list
    } else {
      alert('Error adding customer');
    }
  };

  // Delete customer
  const handleDeleteCustomer = async (customerId: string) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      const result = await deleteCustomer(customerId);
      
      if (result.success) {
        alert('Customer deleted successfully!');
        loadCustomers(); // Reload the list
      } else {
        alert('Error deleting customer');
      }
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Customer Management</h1>
      
      {/* Add Customer Form */}
      <div style={{ marginBottom: '30px', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
        <h2>Add New Customer</h2>
        <form onSubmit={handleAddCustomer}>
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              name="name"
              placeholder="Customer Name *"
              value={formData.name}
              onChange={handleInputChange}
              style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleInputChange}
              style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <input
              type="tel"
              name="phone"
              placeholder="Phone"
              value={formData.phone}
              onChange={handleInputChange}
              style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
            />
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <input
              type="text"
              name="address"
              placeholder="Address"
              value={formData.address}
              onChange={handleInputChange}
              style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
            />
          </div>
          
          <button 
            type="submit" 
            style={{ padding: '10px 20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Add Customer
          </button>
        </form>
      </div>

      {/* Customer List */}
      <div>
        <h2>Customer List</h2>
        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers yet. Add your first customer above!</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Email</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Phone</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Address</th>
                <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{customer.name}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{customer.email || '-'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{customer.phone || '-'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>{customer.address || '-'}</td>
                  <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                    <button 
                      onClick={() => handleDeleteCustomer(customer.id!)}
                      style={{ padding: '5px 10px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default CustomerManager;