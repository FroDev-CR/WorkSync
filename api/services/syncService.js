// Servicio principal de sincronización
const { getPendingSyncJobs, transformJobToQuickBooks } = require('./jobberService');
const { createInvoice, checkInvoiceExists, createCustomer } = require('./quickbooksService');
const { saveSyncLog, saveErrorLog, getSyncHistory } = require('../config/firebase');

// Sincronizar un Job específico
const syncJob = async (userId, jobId) => {
  try {
    console.log(`Iniciando sincronización del Job ${jobId} para usuario ${userId}`);
    
    // Verificar si ya existe la factura en QuickBooks
    const invoiceExists = await checkInvoiceExists(userId, jobId);
    if (invoiceExists) {
      console.log(`Factura para Job ${jobId} ya existe en QuickBooks`);
      return {
        success: false,
        message: 'La factura ya existe en QuickBooks',
        jobId,
        skipped: true
      };
    }

    // Obtener Job de Jobber
    const { getJobById } = require('./jobberService');
    const jobberJob = await getJobById(userId, jobId);
    
    if (!jobberJob) {
      throw new Error(`Job ${jobId} no encontrado en Jobber`);
    }

    // Transformar Job a formato QuickBooks
    const quickbooksData = transformJobToQuickBooks(jobberJob);

    // Crear cliente en QuickBooks si es necesario
    if (quickbooksData.customer.name !== 'Unknown Client') {
      try {
        await createCustomer(userId, quickbooksData.customer);
      } catch (error) {
        console.log('Cliente ya existe o error creando cliente:', error.message);
      }
    }

    // Crear factura en QuickBooks
    const invoice = await createInvoice(userId, quickbooksData);

    // Guardar log de sincronización
    if (saveSyncLog) {
      await saveSyncLog(userId, {
        jobId,
        jobberJobId: jobberJob.id,
        quickbooksInvoiceId: invoice.id,
        status: 'success',
        amount: invoice.amount,
        syncType: 'manual',
        details: {
          jobberStatus: jobberJob.status,
          quickbooksStatus: invoice.status,
          customerName: quickbooksData.customer.name
        }
      });
    }

    console.log(`Job ${jobId} sincronizado exitosamente`);
    
    return {
      success: true,
      message: 'Job sincronizado exitosamente',
      jobId,
      invoiceId: invoice.id,
      amount: invoice.amount
    };

  } catch (error) {
    console.error(`Error sincronizando Job ${jobId}:`, error.message);
    
    // Guardar log de error
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'sync',
        error: 'sync_job',
        jobId,
        message: error.message
      });
    }

    throw error;
  }
};

// Sincronizar múltiples Jobs
const syncMultipleJobs = async (userId, jobIds) => {
  const results = {
    successful: [],
    failed: [],
    skipped: []
  };

  console.log(`Iniciando sincronización de ${jobIds.length} Jobs para usuario ${userId}`);

  for (const jobId of jobIds) {
    try {
      const result = await syncJob(userId, jobId);
      
      if (result.success) {
        results.successful.push(result);
      } else if (result.skipped) {
        results.skipped.push(result);
      }
    } catch (error) {
      console.error(`Error sincronizando Job ${jobId}:`, error.message);
      results.failed.push({
        jobId,
        error: error.message
      });
    }
  }

  // Guardar log de sincronización masiva
  if (saveSyncLog) {
    await saveSyncLog(userId, {
      status: 'batch_completed',
      syncType: 'batch',
      summary: {
        total: jobIds.length,
        successful: results.successful.length,
        failed: results.failed.length,
        skipped: results.skipped.length
      },
      details: {
        successfulJobs: results.successful.map(r => r.jobId),
        failedJobs: results.failed.map(r => r.jobId),
        skippedJobs: results.skipped.map(r => r.jobId)
      }
    });
  }

  return results;
};

// Sincronización automática de Jobs pendientes
const syncPendingJobs = async (userId) => {
  try {
    console.log(`Iniciando sincronización automática para usuario ${userId}`);
    
    // Obtener Jobs pendientes de Jobber
    const pendingJobs = await getPendingSyncJobs(userId);
    
    if (pendingJobs.jobs.length === 0) {
      console.log('No hay Jobs pendientes de sincronización');
      return {
        success: true,
        message: 'No hay Jobs pendientes de sincronización',
        total: 0,
        synced: 0
      };
    }

    // Verificar cuáles no existen en QuickBooks
    const jobsToSync = [];
    for (const job of pendingJobs.jobs) {
      const exists = await checkInvoiceExists(userId, job.id);
      if (!exists) {
        jobsToSync.push(job.id);
      }
    }

    if (jobsToSync.length === 0) {
      console.log('Todos los Jobs ya están sincronizados');
      return {
        success: true,
        message: 'Todos los Jobs ya están sincronizados',
        total: pendingJobs.jobs.length,
        synced: 0
      };
    }

    // Sincronizar Jobs pendientes
    const results = await syncMultipleJobs(userId, jobsToSync);

    return {
      success: true,
      message: 'Sincronización automática completada',
      total: pendingJobs.jobs.length,
      synced: results.successful.length,
      results
    };

  } catch (error) {
    console.error('Error en sincronización automática:', error.message);
    
    if (saveErrorLog) {
      await saveErrorLog(userId, {
        provider: 'sync',
        error: 'sync_pending_jobs',
        message: error.message
      });
    }

    throw error;
  }
};

// Obtener estadísticas de sincronización
const getSyncStats = async (userId) => {
  try {
    if (!getSyncHistory) {
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        totalAmount: 0,
        lastSync: null,
        recentActivity: []
      };
    }

    const history = await getSyncHistory(userId, 100);
    
    const stats = {
      totalSyncs: history.length,
      successfulSyncs: history.filter(h => h.status === 'success').length,
      failedSyncs: history.filter(h => h.status === 'failed').length,
      totalAmount: history
        .filter(h => h.status === 'success' && h.amount)
        .reduce((sum, h) => sum + (h.amount || 0), 0),
      lastSync: history[0]?.createdAt || null,
      recentActivity: history.slice(0, 10)
    };

    return stats;
  } catch (error) {
    console.error('Error obteniendo estadísticas de sincronización:', error.message);
    throw error;
  }
};

module.exports = {
  syncJob,
  syncMultipleJobs,
  syncPendingJobs,
  getSyncStats
}; 