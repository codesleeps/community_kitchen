const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET;

const getHeaders = (isAdmin = false) => {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (isAdmin && ADMIN_SECRET) {
    headers['x-admin-secret'] = ADMIN_SECRET;
  }
  
  return headers;
};

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

// Public endpoints (resident flow)

export const getServiceDay = async () => {
  const response = await fetch(`${API_URL}/service-day/today`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
};

export const getMenu = async () => {
  const response = await fetch(`${API_URL}/menu`, {
    method: 'GET',
    headers: getHeaders(),
  });
  const result = await handleResponse(response);
  // Transform the response to match what the frontend expects
  return { items: result.data };
};

export const postOrder = async (orderData) => {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(orderData),
  });
  return handleResponse(response);
};

export const getOrder = async (trackingId) => {
  const response = await fetch(`${API_URL}/orders/${trackingId}`, {
    method: 'GET',
    headers: getHeaders(),
  });
  return handleResponse(response);
};

// Admin endpoints

export const getAdminOrders = async () => {
  const response = await fetch(`${API_URL}/admin/orders`, {
    method: 'GET',
    headers: getHeaders(true),
  });
  return handleResponse(response);
};

export const patchOrderStatus = async (orderId, status) => {
  const response = await fetch(`${API_URL}/admin/orders/${orderId}`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify({ status }),
  });
  return handleResponse(response);
};

export const getAdminSummary = async () => {
  const response = await fetch(`${API_URL}/admin/summary`, {
    method: 'GET',
    headers: getHeaders(true),
  });
  return handleResponse(response);
};

export const getAdminServiceDay = async () => {
  const response = await fetch(`${API_URL}/admin/service-day`, {
    method: 'GET',
    headers: getHeaders(true),
  });
  return handleResponse(response);
};

export const patchAdminServiceDay = async (serviceDayData) => {
  const response = await fetch(`${API_URL}/admin/service-day`, {
    method: 'PATCH',
    headers: getHeaders(true),
    body: JSON.stringify(serviceDayData),
  });
  return handleResponse(response);
};
