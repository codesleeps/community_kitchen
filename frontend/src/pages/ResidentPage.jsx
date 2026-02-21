import React, { useState, useEffect } from 'react';
import { getServiceDay, getMenu, postOrder, getOrder } from '../api/client';

export default function ResidentPage() {
  const [serviceDay, setServiceDay] = useState(null);
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [dayData, menuData] = await Promise.all([
          getServiceDay(),
          getMenu(),
        ]);
        setServiceDay(dayData);
        setMenu(menuData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <div className="container"><p>Loading...</p></div>;
  if (error) return <div className="container error"><p>Error: {error}</p></div>;

  return (
    <div className="container resident-page">
      <h1>Community Kitchen - Order Your Meal</h1>
      
      {serviceDay && (
        <div className="service-day-info">
          <h2>Service Day Information</h2>
          <p>Service Date: {serviceDay.date}</p>
          <p>Status: {serviceDay.status}</p>
        </div>
      )}

      {menu && (
        <div className="menu-section">
          <h2>Today's Menu</h2>
          <div className="menu-items">
            {menu.items && menu.items.map((item) => (
              <div key={item.id} className="menu-item">
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="order-section">
        <h2>Place Your Order</h2>
        <p>Coming soon...</p>
      </div>
    </div>
  );
}
