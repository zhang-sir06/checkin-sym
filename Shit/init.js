// 初始化数据库
const db = openDatabase('AttendanceDB', '1.0', '寝室签到数据库', 2 * 1024 * 1024);

// 初始化数据库表和数据
function initDatabase() {
    db.transaction(function(tx) {
        // 创建班级数据表
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS class_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                dormitory_number TEXT NOT NULL,
                student_id TEXT UNIQUE
            )
        `);

        // 创建签到记录表
        tx.executeSql(`
            CREATE TABLE IF NOT EXISTS attendance_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                status TEXT NOT NULL,
                date DATE NOT NULL,
                time TIME NOT NULL
            )
        `);

        // 检查是否需要插入初始数据
        tx.executeSql('SELECT COUNT(*) as count FROM class_data', [], function(tx, results) {
            if(results.rows.item(0).count === 0) {
                // 插入示例数据
                const initialData = [
                    ['张三', '101', '2021001'],
                    ['李四', '101', '2021002'],
                    ['王五', '101', '2021003'],
                    ['赵六', '102', '2021004'],
                    ['钱七', '102', '2021005'],
                    ['孙八', '103', '2021006']
                ];

                initialData.forEach(([name, dormitory, studentId]) => {
                    tx.executeSql(
                        'INSERT INTO class_data (name, dormitory_number, student_id) VALUES (?, ?, ?)',
                        [name, dormitory, studentId]
                    );
                });

                console.log('初始数据已插入');
            }
        });
    }, function(error) {
        console.error('数据库初始化失败:', error);
    }, function() {
        console.log('数据库初始化成功！');
    });
}

// 页面加载时初始化数据库
document.addEventListener('DOMContentLoaded', initDatabase);