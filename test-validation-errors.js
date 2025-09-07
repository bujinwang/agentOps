// Test script to trigger validation errors

const testValidationErrors = async () => {
  console.log('Testing validation errors...\n');

  // Test 1: Invalid email format
  console.log('Test 1: Invalid email format');
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'invalid-email',
        password: 'TestPassword123',
        firstName: 'Test',
        lastName: 'User'
      }),
    });

    console.log('Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Validation error response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Network error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Weak password (less than 8 characters)
  console.log('Test 2: Weak password (less than 8 characters)');
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'weak',
        firstName: 'Test',
        lastName: 'User'
      }),
    });

    console.log('Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Validation error response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Network error:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Password without required complexity
  console.log('Test 3: Password without required complexity (no uppercase, lowercase, number)');
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'weakpassword',
        firstName: 'Test',
        lastName: 'User'
      }),
    });

    console.log('Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Validation error response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Network error:', error.message);
  }

  console.log('\n---\n');

  // Test 4: Missing required fields
  console.log('Test 4: Missing required fields');
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'TestPassword123'
        // missing firstName and lastName
      }),
    });

    console.log('Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Validation error response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Network error:', error.message);
  }

  console.log('\n---\n');

  // Test 5: Names with invalid characters
  console.log('Test 5: Names with invalid characters (numbers/symbols)');
  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'testnames' + Date.now() + '@example.com',
        password: 'TestPassword123',
        firstName: 'Test123',
        lastName: 'User@#$'
      }),
    });

    console.log('Response status:', response.status, response.statusText);
    const data = await response.json();
    console.log('Validation error response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Network error:', error.message);
  }
};

// Run the tests
testValidationErrors();