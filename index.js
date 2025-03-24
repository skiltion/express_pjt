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

app.get('/articles', (req, res) => {
    db.all(`SELECT * FROM articles`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({error: err.message});
      }
      res.json(rows);
    });
  });
  
app.get('/articles/:id', (req, res) => {
  const id = req.params.id;
  
  db.get(`SELECT * FROM articles WHERE id = ?`, [id], (err, row) =>{
    if(err) {
      return res.status(500).json({error: err.message});
    }
    if(!row){
      return res.status(404).json({error: '데이터가 없습니다.'});
    }
    res.json(row)
  })
})

app.delete('/articles/:id', (req, res) => {
  const articleId = req.params.id; // URL 파라미터에서 'id' 값 가져오기

  // SQL DELETE 쿼리 실행
  const query = `DELETE FROM articles WHERE id = ?`;

  db.run(query, [articleId], function (err) {
    if (err) {
      console.error("Error deleting article", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
    
    // 삭제된 행의 수가 0일 경우 해당 아티클이 없다는 응답
    if (this.changes === 0) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json({ message: "Article deleted successfully" });
  });
});

// 게시글 수정 라우트
app.put('/articles/:id', (req, res) => {
  const id = req.params.id;      // URL에서 id 가져오기
  const { title, content } = req.body;  // 요청 본문에서 title과 content 가져오기

  // 유효성 검사 (title과 content가 존재하는지 확인)
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  // SQL UPDATE 쿼리 작성
  const query = `
    UPDATE articles
    SET title = ?, content = ?
    WHERE id = ?
  `;

  // 쿼리 실행
  db.run(query, [title, content, id], function (err) {
    if (err) {
      console.error("Error updating article", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    // 수정된 행의 수가 0이면 해당 게시글을 찾을 수 없다는 응답
    if (this.changes === 0) {
      return res.status(404).json({ message: "Article not found" });
    }

    res.status(200).json({ message: "Article updated successfully" });
  });
});

app.post("/articles/:id/comments", (req, res) => {
  const article_id = req.params.id; // URL에서 article_id 가져오기
  const content = req.body.content; // 요청 본문에서 댓글 내용 가져오기

  // 댓글 내용이 없으면 에러 응답
  if (!content) {
    return res.status(400).send("Content is required");
  }

  // 댓글을 DB에 삽입
  const created_at = new Date().toISOString(); // 댓글 작성 시각

  const sql = `INSERT INTO comments (content, created_at, article_id) VALUES (?, ?, ?)`;
  db.run(sql, [content, created_at, article_id], function (err) {
    if (err) {
      console.error(err.message);
      return res.status(500).send("Failed to add comment");
    }

    // 성공적으로 추가된 경우
    res.status(201).send({ message: "Comment added successfully", commentId: this.lastID });
  });
});

app.get('/articles/:id/comments', (req, res) => {
    db.all(`SELECT * FROM comments`, [], (err, row) =>{
      if(err) {
        return res.status(500).json({error: err.message});
      }
      res.json(row)
    })
})

app.get(`/articles/:id/comments/:comments_id`, (req,res) =>{
  const article_id = req.params.comments_id
    db.get(`SELECT * FROM comments WHERE id = ?`, [article_id], (err, row) =>{
      if (err) {
        return res. status(500).json({error: err.message});
      }
      if(!row){
        return res.status(404).json({error: '데이터가 없습니다.'});
      }
      res.json(row)
    })
})