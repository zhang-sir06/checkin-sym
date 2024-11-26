<?php
// 连接数据库
$db = new SQLite3('class_data.db');  // 替换为你的数据库文件路径

// 获取前端提交的 student_id
if (isset($_POST['student_id'])) {
    $student_id = $_POST['student_id'];

    // 插入签到记录，默认会插入当前时间
    $stmt = $db->prepare('INSERT INTO checkins (student_id, checkin_time) VALUES (:student_id, CURRENT_TIMESTAMP)');
    $stmt->bindValue(':student_id', $student_id, SQLITE3_TEXT);
    
    // 执行插入操作
    if ($stmt->execute()) {
        // 返回成功消息 
        echo json_encode(['message' => '签到成功！']);
    } else {
        // 返回失败消息
        echo json_encode(['message' => '签到失败，请稍后再试。']);
    }
} else {
    // 如果没有接收到 student_id
    echo json_encode(['message' => '缺少学号或姓名。']);
}
?>
