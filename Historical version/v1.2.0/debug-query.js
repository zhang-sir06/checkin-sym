const sqlite3 = require('sqlite3').verbose();

// 连接到数据库
const db = new sqlite3.Database('./class_data.db', (err) => {
    if (err) {
        console.error('连接数据库失败:', err);
        return;
    }
    console.log('成功连接到数据库');
    
    // 1. 测试寝室号查询
    console.log('\n1. 测试获取寝室列表:');
    db.all('SELECT DISTINCT dormitory_number FROM class_data ORDER BY dormitory_number', [], (err, rows) => {
        if (err) {
            console.error('查询失败:', err);
        } else {
            console.log('寝室列表:', rows);
        }
        
        // 2. 测试特定寝室的成员查询
        if (rows && rows.length > 0) {
            const testDorm = rows[0].dormitory_number;
            console.log(`\n2. 测试获取寝室 ${testDorm} 的成员:`);
            
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
            
            db.all(query, [testDorm], (err, members) => {
                if (err) {
                    console.error('查询失败:', err);
                } else {
                    console.log('成员列表:', members);
                }
                
                // 3. 测试 rowid 查询
                console.log('\n3. 测试 rowid 查询:');
                db.get('SELECT rowid, * FROM class_data LIMIT 1', [], (err, row) => {
                    if (err) {
                        console.error('查询失败:', err);
                    } else {
                        console.log('示例行（包含rowid）:', row);
                    }
                    
                    // 关闭数据库连接
                    db.close(() => {
                        console.log('\n数据库连接已关闭');
                    });
                });
            });
        }
    });
});