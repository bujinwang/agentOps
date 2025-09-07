// Test script to verify backend connectivity and registration endpoint

const testRegistration = async () => {
  const testUser = {
    email: 'testuser' + Date.now() + '@example.com',
    password: 'TestPassword123',
    firstName: 'Test',
    lastName: 'User'
  };

  console.log('Testing registration with backend server...');
  console.log('Test user data:', { ...testUser, password: '[REDACTED]' });

  try {
    const response = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Registration failed:', errorText);
      return;
    }

    const data = await response.json();
    console.log('Registration successful:', data);
    
    // Test login with the same credentials
    console.log('\nTesting login with the same credentials...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: testUser.email,
        password: testUser.password,
      }),
    });

    if (!loginResponse.ok) {
      const errorText = await loginResponse.text();
      console.error('Login failed:', errorText);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);

  } catch (error) {
    console.error('Network error:', error.message);
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure the backend server is running: npm run dev (in backend directory)');
    console.log('2. Check if port 3000 is available and not blocked by firewall');
    console.log('3. Verify database connection is working');
    console.log('4. Check backend logs for any startup errors');
  }
};

// Run the test
testRegistration();