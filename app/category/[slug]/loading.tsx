export default function CategoryLoading() {
  return (
    <>
      <div className="page-header">
        <div className="skeleton skeleton--line" style={{ width: "6rem" }} />
        <div className="skeleton skeleton--line" style={{ width: "18rem", height: "2.2rem" }} />
        <div className="skeleton skeleton--line" style={{ width: "28rem" }} />
      </div>
      <ul className="grid">
        {[0, 1, 2, 3].map((key) => (
          <li key={key} className="skeleton skeleton--card" />
        ))}
      </ul>
    </>
  );
}
