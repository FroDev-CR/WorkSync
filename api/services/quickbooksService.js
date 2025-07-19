// Servicio para interactuar con la API de QuickBooks
const axios = require('axios');
const { getValidToken, saveErrorLog } = require('./authService');

// Configuración de la API de QuickBooks
const QUICKBOOKS_API_BASE = 'https://sandbox-accounts.platform.intuit.com/v1';

// Obtener información de la empresa
const getCompanyInfo = async (userId) => {
  try {
    const token = await getValidToken('quickbooks', userId);
    
    const response = await axios.get(`${QUICKBOOKS_API_BASE}/companies`, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    });

    return response.data.companies?.[0] || null;
  } catch (error) {
    console.error('Error obteniendo información de empresa de QuickBooks:', error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider: 'quickbooks',
      error: 'get_company_info',
      message: error.response?.data || error.message
    });
    throw error;
  }
};

// Crear factura en QuickBooks
const createInvoice = async (userId, invoiceData) => {
  try {
    const token = await getValidToken('quickbooks', userId);
    const companyInfo = await getCompanyInfo(userId);
    
    if (!companyInfo) {
      throw new Error('No se pudo obtener información de la empresa');
    }

    // Preparar datos de la factura para QuickBooks
    const quickbooksInvoice = {
      Line: invoiceData.items.map(item => ({
        Amount: item.amount,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: {
            value: '1', // ID del item por defecto
            name: item.name
          },
          Qty: item.quantity,
          UnitPrice: item.unit_price
        }
      })),
      CustomerRef: {
        name: invoiceData.customer.name
      },
      DocNumber: `Job-${invoiceData.id}`,
      PrivateNote: `Sincronizado desde Jobber - Job ID: ${invoiceData.id}`,
      TxnDate: invoiceData.date
    };

    const response = await axios.post(`${QUICKBOOKS_API_BASE}/companies/${companyInfo.Id}/invoices`, quickbooksInvoice, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return {
      id: response.data.Invoice.Id,
      number: response.data.Invoice.DocNumber,
      amount: response.data.Invoice.TotalAmt,
      status: 'created',
      quickbooks_id: response.data.Invoice.Id
    };
  } catch (error) {
    console.error('Error creando factura en QuickBooks:', error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider: 'quickbooks',
      error: 'create_invoice',
      jobId: invoiceData.id,
      message: error.response?.data || error.message
    });
    throw error;
  }
};

// Verificar si una factura ya existe
const checkInvoiceExists = async (userId, jobId) => {
  try {
    const token = await getValidToken('quickbooks', userId);
    const companyInfo = await getCompanyInfo(userId);
    
    if (!companyInfo) {
      return false;
    }

    const response = await axios.get(`${QUICKBOOKS_API_BASE}/companies/${companyInfo.Id}/invoices`, {
      params: {
        query: `SELECT * FROM Invoice WHERE DocNumber = 'Job-${jobId}'`
      },
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    });

    return response.data.QueryResponse?.Invoice?.length > 0;
  } catch (error) {
    console.error('Error verificando si existe factura en QuickBooks:', error.response?.data || error.message);
    return false;
  }
};

// Obtener facturas recientes
const getRecentInvoices = async (userId, limit = 50) => {
  try {
    const token = await getValidToken('quickbooks', userId);
    const companyInfo = await getCompanyInfo(userId);
    
    if (!companyInfo) {
      return { invoices: [], total: 0 };
    }

    const response = await axios.get(`${QUICKBOOKS_API_BASE}/companies/${companyInfo.Id}/invoices`, {
      params: {
        query: `SELECT * FROM Invoice ORDER BY TxnDate DESC MAXRESULTS ${limit}`
      },
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Accept': 'application/json'
      }
    });

    return {
      invoices: response.data.QueryResponse?.Invoice || [],
      total: response.data.QueryResponse?.Invoice?.length || 0
    };
  } catch (error) {
    console.error('Error obteniendo facturas recientes de QuickBooks:', error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider: 'quickbooks',
      error: 'get_recent_invoices',
      message: error.response?.data || error.message
    });
    throw error;
  }
};

// Crear cliente en QuickBooks si no existe
const createCustomer = async (userId, customerData) => {
  try {
    const token = await getValidToken('quickbooks', userId);
    const companyInfo = await getCompanyInfo(userId);
    
    if (!companyInfo) {
      throw new Error('No se pudo obtener información de la empresa');
    }

    const customer = {
      Name: customerData.name,
      PrimaryEmailAddr: customerData.email ? {
        Address: customerData.email
      } : undefined,
      PrimaryPhone: customerData.phone ? {
        FreeFormNumber: customerData.phone
      } : undefined
    };

    const response = await axios.post(`${QUICKBOOKS_API_BASE}/companies/${companyInfo.Id}/customers`, customer, {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return {
      id: response.data.Customer.Id,
      name: response.data.Customer.Name,
      email: response.data.Customer.PrimaryEmailAddr?.Address,
      phone: response.data.Customer.PrimaryPhone?.FreeFormNumber
    };
  } catch (error) {
    console.error('Error creando cliente en QuickBooks:', error.response?.data || error.message);
    await saveErrorLog(userId, {
      provider: 'quickbooks',
      error: 'create_customer',
      customerName: customerData.name,
      message: error.response?.data || error.message
    });
    throw error;
  }
};

module.exports = {
  getCompanyInfo,
  createInvoice,
  checkInvoiceExists,
  getRecentInvoices,
  createCustomer
}; 