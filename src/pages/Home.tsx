import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f7f7",
        color: "#111",
      }}
    >
      {/* ヘッダー */}
      <header
        style={{
          background: "#fff",
          borderBottom: "1px solid #eee",
          padding: "18px 25px",
        }}
      >
        <div
          style={{
            maxWidth: "1100px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div
            style={{
              fontSize: "22px",
              fontWeight: 700,
              letterSpacing: "1px",
            }}
          >
            GINZA HIDEAWAYS
          </div>

          <Link
            to="/admin"
            style={{
              textDecoration: "none",
              color: "#666",
              fontSize: "13px",
            }}
          >
            管理画面
          </Link>
        </div>
      </header>

      {/* メインビジュアル */}
      <section
        style={{
          minHeight: "520px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "60px 20px",
          background:
            "linear-gradient(135deg, #ffffff 0%, #eeeeee 100%)",
        }}
      >
        <div
          style={{
            maxWidth: "800px",
          }}
        >
          <p
            style={{
              margin: "0 0 15px",
              fontSize: "12px",
              letterSpacing: "5px",
              color: "#777",
            }}
          >
            GINZA HIDEAWAYS
          </p>

          <h1
            style={{
              margin: "0 0 20px",
              fontSize: "clamp(36px, 7vw, 64px)",
              lineHeight: 1.15,
              fontWeight: 700,
            }}
          >
            心と身体を癒す
            <br />
            特別な時間
          </h1>

          <p
            style={{
              margin: "0 auto 35px",
              maxWidth: "600px",
              color: "#666",
              lineHeight: 1.8,
              fontSize: "15px",
            }}
          >
            厳選されたセラピストによる
            <br />
            上質なリラクゼーションをご提供します。
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <Link
              to="/therapists"
              style={{
                display: "inline-block",
                padding: "15px 32px",
                background: "#111",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "7px",
                fontWeight: 700,
              }}
            >
              セラピストを見る
            </Link>

            <Link
              to="/therapists"
              style={{
                display: "inline-block",
                padding: "15px 32px",
                background: "#fff",
                color: "#111",
                textDecoration: "none",
                border: "1px solid #ddd",
                borderRadius: "7px",
                fontWeight: 700,
              }}
            >
              予約する
            </Link>
          </div>
        </div>
      </section>

      {/* サービス */}
      <section
        style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "70px 20px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              letterSpacing: "4px",
              color: "#888",
            }}
          >
            SERVICE
          </p>

          <h2
            style={{
              margin: 0,
              fontSize: "30px",
            }}
          >
            ご利用案内
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
          }}
        >
          <FeatureCard
            number="01"
            title="セラピストを選ぶ"
            text="プロフィールや写真を確認して、お気に入りのセラピストをお選びいただけます。"
          />

          <FeatureCard
            number="02"
            title="コースを選ぶ"
            text="ご希望のコース・時間を選択して予約できます。"
          />

          <FeatureCard
            number="03"
            title="簡単予約"
            text="空いている日時を確認して、スムーズに予約できます。"
          />
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          background: "#111",
          color: "#fff",
          textAlign: "center",
          padding: "70px 20px",
        }}
      >
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "12px",
            letterSpacing: "4px",
            color: "#aaa",
          }}
        >
          RESERVATION
        </p>

        <h2
          style={{
            margin: "0 0 25px",
            fontSize: "30px",
          }}
        >
          ご予約はこちら
        </h2>

        <Link
          to="/therapists"
          style={{
            display: "inline-block",
            padding: "15px 40px",
            background: "#fff",
            color: "#111",
            textDecoration: "none",
            borderRadius: "7px",
            fontWeight: 700,
          }}
        >
          セラピスト一覧を見る
        </Link>
      </section>

      {/* フッター */}
      <footer
        style={{
          background: "#0a0a0a",
          color: "#888",
          textAlign: "center",
          padding: "25px 20px",
          fontSize: "12px",
        }}
      >
        © 2026 GINZA HIDEAWAYS
      </footer>
    </main>
  );
}

function FeatureCard({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid #eee",
        borderRadius: "12px",
        padding: "30px 25px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          letterSpacing: "2px",
          color: "#999",
          marginBottom: "15px",
        }}
      >
        {number}
      </div>

      <h3
        style={{
          margin: "0 0 12px",
          fontSize: "20px",
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color: "#666",
          lineHeight: 1.8,
          fontSize: "14px",
        }}
      >
        {text}
      </p>
    </div>
  );
}