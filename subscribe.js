exports.handler = async function(event) {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse email from request
  let email;
  try {
    const data = JSON.parse(event.body);
    email = data.email;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  if (!email) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) };
  }

  // API key and list ID from Netlify environment variables
  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID);

  if (!API_KEY || !LIST_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server config missing' }) };
  }

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': API_KEY
      },
      body: JSON.stringify({
        email: email,
        listIds: [LIST_ID],
        attributes: { BRAND: 'HLY FUL', SOURCE: 'coming-soon' },
        updateEnabled: true
      })
    });

    if (response.ok || response.status === 201 || response.status === 204) {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ok' })
      };
    }

    const result = await response.json();

    if (result.code === 'duplicate_parameter') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'duplicate' })
      };
    }

    return {
      statusCode: response.status,
      body: JSON.stringify({ error: result.message || 'Brevo error' })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server error' })
    };
  }
};
