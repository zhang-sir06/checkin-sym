const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();

console.log('开始启动服务器...');

// 配置静态文件服务和JSON解析
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 连接数据库
const db = new sqlite3.Database('./class_data.db', (err) => {
    if (err) {
        console.error('主数据库连接失败:', err);
        process.exit(1);
    }
    console.log('成功连接到主数据库');
});

const teacherDb = new sqlite3.Database('./teacher_data.db', (err) => {
    if (err) {
        console.error('教师数据库连接失败:', err);
        process.exit(1);
    }
    console.log('成功连接到教师数据库');
});
// 处理正常关闭
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('关闭数据库时发生错误:', err);
        } else {
            console.log('数据库连接已正常关闭');
        }
        process.exit(0);
    });
});

// API 路由
app.get('/api/dormitories', (req, res) => {
    console.log('收到获取寝室列表请求');
    const query = `
        SELECT DISTINCT dormitory_number 
        FROM class_data 
        ORDER BY dormitory_number
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('获取寝室列表失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.get('/api/members/:dormitory', (req, res) => {
    const dormitory = req.params.dormitory;
    console.log('收到获取寝室成员请求:', dormitory);
    
    const query = `
        SELECT 
            rowid as id,
            member_name,
            dormitory_number,
            class_name
        FROM class_data 
        WHERE dormitory_number = ?
        ORDER BY member_name
    `;
    
    db.all(query, [dormitory], (err, rows) => {
        if (err) {
            console.error('获取寝室成员失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/attendance', (req, res) => {
    const { dormitory, records, date, time } = req.body;
    console.log('收到签到记录:', { dormitory, records, date, time });
    
    // 使用 Promise 包装事务处理
    new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN TRANSACTION');
            
            const stmt = db.prepare(`
                INSERT INTO attendance_records 
                (member_name, dormitory_number, class_name, status, date, time) 
                SELECT member_name, dormitory_number, class_name, ?, ?, ?
                FROM class_data 
                WHERE rowid = ?
            `);

            try {
                Object.entries(records).forEach(([memberId, status]) => {
                    stmt.run(status, date, time, memberId);
                });
                
                stmt.finalize();
                
                db.run('COMMIT', (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            } catch (error) {
                stmt.finalize();
                db.run('ROLLBACK', () => {
                    reject(error);
                });
            }
        });
    })
    .then(() => {
        console.log('成功保存签到记录');
        res.json({ success: true, message: '签到记录已保存' });
    })
    .catch(error => {
        console.error('保存签到记录时发生错误:', error);
        res.status(500).json({ error: error.message });
    });
});

app.get('/api/attendance/history', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;
    
    console.log(`收到获取历史记录请求: 页码=${page}, 每页记录数=${pageSize}`);
    
    // 首先获取总记录数
    db.get('SELECT COUNT(*) as total FROM attendance_records', [], (err, row) => {
        if (err) {
            console.error('获取记录总数失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }
        
        const total = row.total;
        
        // 获取教师信息
        teacherDb.all('SELECT class_name, teacher_name FROM teacher_data', [], (err, teachers) => {
            if (err) {
                console.error('获取教师信息失败:', err);
                res.status(500).json({ error: err.message });
                return;
            }
            // 创建班级与教师的映射
            const teacherMap = {};
            teachers.forEach(teacher => {
                teacherMap[teacher.class_name] = teacher.teacher_name;
            });

            // 然后获取当前页的数据
            const query = `
                SELECT 
                    id,
                    date,
                    time,
                    dormitory_number,
                    member_name,
                    class_name,
                    status
                FROM attendance_records
                ORDER BY date DESC, time DESC
                LIMIT ? OFFSET ?
            `;
        
            db.all(query, [pageSize, offset], (err, rows) => {
                if (err) {
                    console.error('获取历史记录失败:', err);
                    res.status(500).json({ error: err.message });
                    return;
                }

                // 为每条记录添加教师信息
                const records = rows.map(record => ({
                    ...record,
                    teacher_name: teacherMap[record.class_name] || '未知'
                }));
                 
                res.json({
                    total: total,
                    currentPage: page,
                    pageSize: pageSize,
                    totalPages: Math.ceil(total / pageSize),
                    records: records
                });
                console.log('返回的历史记录数据:', records);

            });
        });
    });
});


// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({ error: '服务器内部错误' });
});

const PORT = 3000;
const server = app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
});

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
    console.error('未捕获的异常:', err);
    // 尝试优雅地关闭服务器
    server.close(() => {
        db.close(() => {
            console.error('由于错误，服务器已关闭');
            process.exit(1);
        });
    });
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('未处理的 Promise 拒绝:', reason);
});

// 删除选中的考勤记录
app.post('/api/attendance/delete', (req, res) => {
    const { ids } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: '没有选择要删除的记录' });
    }

    console.log('准备删除的记录 IDs:', ids);

    const placeholders = ids.map(() => '?').join(',');
    const query = `DELETE FROM attendance_records WHERE id IN (${placeholders})`;
    
    db.run(query, ids, function(err) {
        if (err) {
            console.error('删除记录失败:', err);
            return res.status(500).json({ error: '删除记录失败: ' + err.message });
        }
        console.log(`成功删除 ${this.changes} 条记录`);
        res.json({ 
            success: true, 
            message: `成功删除 ${this.changes} 条记录`,
            deletedCount: this.changes
        });
    });
});

app.get('/api/attendance/export', (req, res) => {
    const date = req.query.date;
    const status = req.query.status;
    const dormitory = req.query.dormitory;

    console.log(`收到导出记录请求: 日期=${date}, 状态=${status}, 寝室=${dormitory}`);

    // 获取教师信息
    teacherDb.all('SELECT class_name, teacher_name FROM teacher_data', [], (err, teachers) => {
        if (err) {
            console.error('获取教师信息失败:', err);
            res.status(500).json({ error: err.message });
            return;
        }

        // 创建班级与教师的映射
        const teacherMap = {};
        teachers.forEach(teacher => {
            teacherMap[teacher.class_name] = teacher.teacher_name;
        });

        // 构建查询条件
        let query = `
            SELECT 
                id,
                date,
                time,
                dormitory_number,
                member_name,
                class_name,
                status
            FROM attendance_records
            WHERE date = ? AND status = ?
        `;
        let params = [date, status];

        if (dormitory) {
            query += ' AND dormitory_number = ?';
            params.push(dormitory);
        }

        query += ' ORDER BY date DESC, time DESC';

        db.all(query, params, (err, rows) => {
            if (err) {
                console.error('获取记录失败:', err);
                res.status(500).json({ error: err.message });
                return;
            }

            // 为每条记录添加教师信息
            const records = rows.map(record => ({
                teacher_name: teacherMap[record.class_name] || '未知',
                member_name: record.member_name,
                class_name: record.class_name,
                date: record.date,
                time: record.time,
                status: record.status
            }));

            // 生成CSV文件内容
            const headers = ['teacher_name', 'member_name', 'class_name', 'date', 'time', 'status'];
            const csvContent = [headers.join(',')].concat(
                records.map(record => [
                    record.teacher_name,
                    record.member_name,
                    record.class_name,
                    record.date,
                    record.time,
                    record.status
                ].map(field => `"${field}"`).join(','))
            ).join('\n');

            // 添加UTF-8 BOM
            const bom = '\uFEFF';
            const finalContent = bom + csvContent;

            // 设置响应头
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename=attendance_records.csv');
            res.send(finalContent);
        });
    });
});