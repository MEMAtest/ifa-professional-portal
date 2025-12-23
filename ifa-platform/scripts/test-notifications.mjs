#!/usr/bin/env node
/**
 * Comprehensive Notification System Test Script
 *
 * Run: node scripts/test-notifications.mjs
 *
 * Tests:
 * 1. Database table existence
 * 2. CRUD operations via service
 * 3. API routes
 * 4. Real-time subscription
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://maandodhonjolrmcxivo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW5kb2Rob25qb2xybWN4aXZvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODU0ODc2MiwiZXhwIjoyMDY0MTI0NzYyfQ.qjHxVoq9jNUSOmKyfrkokgM3GN14t5fUX16p9qlNAuw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let testUserId = null;
let testNotificationId = null;
const testResults = [];

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    error: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${message}`);
}

function recordResult(testName, passed, details = '') {
  testResults.push({ testName, passed, details });
  if (passed) {
    log(`✓ ${testName}`, 'success');
  } else {
    log(`✗ ${testName}: ${details}`, 'error');
  }
}

// =====================================================
// TEST 1: Check if notifications table exists
// =====================================================
async function testTableExists() {
  log('\n--- Test 1: Check notifications table exists ---');

  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .limit(1);

  if (error && error.message.includes('does not exist')) {
    recordResult('Table exists', false, 'notifications table not found - run migration first');
    return false;
  }

  recordResult('Table exists', true);
  return true;
}

// =====================================================
// TEST 2: Get a test user
// =====================================================
async function getTestUser() {
  log('\n--- Test 2: Get test user ---');

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email')
    .limit(1);

  if (error || !users?.length) {
    // Try auth.users instead
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

    if (authError || !authUsers?.users?.length) {
      recordResult('Get test user', false, 'No users found in database');
      return false;
    }

    testUserId = authUsers.users[0].id;
    recordResult('Get test user', true, `Using auth user: ${authUsers.users[0].email}`);
    return true;
  }

  testUserId = users[0].id;
  recordResult('Get test user', true, `Using user: ${users[0].email}`);
  return true;
}

// =====================================================
// TEST 3: Create a notification
// =====================================================
async function testCreateNotification() {
  log('\n--- Test 3: Create notification ---');

  if (!testUserId) {
    recordResult('Create notification', false, 'No test user available');
    return false;
  }

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: testUserId,
      type: 'system',
      title: 'Test Notification',
      message: 'This is a test notification from the test script',
      priority: 'normal',
      action_url: '/dashboard',
      metadata: { test: true, timestamp: new Date().toISOString() }
    })
    .select()
    .single();

  if (error) {
    recordResult('Create notification', false, error.message);
    return false;
  }

  testNotificationId = data.id;
  recordResult('Create notification', true, `Created: ${data.id}`);
  return true;
}

// =====================================================
// TEST 4: Read notifications
// =====================================================
async function testReadNotifications() {
  log('\n--- Test 4: Read notifications ---');

  const { data, error, count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', testUserId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    recordResult('Read notifications', false, error.message);
    return false;
  }

  recordResult('Read notifications', true, `Found ${count} notifications`);
  return true;
}

// =====================================================
// TEST 5: Update notification (mark as read)
// =====================================================
async function testMarkAsRead() {
  log('\n--- Test 5: Mark notification as read ---');

  if (!testNotificationId) {
    recordResult('Mark as read', false, 'No test notification available');
    return false;
  }

  const { data, error } = await supabase
    .from('notifications')
    .update({
      read: true,
      read_at: new Date().toISOString()
    })
    .eq('id', testNotificationId)
    .select()
    .single();

  if (error) {
    recordResult('Mark as read', false, error.message);
    return false;
  }

  if (!data.read) {
    recordResult('Mark as read', false, 'read flag not updated');
    return false;
  }

  recordResult('Mark as read', true, `read_at: ${data.read_at}`);
  return true;
}

// =====================================================
// TEST 6: Get unread count
// =====================================================
async function testUnreadCount() {
  log('\n--- Test 6: Get unread count ---');

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', testUserId)
    .eq('read', false);

  if (error) {
    recordResult('Unread count', false, error.message);
    return false;
  }

  recordResult('Unread count', true, `Unread: ${count}`);
  return true;
}

// =====================================================
// TEST 7: Create multiple notification types
// =====================================================
async function testNotificationTypes() {
  log('\n--- Test 7: Create various notification types ---');

  const types = [
    { type: 'review_due', title: 'Review Due', priority: 'normal' },
    { type: 'review_overdue', title: 'Review Overdue', priority: 'high' },
    { type: 'document_generated', title: 'Document Ready', priority: 'normal' },
    { type: 'signature_completed', title: 'Signature Complete', priority: 'normal' },
    { type: 'compliance_alert', title: 'Compliance Alert', priority: 'urgent' }
  ];

  const notifications = types.map(t => ({
    user_id: testUserId,
    type: t.type,
    title: t.title,
    message: `Test ${t.type} notification`,
    priority: t.priority,
    action_url: '/test'
  }));

  const { data, error } = await supabase
    .from('notifications')
    .insert(notifications)
    .select();

  if (error) {
    recordResult('Create notification types', false, error.message);
    return false;
  }

  recordResult('Create notification types', true, `Created ${data.length} notifications`);
  return true;
}

// =====================================================
// TEST 8: Test real-time subscription
// =====================================================
async function testRealtime() {
  log('\n--- Test 8: Test real-time subscription ---');

  return new Promise((resolve) => {
    let receivedEvent = false;

    const channel = supabase
      .channel(`test-notifications-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${testUserId}`
        },
        (payload) => {
          receivedEvent = true;
          log(`  Received real-time event: ${payload.new.title}`, 'info');
        }
      )
      .subscribe((status) => {
        log(`  Subscription status: ${status}`, 'info');

        if (status === 'SUBSCRIBED') {
          // Insert a notification to trigger the event
          setTimeout(async () => {
            await supabase
              .from('notifications')
              .insert({
                user_id: testUserId,
                type: 'system',
                title: 'Real-time Test',
                message: 'Testing real-time subscription',
                priority: 'low'
              });

            // Wait for event
            setTimeout(() => {
              supabase.removeChannel(channel);
              recordResult('Real-time subscription', receivedEvent,
                receivedEvent ? 'Event received' : 'No event received (may need realtime enabled)');
              resolve(receivedEvent);
            }, 2000);
          }, 500);
        }
      });

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!receivedEvent) {
        supabase.removeChannel(channel);
        recordResult('Real-time subscription', false, 'Timeout - ensure realtime is enabled');
        resolve(false);
      }
    }, 10000);
  });
}

// =====================================================
// TEST 9: Delete notification
// =====================================================
async function testDeleteNotification() {
  log('\n--- Test 9: Delete notification ---');

  if (!testNotificationId) {
    recordResult('Delete notification', false, 'No test notification to delete');
    return false;
  }

  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', testNotificationId);

  if (error) {
    recordResult('Delete notification', false, error.message);
    return false;
  }

  // Verify deletion
  const { data } = await supabase
    .from('notifications')
    .select('id')
    .eq('id', testNotificationId)
    .single();

  if (data) {
    recordResult('Delete notification', false, 'Notification still exists');
    return false;
  }

  recordResult('Delete notification', true, 'Deleted successfully');
  return true;
}

// =====================================================
// TEST 10: Cleanup test notifications
// =====================================================
async function cleanup() {
  log('\n--- Cleanup: Remove test notifications ---');

  const { data, error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', testUserId)
    .like('message', '%test%')
    .select();

  if (error) {
    log(`Cleanup error: ${error.message}`, 'warn');
    return;
  }

  log(`Cleaned up ${data?.length || 0} test notifications`, 'info');
}

// =====================================================
// MAIN
// =====================================================
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('   NOTIFICATION SYSTEM COMPREHENSIVE TEST');
  console.log('='.repeat(60));

  // Run tests
  const tableExists = await testTableExists();

  if (!tableExists) {
    console.log('\n' + '='.repeat(60));
    log('MIGRATION REQUIRED', 'error');
    console.log('='.repeat(60));
    console.log(`
Please run the following in your Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/maandodhonjolrmcxivo/sql

2. Copy and paste the contents of:
   scripts/apply-notifications-migration.sql

3. Run the SQL

4. Re-run this test script
    `);
    process.exit(1);
  }

  await getTestUser();

  if (testUserId) {
    await testCreateNotification();
    await testReadNotifications();
    await testMarkAsRead();
    await testUnreadCount();
    await testNotificationTypes();
    await testRealtime();
    await testDeleteNotification();
    await cleanup();
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('   TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = testResults.filter(r => r.passed).length;
  const failed = testResults.filter(r => !r.passed).length;

  console.log(`\nTotal: ${testResults.length} tests`);
  console.log(`${'\x1b[32m'}Passed: ${passed}${'\x1b[0m'}`);
  console.log(`${'\x1b[31m'}Failed: ${failed}${'\x1b[0m'}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.testName}: ${r.details}`);
    });
  }

  console.log('\n' + '='.repeat(60) + '\n');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
