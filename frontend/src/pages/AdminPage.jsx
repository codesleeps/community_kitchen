import React, { useState, useEffect } from 'react';
import { getAdminOrders, getAdminSummary, getAdminServiceDay, patchOrderStatus, patchAdminServiceDay } from '../api/client';

export default function AdminPage() {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [serviceDay, setServiceDay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadAdminData = async () => {
      try {
        setLoading(true);
        const [ordersData, summaryData, serviceDayData] = await Promise.all([
          getAdminOrders(),
          getAdminSummary(),
          getAdminServiceDay(),
        ]);
        setOrders(ordersData.orders || []);
        setSummary(summaryData);
        setServiceDay(serviceDayData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAdminData();
  }, []);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await patchOrderStatus(orderId, newStatus);
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, status: newStatus } : order
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className="container admin-page"><p>Loading...</p></div>;
  if (error) return <div className="container admin-page error"><p>Error: {error}</p></div>;

  return (
    <div className="container admin-page">
      <h1>Community Kitchen - Admin Dashboard</h1>

      {summary && (
        <div className="summary-section">
          <h2>Summary</h2>
          <div className="summary-grid">
            <div className="summary-card">
              <h3>Total Orders</h3>
              <p className="summary-value">{summary.totalOrders || 0}</p>
            </div>
            <div className="summary-card">
              <h3>Pending Orders</h3>
              <p className="summary-value">{summary.pendingOrders || 0}</p>
            </div>
          </div>
        </div>
      )}

      {serviceDay && (
        <div className="service-day-section">
          <h2>Service Day Settings</h2>
          <p>Date: {serviceDay.date}</p>
          <p>Status: {serviceDay.status}</p>
        </div>
      )}

      <div className="orders-section">
        <h2>Orders Management</h2>
        <table>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Resident</th>
              <th>Status</th>
              <th>Items</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.residentName}</td>
                <td>{order.status}</td>
                <td>{order.items?.length || 0} items</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="prepared">Prepared</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
