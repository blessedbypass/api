const express = require('express');
const axios = require('axios');
const open = require('open');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 8080;
const CLIENT_ID = '6b6772befcbc4276a3b89ead01be629b';
const CLIENT_SECRET = 'fd8659a8521e4d85a6c04770fc9c9874';
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

let accessToken = '';

app.use(cookieParser());

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
};

app.get('/', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-playback-state';

  const queryParams = querystring.stringify({
    response_type: 'code',
    client_id: CLIENT_ID,
    scope,
    redirect_uri: REDIRECT_URI,
    state
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

app.get('/callback', async (req, res) => {
    const code = req.query.code || null;
  
    try {
      const response = await axios.post('https://accounts.spotify.com/api/token', querystring.stringify({
        code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }), {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
  
      accessToken = response.data.access_token;
      res.redirect('/spotify-status');
    } catch (error) {
      console.error('Erro ao obter token de acesso:', error);
      res.status(500).send('Erro ao autenticar com o Spotify.');
    }
  });

app.get('/spotify-status', async (req, res) => {
  if (!accessToken) {
    return res.status(401).json({ error: 'não autenticado. acesse / para se autenticar.' });
  }

  try {
    const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const track = response.data && response.data.item ? response.data.item.name : 'nenhuma música tocando...';
    res.json({ track });
  } catch (error) {
    console.error('erro ao obter informações do Spotify:', error);
    res.status(500).json({ error: 'erro ao obter informações da faixa.' });
  }
});

app.listen(PORT, () => {
  console.log(`[!] Spotify API rodando em http://localhost:${PORT}`);
  console.log(`[!] acesse http://localhost:${PORT} para autenticar.`);
});
