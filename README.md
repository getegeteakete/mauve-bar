# mauve — a quiet bar

ひとりの夜に寄り添う、大人のバー「mauve」のランディングページ。
店主のGPS位置情報で「営業中」ランプが灯る仕組み + 営業日カレンダー付き。

PWA対応で、スマホのホーム画面に追加すればアプリのように使えます。

---

## できること

- **営業中ランプ**：店主が現在地を確認すると、お店から半径150m以内なら自動でランプが点灯。お客様全員の画面に同期されます
- **営業日カレンダー**：定休日・特別営業日を編集可能
- **PWA**：ホーム画面に追加して、スタンドアローンアプリとして起動可能
- **店主専用パネル**：暗証番号でロックされた管理画面で、座標・営業時間・連絡先などを編集

---

## デプロイ手順（はじめての方向け）

### ① GitHubにアップロード

1. [GitHub](https://github.com/) でアカウント作成（無料）
2. 右上の「+」→「New repository」
3. リポジトリ名：`mauve-bar`（任意）
4. **Privateで構わない**（中身を公開したくない場合）
5. 「Create repository」を押すと、ファイルアップロード方法が表示されます
6. **「uploading an existing file」をクリック**して、このフォルダの中身を全部ドラッグ&ドロップ
7. 「Commit changes」で確定

> パソコンがある場合は `git clone` → `git push` でも可。スマホだけならGitHubのWebUIで十分です。

### ② Vercelにデプロイ

1. [Vercel](https://vercel.com/) にGitHubアカウントでログイン（無料）
2. ダッシュボードの「Add New… → Project」
3. さっき作ったリポジトリを選んで「Import」
4. **環境変数を一つだけ追加**：
   - 名前: `BAR_PIN`
   - 値: 好きな4桁の暗証番号（例 `0317`）
5. 「Deploy」を押すと自動でビルド&公開
6. `https://〇〇〇.vercel.app` というURLが発行される

### ③ Upstash Redis を接続（営業ランプの同期に必要）

これをやらないと、店主の端末でランプを点けても他のお客様の画面に反映されません。

1. Vercelのプロジェクト画面 → 上部メニュー「Storage」
2. 「Create Database」または「Browse Marketplace」
3. **Upstash → Redis** を選択
4. プラン: **Free**（無料枠で十分）
5. リージョンは **Tokyo (ap-northeast-1)** がおすすめ
6. 作成すると、自動で環境変数（`KV_REST_API_URL` と `KV_REST_API_TOKEN`）がプロジェクトに注入されます
7. **Deployments タブから最新のデプロイメントを Redeploy**（環境変数を反映するため）

これで完成です。

### ④ 独自ドメイン（任意）

- Vercel プロジェクト → Settings → Domains で取得済みドメインを接続可能
- 例: `mauve317.com` など

---

## 初回セットアップ

公開されたURLを開いたら：

1. ページ最下部の「**staff**」ボタンをタップ
2. 暗証番号（手順②-4で設定したもの）を入力
3. **店内で**「今いる場所をお店として登録」をタップして座標を保存
4. 住所・電話・営業時間・チャージなどを入力
5. カレンダーで定休日・特別営業日を編集

以降、店主が出勤したら：

- ホーム画面のアプリを開く
- 「**現在地で出勤判定**」をタップ
- 半径150m以内なら自動で点灯。お客様全員の画面に反映されます

---

## ホーム画面に追加する方法

### iPhone (Safari)

1. 公開されたURLをSafariで開く
2. 下部の共有ボタン（□↑）をタップ
3. 「**ホーム画面に追加**」を選択
4. 「追加」で完了

### Android (Chrome)

1. 公開されたURLをChromeで開く
2. 右上のメニュー（︙）→「**ホーム画面に追加**」
3. 「追加」で完了

ホーム画面のアイコンから起動すると、ブラウザのアドレスバーが消えてアプリのように使えます。

---

## ローカルで動かす（開発者向け）

```bash
npm install
cp .env.example .env.local
# .env.local に BAR_PIN を設定
npm run dev
# http://localhost:3000
```

Redis未設定時はメモリ内ストレージで動作します（再起動でリセット）。

---

## ファイル構成

```
mauve-bar/
├── app/
│   ├── api/state/route.ts   # ステータス取得・更新API
│   ├── globals.css          # グローバルCSS（フォント、アニメーション）
│   ├── layout.tsx           # ルートレイアウト + PWAメタ
│   ├── manifest.ts          # PWAマニフェスト
│   └── page.tsx
├── components/
│   └── BarLanding.tsx       # メインのランディングページ
├── lib/
│   ├── redis.ts             # Upstash Redisクライアント
│   └── types.ts
├── public/
│   ├── icon-192.png
│   ├── icon-512.png
│   └── apple-touch-icon.png
├── .env.example
├── next.config.js
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## カスタマイズしたい場合

- **色味**：`tailwind.config.ts` と `app/globals.css` でカラーパレットを編集
- **メニュー文言**：`components/BarLanding.tsx` の `MENU` セクション内の配列
- **コンセプトテキスト**：同ファイルの `CONCEPT` セクション
- **デフォルト定休日**：`lib/types.ts` の `defaultClosed: [0, 1]`（0=日, 1=月）

---

## 注意

- 暗証番号 `BAR_PIN` は **Vercel ダッシュボードの環境変数**で管理されます。変更したい場合はそちらで編集 → Redeploy
- 位置情報の取得には HTTPS が必須（Vercelは自動でHTTPSなので問題なし）
- 店主が「現在地で出勤判定」を押した瞬間に状態が更新されます。お客様の画面は最大30秒で同期されます

---

© MAUVE · ALL NIGHTS RESERVED
