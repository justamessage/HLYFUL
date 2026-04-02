const https = require('https');

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

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

  const API_KEY = process.env.BREVO_API_KEY;
  const LIST_ID = parseInt(process.env.BREVO_LIST_ID);

  if (!API_KEY || !LIST_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server config missing' }) };
  }

  const payload = JSON.stringify({
    email: email,
    listIds: [LIST_ID],
    attributes: { BRAND: 'HLY FUL', SOURCE: 'coming-soon' },
    updateEnabled: true
  });

  return new Promise(function(resolve) {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/contacts',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': API_KEY,
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, function(res) {
      let body = '';
      res.on('data', function(chunk) { body += chunk; });
      res.on('end', function() {
        if (res.statusCode === 200 || res.statusCode === 201 || res.statusCode === 204) {
          resolve({
            statusCode: 200,
            body: JSON.stringify({ status: 'ok' })
          });
        } else {
          try {
            const parsed = JSON.parse(body);
            if (parsed.code === 'duplicate_parameter') {
              resolve({
                statusCode: 200,
                body: JSON.stringify({ status: 'duplicate' })
              });
            } else {
              resolve({
                statusCode: res.statusCode,
                body: JSON.stringify({ error: parsed.message || 'Brevo error' })
              });
            }
          } catch (e) {
            resolve({
              statusCode: 500,
              body: JSON.stringify({ error: 'Parse error' })
            });
          }
        }
      });
    });

    req.on('error', function(err) {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: 'Request failed: ' + err.message })
      });
    });

    req.write(payload);
    req.end();
  });
};
