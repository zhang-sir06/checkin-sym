// 存储签到状态的对象
const attendanceStatus = {};

// 初始化数据库连接
const db = openDatabase('AttendanceDB', '1.0', '寝室签到数据库', 2 * 1024 * 1024);

// 显示寝室成员
function showDormitoryMembers() {
    const dormitorySelect = document.getElementById("dormitory-select");
    const selectedDormitory = dormitorySelect.value;
    const memberListDiv = document.getElementById("member-list");

    // 清空之前的成员列表
    memberListDiv.innerHTML = "";

    if (selectedDormitory) {
        db.transaction(function(tx) {
            tx.executeSql(
                'SELECT * FROM class_data WHERE dormitory_number = ?', 
                [selectedDormitory], 
                function(tx, results) {
                    if(results.rows.length > 0) {
                        for(let i = 0; i < results.rows.length; i++) {
                            const member = results.rows.item(i);
                            
                            // 创建成员卡片
                            const memberCard = document.createElement("div");
                            memberCard.classList.add("member-card");

                            // 显示成员姓名
                            const nameHeading = document.createElement("h2");
                            nameHeading.textContent = member.name;
                            memberCard.appendChild(nameHeading);

                            // 创建选择签到状态的下拉框
                            const statusSelect = document.createElement("select");
                            statusSelect.classList.add("status-select");
                            statusSelect.innerHTML = `
                                <option value="on-time">正常</option>
                                <option value="absent">未到</option>
                                <option value="leave">请假</option>
                            `;
                            statusSelect.addEventListener("change", () => {
                                attendanceStatus[member.id] = statusSelect.value;
                            });

                            // 将下拉框添加到成员卡片中
                            memberCard.appendChild(statusSelect);
                            memberListDiv.appendChild(memberCard);

                            // 初始化状态为"正常"
                            attendanceStatus[member.id] = "on-time";
                        }
                    } else {
                        memberListDiv.innerHTML = '<p>该寝室暂无成员数据</p>';
                    }
                },
                function(tx, error) {
                    console.error('查询成员数据失败:', error);
                    memberListDiv.innerHTML = '<p>获取成员数据失败</p>';
                }
            );
        });
    }
}

// 提交签到状态
function submitAttendance() {
    const currentDate = new Date().toISOString().slice(0, 10);
    const currentTime = new Date().toTimeString().slice(0, 8);

    db.transaction(function(tx) {
        // 先检查今天是否已经提交过
        tx.executeSql(
            'SELECT COUNT(*) as count FROM attendance_records WHERE date = ?',
            [currentDate],
            function(tx, results) {
                if(results.rows.item(0).count > 0) {
                    if(!confirm('今天已经提交过签到，是否要重新提交？')) {
                        return;
                    }
                }
                
                // 提交新的签到记录
                Object.entries(attendanceStatus).forEach(([memberId, status]) => {
                    tx.executeSql(
                        'INSERT INTO attendance_records (student_id, status, date, time) VALUES (?, ?, ?, ?)',
                        [memberId, status, currentDate, currentTime],
                        function(tx, results) {
                            console.log(`签到记录已保存 - 学生ID: ${memberId}, 状态: ${status}`);
                        },
                        function(tx, error) {
                            console.error('保存签到记录失败:', error);
                        }
                    );
                });
            }
        );
    }, function(error) {
        // 事务错误回调
        console.error('签到事务失败:', error);
        alert('提交签到失败！');
    }, function() {
        // 事务成功回调
        alert('签到提交成功！');
        // 可以在这里添加成功后的其他操作
    });
}