const sqlite3 = require('sqlite3').verbose();

// 连接到数据库
const db = new sqlite3.Database('./class_data.db', (err) => {
    if (err) {
        console.error('数据库连接失败:', err);
        process.exit(1);
    }
    console.log('成功连接到数据库');
    deleteAllRecords();
});

// 删除所有记录
function deleteAllRecords() {
    const query = `
        DELETE FROM attendance_records
    `;

    db.run(query, (err) => {
        if (err) {
            console.error('删除记录失败:', err);
            process.exit(1);
        }
        console.log('所有记录已成功删除');

        // 关闭数据库连接
        db.close((err) => {
            if (err) {
                console.error('关闭数据库时发生错误:', err);
            } else {
                console.log('数据库连接已正常关闭');
            }
        });
    });
}