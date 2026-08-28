// 復習間隔（1日後、3日後、7日後、14日後、30日後）
const REVIEW_INTERVALS = [1, 3, 7, 14, 30];

// ローカルストレージからデータ取得
let tasks = JSON.parse(localStorage.getItem('ebbinghaus_tasks')) || [];

// 初期化
document.addEventListener('DOMContentLoaded', () => {
// 日付入力の初期値（今日）
const todayStr = new Date().toISOString().split('T')[0];
document.getElementById('learn-date').value = todayStr;

renderDashboard();
setupEventListeners();
});

// イベントリスナー設定
function setupEventListeners() {
  document.getElementById('add-form').addEventListener('submit', handleAddTask);
  document.getElementById('btn-export-ics').addEventListener('click', exportToICS);
}

// タスク追加処理
function handleAddTask(e) {
e.preventDefault();
const title = document.getElementById('title').value;
const learnDateStr = document.getElementById('learn-date').value;

const newTask = {
id: Date.now().toString(),
title,
learnDate: learnDateStr,
reviews: REVIEW_INTERVALS.map(days => {
const targetDate = new Date(learnDateStr);
targetDate.setDate(targetDate.getDate() + days);
return {
days,
date: targetDate.toISOString().split('T')[0],
completed: false
};
})
};

tasks.push(newTask);
saveTasks();
renderDashboard();

document.getElementById('title').value = '';
}

// タスク削除処理
function deleteTask(taskId) {
if (confirm('この学習項目を削除してもよろしいですか？')) {
tasks = tasks.filter(task => task.id !== taskId);
saveTasks();
renderDashboard();
}
}

// タスク編集処理
function editTask(taskId) {
const task = tasks.find(t => t.id === taskId);
if (!task) return;

const newTitle = prompt('新しい科目・単元名を入力してください:', task.title);
if (newTitle && newTitle.trim() !== '') {
task.title = newTitle.trim();
saveTasks();
renderDashboard();
}
}

// 保存
function saveTasks() {
localStorage.setItem('ebbinghaus_tasks', JSON.stringify(tasks));
}

// 画面再描画
function renderDashboard() {
const todayStr = new Date().toISOString().split('T')[0];

const todayListEl = document.getElementById('today-list');
const futureScheduleEl = document.getElementById('future-schedule');

todayListEl.innerHTML = '';
futureScheduleEl.innerHTML = '';

let todayTotal = 0;
let todayCompleted = 0;

const futureMap = {};

tasks.forEach(task => {
task.reviews.forEach(review => {
if (review.date === todayStr) {
todayTotal++;
if (review.completed) todayCompleted++;

// 今日の復習カード作成
const itemEl = createItemRow(task.title, `${review.days}日後の復習`, review.completed, () => {
review.completed = !review.completed;
saveTasks();
renderDashboard();
});
todayListEl.appendChild(itemEl);
} else if (review.date > todayStr) {
if (!futureMap[review.date]) futureMap[review.date] = [];
futureMap[review.date].push({
taskId: task.id,
title: task.title,
days: review.days,
completed: review.completed
});
}
});
});

// 今日の復習が空の場合
if (todayTotal === 0) {
todayListEl.innerHTML = '<div class="empty-state">🎉 今日やるべき復習はありません！</div>';
}

// 達成率ゲージの更新
const percent = todayTotal === 0 ? 100 : Math.round((todayCompleted / todayTotal) * 100);
document.getElementById('progress-bar').style.width = `${percent}%`;
document.getElementById('progress-percent').innerText = `${percent}%`;

// 未来スケジュールの表示（日付昇順）
const sortedDates = Object.keys(futureMap).sort();
if (sortedDates.length === 0) {
futureScheduleEl.innerHTML = '<div class="empty-state">今後の予定はありません。</div>';
} else {
sortedDates.forEach(date => {
const groupEl = document.createElement('div');
groupEl.className = 'date-group';

const headerEl = document.createElement('div');
headerEl.className = 'date-header';
headerEl.innerText = `${date}`;
groupEl.appendChild(headerEl);

const listEl = document.createElement('div');
listEl.className = 'item-list';

futureMap[date].forEach(item => {
const row = createItemRow(item.title, `${item.days}日後`, item.completed, null, item.taskId);
listEl.appendChild(row);
});

groupEl.appendChild(listEl);
futureScheduleEl.appendChild(groupEl);
});
}
}

