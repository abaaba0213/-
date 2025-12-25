// 1. 引入 Firebase 與相關模組
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, updateDoc, arrayUnion, arrayRemove, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 2. Firebase Config (使用你提供的 Key)
const firebaseConfig = {
    apiKey: "AIzaSyCS3FCuhJU-0MsnsVn4T1b85SFznW_XLrs",
    authDomain: "book-recommendation-syst-178cb.firebaseapp.com",
    projectId: "book-recommendation-syst-178cb",
    storageBucket: "book-recommendation-syst-178cb.firebasestorage.app",
    messagingSenderId: "184709716840",
    appId: "1:184709716840:web:27fdfeae38d6ec4fee94dd",
    measurementId: "G-XLF0VK5VCW"
};

// 3. 初始化 Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); // 初始化驗證服務
const provider = new GoogleAuthProvider(); // Google 登入提供者

// 4. 狀態管理
const appState = {
    books: [],
    user: null, // 存目前登入的使用者
    likedBookIds: [], // 存使用者按讚的書 ID
    filter: 'all',
    searchKeyword: ''
};

// DOM 元素
const bookGrid = document.getElementById('book-grid');
const loadingEl = document.getElementById('loading');
const loginBtn = document.getElementById('login-btn');
const userInfoEl = document.getElementById('user-info');
const userNameEl = document.getElementById('user-name');
const logoutBtn = document.getElementById('logout-btn');
const modal = document.getElementById('book-modal');
const closeModalBtn = document.querySelector('.close-modal');

// === 初始化 ===
async function init() {
    // A. 監聽登入狀態改變
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 已登入
            appState.user = user;
            loginBtn.classList.add('hidden');
            userInfoEl.classList.remove('hidden');
            userNameEl.innerText = `Hi, ${user.displayName}`;
            await loadUserLikes(); // 讀取該使用者的收藏
        } else {
            // 未登入
            appState.user = null;
            appState.likedBookIds = [];
            loginBtn.classList.remove('hidden');
            userInfoEl.classList.add('hidden');
        }
        renderBooks(); // 狀態改變後重新渲染，為了更新愛心狀態
    });

    // B. 讀取書籍資料
    try {
        // 檢查伺服器有沒有傳資料過來
        if (window.initialBooksData) {
            console.log("正在使用 SSR 伺服器預先載入的資料...");
            appState.books = window.initialBooksData;
        } else {
            // 如果發生意外沒拿到資料，才當作備案去抓 (這段可留著當保險)
            console.log("SSR 資料遺失，改為前端抓取...");
            const querySnapshot = await getDocs(collection(db, "books"));
            const data = [];
            querySnapshot.forEach((doc) => {
                data.push({ id: doc.id, ...doc.data() });
            });
            appState.books = data;
        }

        loadingEl.classList.add('hidden');

        // 【關鍵步驟】
        // 雖然 HTML 已經有了，但我們需要執行一次 renderBooks
        // 這樣才能把「點擊事件 (Event Listeners)」綁定到那些卡片上
        // (這叫 "Hydration" 重新注水)
        renderBooks();
        renderRecommendations();
    } catch (error) {
        console.error("讀取書籍失敗:", error);
        loadingEl.innerText = "連線失敗，請檢查 Console。";
    }
}

// === 會員功能：登入與收藏 ===

// Google 登入
loginBtn.addEventListener('click', () => {
    signInWithPopup(auth, provider).catch((error) => console.error("登入失敗", error));
});

// 登出
logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => {
        alert("已登出");
        window.location.reload(); // 重新整理頁面以重置狀態
    });
});

// 讀取使用者收藏清單 (從 Firestore 的 users 集合)
async function loadUserLikes() {
    if (!appState.user) return;
    const userRef = doc(db, "users", appState.user.uid);
    try {
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            appState.likedBookIds = userSnap.data().likedBooks || [];
        } else {
            // 如果是新使用者，建立一個空文件
            await setDoc(userRef, { email: appState.user.email, likedBooks: [] });
        }
    } catch (e) {
        console.error("讀取收藏失敗", e);
    }
}

