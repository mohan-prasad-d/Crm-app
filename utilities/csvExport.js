// ============================================
// CSV EXPORT UTILITY
// ============================================
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

const exportsTempDir = path.join(__dirname, '../temp/exports');

// Create temp directory if it doesn't exist
if (!fs.existsSync(exportsTempDir)) {
  fs.mkdirSync(exportsTempDir, { recursive: true });
}

const exportToCSV = async (filename, headers, records) => {
  try {
    const filepath = path.join(exportsTempDir, filename);

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: headers
    });

    await csvWriter.writeRecords(records);
    return filepath;
  } catch (error) {
    throw new Error(`CSV export failed: ${error.message}`);
  }
};

const generateLeadsReport = async (leads) => {
  const headers = [
    { id: 'id', title: 'ID' },
    { id: 'name', title: 'Name' },
    { id: 'email', title: 'Email' },
    { id: 'phone', title: 'Phone' },
    { id: 'company', title: 'Company' },
    { id: 'source', title: 'Source' },
    { id: 'status', title: 'Status' },
    { id: 'created_at', title: 'Created At' }
  ];

  return await exportToCSV(
    `leads_${Date.now()}.csv`,
    headers,
    leads
  );
};

const generateContactsReport = async (contacts) => {
  const headers = [
    { id: 'id', title: 'ID' },
    { id: 'name', title: 'Name' },
    { id: 'email', title: 'Email' },
    { id: 'phone', title: 'Phone' },
    { id: 'company', title: 'Company' },
    { id: 'title', title: 'Title' },
    { id: 'created_at', title: 'Created At' }
  ];

  return await exportToCSV(
    `contacts_${Date.now()}.csv`,
    headers,
    contacts
  );
};

const generateDealsReport = async (deals) => {
  const headers = [
    { id: 'id', title: 'ID' },
    { id: 'title', title: 'Title' },
    { id: 'value', title: 'Value' },
    { id: 'stage', title: 'Stage' },
    { id: 'probability', title: 'Probability %' },
    { id: 'close_date', title: 'Close Date' },
    { id: 'created_at', title: 'Created At' }
  ];

  return await exportToCSV(
    `deals_${Date.now()}.csv`,
    headers,
    deals
  );
};

module.exports = {
  exportToCSV,
  generateLeadsReport,
  generateContactsReport,
  generateDealsReport
};
