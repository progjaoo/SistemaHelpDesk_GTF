import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const port = Number(process.env.PORT || 3333);
const host = process.env.HOST || '127.0.0.1';

app.listen(port, host, () => {
  console.log(`API do Sistema de Chamados rodando em http://${host}:${port}`);
});
