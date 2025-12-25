const express = require('express');
const app = express();
const admin = require('firebase-admin');
const path = require('path');

// === 關鍵修改：從環境變數讀取 Firebase 金鑰 ===
// 我們將在 Render 後台設定一個叫做 FIREBASE_KEY 的變數
// 如果沒有抓到變數(例如本地誤開)，就印出錯誤防止崩潰
let serviceAccount;
try {
    if (process.env.FIREBASE_KEY) {
        serviceAccount = JSON.parse(process.env.FIREBASE_KEY);
    } else {
        throw new Error("找不到 FIREBASE_KEY 環境變數");
    }
} catch (error) {
    console.error("Firebase 初始化失敗:", error.message);
}

// 只有成功讀取到金鑰才初始化
if (serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

// 設定 EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

// 路由
app.get('/', async (req, res) => {
    try {
        if (!serviceAccount) throw new Error("資料庫未連線");
        
        const booksRef = db.collection('book');
        const snapshot = await booksRef.get();
        const books = [];
        snapshot.forEach(doc => books.push({ id: doc.id, ...doc.data() }));

        res.render('index', { books: books });
    } catch (error) {
        console.error(error);
        // 如果連線失敗，至少回傳一個空陣列，不要讓網頁掛掉
        res.render('index', { books: [] });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
