# ReadWise | 線上書籍推薦系統

![Version](https://img.shields.io/badge/version-2.0-blue)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 📖 專案概述
本專案是一個基於動態網頁技術開發的線上書籍推薦平台。旨在整合前端 DOM 操作、Firebase 雲端資料庫以及 Google 身份驗證技術，提供使用者一個美觀、易用且具備個人化功能的讀書社群介面。

## 🚀 核心功能
* **雲端資料同步**：整合 Firebase Firestore，實現書籍資料的即時讀取與動態更新。
* **Google 身份驗證**：支援 Google 帳號一鍵登入，提供安全的個人化體驗。
* **個人化收藏系統**：登入使用者可收藏心儀書籍，收藏清單會同步儲存於雲端資料庫。
* **智慧推薦演算法**：
    * **高分推薦**：首頁自動篩選並隨機呈現評分 ≥ 4.5 的精選書籍。
    * **關聯推薦**：查看書籍詳情時，系統會自動推播「同分類」的相關書籍。
* **互動式 UI 設計**：
    * **動態搜尋與篩選**：支援關鍵字即時搜尋與分類標籤切換。
    * **詳情彈窗 (Modal)**：無需切換頁面即可查看書籍完整簡介與評分。
    * **Toast 通知系統**：提供非阻塞式的使用者操作回饋（如收藏成功、登入成功）。

## 🛠 使用技術
* **前端**：HTML5, CSS3 (Flexbox/Grid), JavaScript (ES6 Modules)
* **後端/資料庫**：Firebase Firestore
* **身分驗證**：Firebase Auth (Google Provider)
* **設計工具**：Google Fonts, Unsplash API (Images)

## ⚙️ 安裝與運行
1. 克隆此專案至本地環境。
2. 確保環境支援 ESM (建議使用 VS Code 插件 **Live Server** 開啟)。
3. 在 `script.js` 中配置您的 `firebaseConfig`。
4. 訪問 `http://127.0.0.1:5500/index.html` 即可開始使用。