// 行エレメント生成Helper
function createItemRow(title, badgeText, isCompleted, onToggle, taskId = null) {
const row = document.createElement('div');
row.className = 'item-row';

const info = document.createElement('div');
info.className = 'item-info';

const titleEl = document.createElement('span');
titleEl.className = 'item-title';
titleEl.innerText = title;

const badge = document.createElement('span');
badge.className = 'item-badge';
badge.innerText = badgeText;

info.appendChild(titleEl);
info.appendChild(badge);
row.appendChild(info);

// ボタン格納用エリア
const actionArea = document.createElement('div');
actionArea.style.display = 'flex';
actionArea.style.gap = '8px';
actionArea.style.alignItems = 'center';

// 「今日の復習」用の完了ボタン
if (onToggle) {
const btn = document.createElement('button');
btn.className = `btn-complete ${isCompleted ? 'done' : ''}`;
btn.innerText = isCompleted ? '完了済' : '完了';
btn.addEventListener('click', onToggle);
actionArea.appendChild(btn);
}

// スケジュール一覧用の編集・削除ボタン
if (taskId) {
const editBtn = document.createElement('button');
editBtn.innerText = '✏️';
editBtn.title = '編集';
editBtn.style.background = 'transparent';
editBtn.style.border = 'none';
editBtn.style.cursor = 'pointer';
editBtn.style.fontSize = '1.1rem';
editBtn.addEventListener('click', () => editTask(taskId));

const deleteBtn = document.createElement('button');
deleteBtn.innerText = '🗑️';
deleteBtn.title = '削除';
deleteBtn.style.background = 'transparent';
deleteBtn.style.border = 'none';
deleteBtn.style.cursor = 'pointer';
deleteBtn.style.fontSize = '1.1rem';
deleteBtn.addEventListener('click', () => deleteTask(taskId));

actionArea.appendChild(editBtn);
actionArea.appendChild(deleteBtn);
}

row.appendChild(actionArea);

return row;
}

// .ics ファイル生成およびダウンロード（朝8時のみ・連打防止版）
function exportToICS() {
  if (tasks.length === 0) {
    alert('登録された学習項目がありません。');
    return;
  }

  // 1. 日付ごとに復習タスクをグループ化する
  const dateMap = {};

  tasks.forEach(task => {
    task.reviews.forEach(review => {
      if (!dateMap[review.date]) {
        dateMap[review.date] = [];
      }
      dateMap[review.date].push({
        title: task.title,
        days: review.days,
        completed: review.completed
      });
    });
  });

  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ebbinghaus Review App//JP'
  ];

  // 2. 日付ごとに1つだけ「朝8時」のイベントを作成
  Object.keys(dateMap).forEach(dateStr => {
    const cleanDate = dateStr.replace(/-/g, '');
    const dayTasks = dateMap[dateStr];

    // その日にやるべきタスクの概要テキスト（カレンダーの詳細欄用）
    const taskSummaryList = dayTasks.map(t => `・${t.title}（${t.days}日後）`).join('\\n');

    // --- 朝8時の通知イベント（1日1回のみ） ---
    icsContent.push('BEGIN:VEVENT');
    // 通知画面に表示されるタイトル
    icsContent.push('SUMMARY:☀️ おはようございます！ 今日は復習があります。');
    icsContent.push(`DTSTART;VALUE=DATE:${cleanDate}`);
    icsContent.push(`DESCRIPTION:【本日の復習内容】\\n${taskSummaryList}`);
    
    // 朝8時のアラーム設定
    icsContent.push('BEGIN:VALARM');
    icsContent.push('ACTION:DISPLAY');
    icsContent.push('DESCRIPTION:朝のリマインド');
    icsContent.push('TRIGGER;RELATED=START:+PT8H'); // 当日0時から+8時間（朝8時）
    icsContent.push('END:VALARM');
    icsContent.push('END:VEVENT');
  });

  icsContent.push('END:VCALENDAR');

  // ファイルのダウンロード処理
  const blob = new Blob([icsContent.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'ebbinghaus_schedule.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
