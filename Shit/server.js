const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const db = new sqlite3.Database('./class_data.db');

// 中间件
app.use(cors());
app.use(bodyParser.json());

// 获取寝室成员数据
app.get('/api/members/:dormitory_number', (req, res) => {
    const dormitoryNumber = req.params.dormitory_number;
    db.all('SELECT * FROM class_data WHERE dormitory_number = ?', [dormitoryNumber], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});
/////////////////////
// 提交签到结果
app.post('/api/attendance', (req, res) => {
    const attendance = req.body;  // { memberId: "status" }
    console.log("签到数据:", attendance);
    // 在这里可以将数据存储到数据库
    res.json({ message: "签到数据已保存" });
});

app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});


