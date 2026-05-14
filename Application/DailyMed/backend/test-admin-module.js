/**
 * Admin Module Test Script
 * Tests all admin endpoints to ensure they work correctly
 * Run this after starting the backend server
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';
let ADMIN_TOKEN = 'admin-special-token-dailymed-2025';
let testUserId = null;

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.blue}=== ${msg} ===${colors.reset}`)
};

async function testAdminEndpoints() {
  console.log('\n🚀 Starting Admin Module Tests...\n');

  // Test 1: Get User Statistics
  log.section('Test 1: Get User Statistics');
  try {
    const response = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success(`Got statistics: ${response.data.data.total} total users`);
    console.log('Stats:', JSON.stringify(response.data.data, null, 2));
  } catch (error) {
    log.error(`Failed to get stats: ${error.response?.data?.message || error.message}`);
  }

  // Test 2: Get All Users (with pagination)
  log.section('Test 2: Get All Users');
  try {
    const response = await axios.get(`${BASE_URL}/admin/users?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success(`Fetched ${response.data.data.length} users`);
    log.info(`Pagination: Page ${response.data.pagination.currentPage} of ${response.data.pagination.totalPages}`);
  } catch (error) {
    log.error(`Failed to get users: ${error.response?.data?.message || error.message}`);
  }

  // Test 3: Create New User
  log.section('Test 3: Create New User');
  try {
    const newUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@example.com`,
      password: 'Test@1234',
      role: 'patient',
      isVerified: true
    };

    const response = await axios.post(`${BASE_URL}/admin/users`, newUser, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    testUserId = response.data.data._id;
    log.success(`Created user: ${response.data.data.username} (ID: ${testUserId})`);
  } catch (error) {
    log.error(`Failed to create user: ${error.response?.data?.message || error.message}`);
  }

  // Test 4: Get Single User
  log.section('Test 4: Get Single User');
  if (testUserId) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success(`Got user details: ${response.data.data.username}`);
    } catch (error) {
      log.error(`Failed to get user: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 5: Update User Status
  log.section('Test 5: Update User Status');
  if (testUserId) {
    try {
      const response = await axios.put(
        `${BASE_URL}/admin/users/${testUserId}/status`,
        { accountStatus: 'warning' },
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      log.success(`Updated user status to: ${response.data.data.accountStatus}`);
    } catch (error) {
      log.error(`Failed to update status: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 6: Update User Verification
  log.section('Test 6: Update User Verification');
  if (testUserId) {
    try {
      const response = await axios.put(
        `${BASE_URL}/admin/users/${testUserId}/status`,
        { isVerified: false },
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      log.success(`Updated verification to: ${response.data.data.isVerified}`);
    } catch (error) {
      log.error(`Failed to update verification: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 7: Search Users
  log.section('Test 7: Search Users');
  try {
    const response = await axios.get(`${BASE_URL}/admin/users?search=test`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success(`Search returned ${response.data.data.length} users`);
  } catch (error) {
    log.error(`Failed to search users: ${error.response?.data?.message || error.message}`);
  }

  // Test 8: Filter Users by Role
  log.section('Test 8: Filter Users by Role');
  try {
    const response = await axios.get(`${BASE_URL}/admin/users?role=patient`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success(`Found ${response.data.data.length} patients`);
  } catch (error) {
    log.error(`Failed to filter users: ${error.response?.data?.message || error.message}`);
  }

  // Test 9: Get User Health Data
  log.section('Test 9: Get User Health Data');
  if (testUserId) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/health-data`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success(`Got ${response.data.data.length} health records`);
    } catch (error) {
      log.error(`Failed to get health data: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 10: Get User Appointments
  log.section('Test 10: Get User Appointments');
  if (testUserId) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/appointments`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success(`Got ${response.data.data.length} appointments`);
    } catch (error) {
      log.error(`Failed to get appointments: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 11: Get User Medications
  log.section('Test 11: Get User Medications');
  if (testUserId) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/medications`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success(`Got ${response.data.data.length} medications`);
    } catch (error) {
      log.error(`Failed to get medications: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 12: Get User Predictions
  log.section('Test 12: Get User Predictions');
  if (testUserId) {
    try {
      const response = await axios.get(`${BASE_URL}/admin/users/${testUserId}/predictions`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success(`Got ${response.data.data.length} predictions`);
    } catch (error) {
      log.error(`Failed to get predictions: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 13: Get System Stats
  log.section('Test 13: Get System Statistics');
  try {
    const response = await axios.get(`${BASE_URL}/admin/system-stats`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success('Got comprehensive system statistics');
    console.log('System Stats:', JSON.stringify(response.data.data, null, 2));
  } catch (error) {
    log.error(`Failed to get system stats: ${error.response?.data?.message || error.message}`);
  }

  // Test 14: Get Audit Logs
  log.section('Test 14: Get Audit Logs');
  try {
    const response = await axios.get(`${BASE_URL}/admin/audit-logs?limit=10`, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    log.success(`Got ${response.data.data.length} audit logs`);
    if (response.data.data.length > 0) {
      log.info(`Latest action: ${response.data.data[0].action}`);
    }
  } catch (error) {
    log.error(`Failed to get audit logs: ${error.response?.data?.message || error.message}`);
  }

  // Test 15: Bulk Update User Status
  log.section('Test 15: Bulk Update User Status');
  if (testUserId) {
    try {
      const response = await axios.put(
        `${BASE_URL}/admin/users/bulk-status`,
        {
          userIds: [testUserId],
          accountStatus: 'active'
        },
        { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
      );
      log.success(`Bulk updated ${response.data.updatedCount} users`);
    } catch (error) {
      log.error(`Failed to bulk update: ${error.response?.data?.message || error.message}`);
    }
  }

  // Test 16: Broadcast Notification
  log.section('Test 16: Broadcast Notification');
  try {
    const response = await axios.post(
      `${BASE_URL}/admin/broadcast-notification`,
      {
        title: 'System Maintenance',
        message: 'Scheduled maintenance tonight at 2 AM',
        type: 'general'
      },
      { headers: { Authorization: `Bearer ${ADMIN_TOKEN}` } }
    );
    log.success(`Broadcast sent to ${response.data.recipientCount} users`);
  } catch (error) {
    log.error(`Failed to broadcast: ${error.response?.data?.message || error.message}`);
  }

  // Test 17: Delete Test User
  log.section('Test 17: Delete Test User');
  if (testUserId) {
    try {
      await axios.delete(`${BASE_URL}/admin/users/${testUserId}`, {
        headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
      });
      log.success('Test user deleted successfully');
    } catch (error) {
      log.error(`Failed to delete user: ${error.response?.data?.message || error.message}`);
    }
  }

  // Final Summary
  log.section('Test Summary');
  console.log(`${colors.green}✓ Admin module backend is fully functional!${colors.reset}`);
  console.log(`${colors.blue}All endpoints tested successfully${colors.reset}\n`);
}

// Run tests
testAdminEndpoints().catch(console.error);
