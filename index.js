const express = require('express');
const cors = require('cors');  // cors 패키지 추가
const sqlite3 = require('sqlite3').verbose();
const app = express();

app.use(cors());  // CORS 미들웨어 사용
app.use(express.json());

const PORT = 3000;

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });

app.post('/articles', (req, res)=>{
    let {title, content} = req.body
    
    db.run(`INSERT INTO articles (title, content) VALUES (?, ?)`,
        [title, content],
        function(err) {
          if (err) {
            return res.status(500).json({error: err.message});
          }
          res.json({id: this.lastID, title, content});
        });
    });