// 切換收藏狀態 (Toggle Like)
async function toggleLike(bookId, btnElement) {
    if (!appState.user) {
        alert("請先登入才能收藏書籍喔！(點擊右上角 Google 登入)");
        return;
    }

    const userRef = doc(db, "users", appState.user.uid);
    const isLiked = appState.likedBookIds.includes(bookId);

    try {
        // 樂觀更新 (先改畫面，再改資料庫，體驗比較快)
        if (isLiked) {
            appState.likedBookIds = appState.likedBookIds.filter(id => id !== bookId);
        } else {
            appState.likedBookIds.push(bookId);
        }
        updateLikeBtnStyle(btnElement, !isLiked);

        // 實際寫入資料庫
        if (isLiked) {
            await updateDoc(userRef, { likedBooks: arrayRemove(bookId) });
        } else {
            await updateDoc(userRef, { likedBooks: arrayUnion(bookId) });
        }
        
        // 如果目前正在看「我的收藏」分頁，要即時移除
        if (appState.filter === 'favorites') {
            renderBooks();
        }
    } catch (error) {
        console.error("收藏失敗:", error);
        alert("操作失敗，請檢查網路");
    }
}

function updateLikeBtnStyle(btn, isLiked) {
    if (isLiked) {
        btn.classList.add('liked');
        btn.innerHTML = btn.classList.contains('card-like-btn') ? '❤️' : '❤️ 已收藏';
    } else {
        btn.classList.remove('liked');
        btn.innerHTML = btn.classList.contains('card-like-btn') ? '🤍' : '🤍 加入收藏';
    }
}

// === 渲染邏輯 ===

function renderBooks() {
    let filtered = appState.books.filter(book => {
        // 類別篩選
        if (appState.filter === 'favorites') {
            return appState.likedBookIds.includes(book.id);
        }
        const matchCategory = appState.filter === 'all' || book.category === appState.filter;
        const keyword = appState.searchKeyword.toLowerCase();
        const title = (book.title || "").toLowerCase();
        const author = (book.author || "").toLowerCase();
        const matchSearch = title.includes(keyword) || author.includes(keyword);
        return matchCategory && matchSearch;
    });

    bookGrid.innerHTML = '';
    if (filtered.length === 0) {
        document.getElementById('empty-state').classList.remove('hidden');
    } else {
        document.getElementById('empty-state').classList.add('hidden');
        filtered.forEach(book => bookGrid.appendChild(createBookCard(book)));
    }
}

function createBookCard(book) {
    const card = document.createElement('article');
    card.className = 'book-card';
    
    // 預設圖片處理
    const imgSrc = (book.image && book.image.startsWith('http')) 
                   ? book.image 
                   : 'https://placehold.co/300x450/EEE/31343C?text=No+Cover';
    
    const isLiked = appState.likedBookIds.includes(book.id);
    const heartIcon = isLiked ? '❤️' : '🤍';
    const heartClass = isLiked ? 'card-like-btn liked' : 'card-like-btn';

    card.innerHTML = `
        <button class="${heartClass}" data-id="${book.id}">${heartIcon}</button>
        <img src="${imgSrc}" alt="${book.title}" class="book-image" loading="lazy">
        <div class="book-info">
            <span class="book-category">${book.category || '未分類'}</span>
            <h3 class="book-title">${book.title}</h3>
            <p class="book-author">作者：${book.author}</p>
            <div class="book-rating">★ ${book.rating}</div>
        </div>
    `;

    // 點擊愛心：切換收藏 (阻止冒泡以免觸發 Modal)
    card.querySelector('.card-like-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggleLike(book.id, e.target);
    });

    // 點擊卡片其他部分：開啟 Modal
    card.addEventListener('click', () => openModal(book));

    return card;
}

// === Modal 彈窗功能 ===
function openModal(book) {
    const modalImg = document.getElementById('modal-img');
    const likeBtn = document.getElementById('modal-like-btn');
    
    // 設定內容
    modalImg.src = (book.image && book.image.startsWith('http')) ? book.image : 'https://placehold.co/300x450/EEE/31343C?text=No+Cover';
    document.getElementById('modal-category').innerText = book.category;
    document.getElementById('modal-title').innerText = book.title;
    document.getElementById('modal-author').innerText = `作者：${book.author}`;
    document.getElementById('modal-rating').innerText = `★ ${book.rating}`;
    document.getElementById('modal-desc').innerText = book.description || '暫無簡介。';
    
    // Tags 處理
    const tagsHtml = (book.tags || []).map(t => `<span class="tag">#${t}</span>`).join('');
    document.getElementById('modal-tags').innerHTML = tagsHtml;

    // 設定 Modal 裡的愛心狀態
    const isLiked = appState.likedBookIds.includes(book.id);
    updateLikeBtnStyle(likeBtn, isLiked);
    
    // 清除舊監聽並綁定新的 (防止重複綁定)
    likeBtn.onclick = () => toggleLike(book.id, likeBtn);

    // 顯示
    modal.classList.add('show');
}

