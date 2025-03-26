const express = require('express');
const app = express();
// cors 문제해결
const cors = require('cors');
app.use(cors());
// json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json())
const jwt = require('jsonwebtoken');
const PORT = 3000;

require('dotenv').config();
const secretKey = process.env.SECRET_KEY;

//db 연결
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send('인증 헤더 없음');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res.status(401).send('토큰 검증 실패');
    }

    // 인증 성공 시 decoded 안에 있는 사용자 정보 req에 저장
    req.user = decoded;
    next(); // 다음 미들웨어 or 라우터로
  });
}

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
  app.post("/articles", authMiddleware, (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;  // 인증된 사용자 ID
  
    // 게시글을 users의 id와 함께 저장
    db.run(
      "INSERT INTO articles (title, content, user_id) VALUES (?, ?, ?)",
      [title, content, userId],
      function (err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, title, content, user_id: userId });
      }
    );
  });

  app.get('/articles', (req, res) => {
    db.all("SELECT articles.*, users.email FROM articles JOIN users ON articles.user_id = users.id", [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);  // 게시글 목록과 함께 사용자 이메일도 반환
    });
  });


app.get('/articles/:id', (req, res) => {
  let id = req.params.id;

  db.get("SELECT articles.*, users.email FROM articles JOIN users ON articles.user_id = users.id WHERE articles.id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Article not found" });
    }
    res.json(row);  // 게시글과 사용자 이메일 함께 반환
  });
});

app.delete("/articles/:id", authMiddleware, (req, res) => {
  const id = req.params.id;
  const requestUserId = req.user.id;  // 인증된 사용자의 ID
  
  // 게시글 작성자의 user_id를 확인하기 위한 SQL
  const checkAuthorSql = 'SELECT user_id FROM articles WHERE id = ?';

  db.get(checkAuthorSql, [id], (err, row) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }

    if (!row) {
      return res.status(404).json({ message: '게시글을 찾을 수 없습니다.' });
    }

    const articleUserId = row.user_id;  // 게시글 작성자의 ID

    // 요청한 사용자 ID와 게시글 작성자 ID가 일치하지 않으면 권한이 없다고 응답
    if (requestUserId !== articleUserId) {
      return res.status(403).json({ message: '권한이 없습니다.' });
    }

    // 요청한 사용자와 게시글 작성자가 일치하면 삭제 진행
    const sql = 'DELETE FROM articles WHERE id = ?';
    db.run(sql, id, function (err) {
      if (err) {
        console.error(err.message);
        return res.status(500).json({ error: err.message });
      }

      // this.changes는 영향을 받은 행의 수
      res.json({ message: `총 ${this.changes}개의 아티클이 삭제되었습니다.` });
    });
  });
});

app.put('/articles/:id', authMiddleware, (req, res)=>{
  let id = req.params.id
  // let title = req.body.title
  // let content = req.body.content
  let {title, content} = req.body
 // SQL 업데이트 쿼리 (파라미터 바인딩 사용)
 const sql = 'UPDATE articles SET title = ?, content = ? WHERE id = ?';
 db.run(sql, [title, content, id], function(err) {
   if (err) {
     console.error('업데이트 에러:', err.message);
     return res.status(500).json({ error: err.message });
   }
   // this.changes: 영향을 받은 행의 수
   res.json({ message: '게시글이 업데이트되었습니다.', changes: this.changes });
 });

})





app.get('/gettest/:id', (req, res)=>{

  console.log(req.query)
  console.log(req.params.id)


  res.send("ok")
})


app.post('/posttest', (req, res)=>{
  console.log(req.body)
  res.send("ok")
})


app.post("/articles/:id/comments", authMiddleware, (req, res) => {
  const articleId = req.params.id;
  const content = req.body.content;
  const userId = req.user.id;  // 인증된 사용자 ID
  const createdAt = new Date().toISOString();

  const sql = "INSERT INTO comments (content, created_at, article_id, user_id) VALUES (?, ?, ?, ?)";
  db.run(sql, [content, createdAt, articleId, userId], function (err) {
    if (err) {
      console.error("댓글 삽입 중 에러 발생:", err);
      return res.status(500).json({ error: "댓글을 등록하는데 실패했습니다." });
    }

    res.status(201).json({
      id: this.lastID,
      content: content,
      created_at: createdAt,
      article_id: articleId,
      user_id: userId
    });
  });
});

app.get("/articles/:id/comments", (req, res) => {
  const articleId = req.params.id;

  db.all(
    "SELECT comments.*, users.email FROM comments JOIN users ON comments.user_id = users.id WHERE comments.article_id = ?",
    [articleId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);  // 댓글 목록과 함께 사용자 이메일도 반환
    }
  );
});

const bcrypt = require('bcrypt');
const saltRounds = 10; // 일반적으로 10이면 충분함

app.post('/users', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Email and password are required.");
  }

  // 비밀번호 해싱
  bcrypt.hash(password, saltRounds, (err, hashedPassword) => {
    if (err) {
      return res.status(500).send("Error hashing password");
    }

    const query = `INSERT INTO users (email, password) VALUES (?, ?)`;

    db.run(query, [email, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.status(409).send("Email already exists.");
        }
        return res.status(500).send("Database error: " + err.message);
      }

      res.status(201).send({
        id: this.lastID,
        email,
      });
    });
  });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("이메일과 패스워드를 입력해주세요");
  }

  const query = `SELECT * FROM users WHERE email = ?`;

  db.get(query, [email], (err, user) => {
    if (err) {
      return res.status(500).send("DB 오류: " + err.message);
    }

    if (!user) {
      return res.status(404).send("이메일이 없습니다");
    }

    // 비밀번호 비교
    bcrypt.compare(password, user.password, (err, result) => {
      if (err) {
        return res.status(500).send("비밀번호 확인 중 오류 발생");
      }

      if (!result) {
        return res.status(401).send("패스워드가 틀립니다");
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        { id: user.id, email: user.email }, // payload
        secretKey,                         // 비밀 키
        { expiresIn: '1h' }                 // 옵션: 1시간 유효
      );

      // 성공 응답
      res.send({
        message: "로그인 성공!",
        token: token
      });
    });
  });
});

app.get('/logintest', (req, res)=>{
  console.log(req.headers.authorization.split(' ')[1])
  let token = req.headers.authorization.split(' ')[1]


  jwt.verify(token, secretKey, (err, decoded)=>{
    if(err){
      return res.send("에러!!!")
    }

    return res.send('로그인 성공!')

  })
})