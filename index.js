const express = require('express');
const app = express();
// cors 문제해결
const cors = require('cors');
app.use(cors());
// json으로 된 post의 바디를 읽기 위해 필요
app.use(express.json())
const jwt = require('jsonwebtoken');
const SECRET_KEY = "your_secret_key"; // 실제 서비스에선 더 복잡하고 안전하게!
const PORT = 3000;

//db 연결
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./database.db');

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  });
  
  app.post("/articles", (req, res) => {
    // 토큰 확인
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "인증 토큰이 필요합니다." });
    }
  
    const token = authHeader.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
      if (err) {
        return res.status(401).json({ error: "유효하지 않은 토큰입니다." });
      }
  
      // 인증 성공 -> 게시글 작성 처리
      const { title, content } = req.body;
  
      db.run(
        `INSERT INTO articles (title, content) VALUES (?, ?)`,
        [title, content],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          res.json({ id: this.lastID, title, content });
        }
      );
    });
  });

// 커밋 한번해주세요

// 전체 아티클 리스트 주는 api를 만들어주세요
// GET : /articles

app.get('/articles',(req, res)=>{

    db.all("SELECT * FROM articles", [], (err, rows) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json(rows);  // returns the list of articles
      });

})

// 개별 아티클을 주는 api를 만들어주세요 
// GET : /articles/:id
app.get('/articles/:id', (req, res)=>{
    let id = req.params.id

    db.get("SELECT * FROM articles WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ message: "Article not found" });
        }
        res.json(row);  // returns the article with the given id
    });

})


app.delete("/articles/:id", (req, res)=>{
  const id = req.params.id


  const sql = 'DELETE FROM articles WHERE id = ?';
  db.run(sql, id, function(err) {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ error: err.message });
    }
    // this.changes는 영향을 받은 행의 수
    res.json({ message: `총 ${this.changes}개의 아티클이 삭제되었습니다.` });
  });

})

app.put('/articles/:id', (req, res)=>{
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


// POST /articles/:id/comments 라우트
app.post("/articles/:id/comments", (req, res) => {
  const articleId = req.params.id;
  const content = req.body.content;
  
  // 현재 날짜/시간을 ISO 문자열 형태로 생성
  const createdAt = new Date().toISOString();

  // comments 테이블에 INSERT 쿼리 실행
  const sql = `INSERT INTO comments (content, created_at, article_id) VALUES (?, ?, ?)`;
  db.run(sql, [content, createdAt, articleId], function(err) {
    if (err) {
      console.error("댓글 삽입 중 에러 발생:", err);
      return res.status(500).json({ error: "댓글을 등록하는데 실패했습니다." });
    }

    // 삽입된 댓글의 id는 this.lastID에 저장됨.
    res.status(201).json({
      id: this.lastID,
      content: content,
      created_at: createdAt,
      article_id: articleId
    });
  });
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
        SECRET_KEY,                         // 비밀 키
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


  jwt.verify(token, SECRET_KEY, (err, decoded)=>{
    if(err){
      return res.send("에러!!!")
    }

    return res.send('로그인 성공!')

  })
})