// 關閉 Modal
closeModalBtn.addEventListener('click', () => modal.classList.remove('show'));
modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('show');
});

// === 推薦區塊 (隨機 3 本高分書) ===
function renderRecommendations() {
    const container = document.getElementById('recommendation-container');
    const highRated = appState.books.filter(b => b.rating >= 4.5);
    
    // 如果書太少，就全部顯示
    const results = highRated.length > 3 
                    ? highRated.sort(() => 0.5 - Math.random()).slice(0, 3) 
                    : highRated;
                    
    container.innerHTML = '';
    results.forEach(book => container.appendChild(createBookCard(book)));
}

// === 其他事件監聽 ===
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        appState.searchKeyword = e.target.value.trim();
        renderBooks();
    }, 300);
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        
        if (e.target.id === 'show-favorites-btn') {
            appState.filter = 'favorites';
        } else {
            appState.filter = e.target.dataset.category;
        }
        renderBooks();
    });
});

// === 工具：批次匯入書籍資料 (解決你書太少的問題) ===
document.getElementById('admin-upload-btn').addEventListener('click', async () => {
    if(!confirm("確定要匯入預設書籍到資料庫嗎？(請勿重複點擊)")) return;
    
    const booksData = [
        {
            title: "原子習慣", author: "James Clear", category: "自我成長", rating: 4.8,
            tags: ["心理學", "習慣", "生產力"],
            description: "每天進步1%，一年後你會進步37倍。細微改變帶來巨大成就的實證法則。",
            image: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&q=80"
        },
        {
            title: "JavaScript 大全", author: "David Flanagan", category: "科技", rating: 4.5,
            tags: ["程式設計", "前端", "Web"],
            description: "被譽為 JavaScript 聖經，涵蓋 ES6+ 最新標準，前端工程師必備案頭書。",
            image: "https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?w=400&q=80"
        },
        {
            title: "設計的心理學", author: "Don Norman", category: "設計", rating: 4.7,
            tags: ["UX", "心理學", "產品設計"],
            description: "從日常用品到高科技產品，揭開良好設計背後的心理學原理。",
            image: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=400&q=80"
        },
        {
            title: "Clean Code", author: "Robert C. Martin", category: "科技", rating: 4.9,
            tags: ["程式設計", "軟體工程", "品質"],
            description: "無瑕的程式碼：敏捷軟體開發技巧守則，讓你的程式碼可讀性更高。",
            image: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400&q=80"
        },
        {
            title: "被討厭的勇氣", author: "岸見一郎", category: "自我成長", rating: 4.6,
            tags: ["阿德勒", "心理學", "哲學"],
            description: "自我啟發之父阿德勒的哲學課，讓你有勇氣面對真實的自己。",
            image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&q=80"
        },
        {
            title: "解憂雜貨店", author: "東野圭吾", category: "文學", rating: 4.8,
            tags: ["小說", "懸疑", "溫馨"],
            description: "一間能解決煩惱的雜貨店，跨越時空的信件交流，串起溫暖人心的故事。",
            image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=400&q=80"
        },
        {
            title: "黑客與畫家", author: "Paul Graham", category: "科技", rating: 4.6,
            tags: ["創業", "駭客", "隨筆"],
            description: "矽谷創業教父 Paul Graham 的經典文集，探討程式設計、創業與財富。",
            image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=400&q=80"
        },
         {
            title: "人類大歷史", author: "Yuval Noah Harari", category: "文學", rating: 4.9,
            tags: ["歷史", "人類學", "科普"],
            description: "從認知革命到科學革命，重新審視人類這個物種的過去與未來。",
            image: "https://images.unsplash.com/photo-1463320726281-696a485928c7?w=400&q=80"
        }
    ];

    try {
        console.log("開始匯入...");
        for (const book of booksData) {
            await addDoc(collection(db, "books"), book);
        }
        alert("🎉 成功匯入 8 本書籍！頁面將自動重新整理。");
        window.location.reload();
    } catch (e) {
        console.error("匯入失敗", e);
        alert("匯入失敗，請檢查 Console");
    }
});

// 啟動程式
init();